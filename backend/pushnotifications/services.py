import logging

from django.conf import settings
from django.db import transaction

from .models import NotificationDevice, NotificationPreference


logger = logging.getLogger(__name__)


def schedule_push_notification(*, user, category, title, body, data=None):
    """Queue delivery after the surrounding database transaction commits."""
    if not user or not user.pk:
        return
    transaction.on_commit(
        lambda: send_push_notification(
            user=user,
            category=category,
            title=title,
            body=body,
            data=data,
        )
    )


def send_push_notification(*, user, category, title, body, data=None):
    if not settings.PUSH_NOTIFICATIONS_ENABLED or not settings.FIREBASE_PROJECT_ID:
        return 0

    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    if not preference.push_enabled or not getattr(preference, category, False):
        return 0

    devices = list(
        NotificationDevice.objects.filter(user=user, active=True).only("id", "token")[:500]
    )
    if not devices:
        return 0

    try:
        import firebase_admin
        from firebase_admin import messaging

        try:
            app = firebase_admin.get_app()
        except ValueError:
            app = firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})

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
        logger.exception("Push notification delivery failed for user %s", user.pk)
        return 0

    stale_ids = []
    successful = 0
    for device, response in zip(devices, result.responses):
        if response.success:
            successful += 1
            continue
        if isinstance(response.exception, (messaging.UnregisteredError, messaging.SenderIdMismatchError)):
            stale_ids.append(device.id)

    if stale_ids:
        NotificationDevice.objects.filter(id__in=stale_ids).update(active=False)
    return successful
