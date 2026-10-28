import json
import logging
from collections import defaultdict
from threading import Lock

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

from .models import NotificationDevice, NotificationPreference


logger = logging.getLogger(__name__)
_firebase_app_lock = Lock()


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


def _firebase_app(project_id):
    with _firebase_app_lock:
        return _initialize_firebase_app(project_id)


def _initialize_firebase_app(project_id):
    import firebase_admin
    from firebase_admin import credentials

    name = f"ndertimnet-push-{project_id}"
    try:
        return firebase_admin.get_app(name)
    except ValueError:
        pass

    if project_id == settings.FIREBASE_PROJECT_ID:
        if settings.FIREBASE_CREDENTIALS_JSON:
            config = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            if config.get("type") != "service_account" or config.get("project_id") != project_id:
                raise ImproperlyConfigured("Push credential project does not match configuration.")
            credential = credentials.Certificate(config)
        elif settings.FIREBASE_LEGACY_PROJECT_ID:
            raise ImproperlyConfigured("Credentials for the new push project are required.")
        else:
            credential = credentials.ApplicationDefault()
    elif project_id == settings.FIREBASE_LEGACY_PROJECT_ID:
        credential = credentials.ApplicationDefault()
    else:
        raise ImproperlyConfigured("Unknown push project.")
    return firebase_admin.initialize_app(credential, options={"projectId": project_id}, name=name)


def send_push_notification(*, user, category, title, body, data=None):
    if not settings.PUSH_NOTIFICATIONS_ENABLED or not settings.FIREBASE_PROJECT_ID:
        return 0

    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    if not preference.push_enabled or not getattr(preference, category, False):
        return 0

    devices = list(
        NotificationDevice.objects.filter(user=user, active=True)
        .only("id", "token", "firebase_project_id")[:500]
    )
    if not devices:
        return 0

    try:
        from firebase_admin import messaging
    except ImportError:
        logger.warning("Push notification SDK is unavailable")
        return 0

    allowed = {settings.FIREBASE_PROJECT_ID, settings.FIREBASE_LEGACY_PROJECT_ID} - {""}
    original_project = settings.FIREBASE_LEGACY_PROJECT_ID or settings.FIREBASE_PROJECT_ID
    groups = defaultdict(list)
    for device in devices:
        project_id = device.firebase_project_id or original_project
        if project_id in allowed:
            groups[project_id].append(device)

    safe_data = {str(key): str(value) for key, value in (data or {}).items() if value is not None}
    channel_id = "messages" if category == "chat_messages" else "updates"
    stale_ids = []
    successful = 0
    for project_id, project_devices in groups.items():
        try:
            app = _firebase_app(project_id)
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
                        )
                    ),
                )
                for device in project_devices
            ]
            result = messaging.send_each(messages, app=app)
        except Exception:
            # Provider errors can contain tokens or credential details.
            logger.warning("Push delivery unavailable for configured project %s", project_id)
            continue

        for device, response in zip(project_devices, result.responses):
            if response.success:
                successful += 1
            elif isinstance(response.exception, messaging.UnregisteredError):
                stale_ids.append(device.id)
            # Keep sender mismatches active so routing corrections can restore delivery.

    if stale_ids:
        NotificationDevice.objects.filter(id__in=stale_ids).update(active=False)
    return successful
