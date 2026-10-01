import logging

from django.conf import settings

from .models import NotificationDevice, NotificationPreference


logger = logging.getLogger(__name__)


def schedule_push_notification(*, user, category, title, body, data=None, event_key=None):
    """Persist in the business transaction; a worker delivers committed events."""
    if not user or not user.pk or not user.is_active:
        return
    preference = NotificationPreference.objects.filter(user=user).first()
    if preference and (not preference.push_enabled or not getattr(preference, category, False)):
        return
    from uuid import uuid4
    from .models import NotificationEvent
    return NotificationEvent.objects.get_or_create(
        key=f"{user.pk}:{event_key or uuid4().hex}",
        defaults=dict(user=user, category=category, title=title[:100], body=body[:180], data=data or {}),
    )


def send_push_notification(*, user, category, title, body, data=None, device_id=None, raise_on_failure=False):
    if not user.is_active:
        return 0
    if not settings.PUSH_NOTIFICATIONS_ENABLED or not settings.FIREBASE_PROJECT_ID:
        return 0

    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    if not preference.push_enabled or not getattr(preference, category, False):
        return 0

    queryset = NotificationDevice.objects.filter(user=user, active=True)
    if device_id is not None:
        queryset = queryset.filter(pk=device_id)
    devices = list(queryset.only("id", "token")[:500])
    if not devices:
        return 0

    try:
        import firebase_admin
        from firebase_admin import messaging

        try:
            app = firebase_admin.get_app()
        except ValueError:
            app = firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID, "httpTimeout": 10})

        safe_data = {
            str(key): str(value)
            for key, value in (data or {}).items()
            if value is not None
        }
        channel_id = "messages" if category == "chat_messages" else "updates"
        messages = [
            messaging.Message(
                notification=messaging.Notification(title=title[:100], body=body[:180]),
                data=safe_data,
                token=device.token,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(channel_id=channel_id),
                ),
                apns=messaging.APNSConfig(
                    headers={"apns-priority": "10"},
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default",
                            thread_id=safe_data.get("offer_id", channel_id),
                        )
                    ),
                ),
            )
            for device in devices
        ]
        result = messaging.send_each(messages, app=app)
    except Exception:
        if raise_on_failure:
            raise
        logger.warning("Push notification delivery failed")
        return 0

    stale_ids = []
    successful = 0
    transient_failure = False
    for device, response in zip(devices, result.responses):
        if response.success:
            successful += 1
            continue
        if isinstance(response.exception, (messaging.UnregisteredError, messaging.SenderIdMismatchError)):
            stale_ids.append(device.id)
        else:
            transient_failure = True

    if stale_ids:
        NotificationDevice.objects.filter(id__in=stale_ids).update(active=False)
    if transient_failure and raise_on_failure:
        raise RuntimeError("Push provider temporarily rejected delivery")
    return successful
