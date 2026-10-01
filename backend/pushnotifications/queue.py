"""Durable at-least-once delivery. Provider acceptance is not device receipt."""
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import NotificationEvent, NotificationDelivery, NotificationDevice, NotificationPreference
from .services import send_push_notification


def process_one():
    if not settings.PUSH_NOTIFICATIONS_ENABLED or not settings.FIREBASE_PROJECT_ID:
        return False
    with transaction.atomic():
        event = (NotificationEvent.objects.select_for_update(skip_locked=True)
                 .filter(finished_at__isnull=True, next_attempt_at__lte=timezone.now())
                 .order_by("next_attempt_at", "pk").first())
        if not event:
            return False
        user = event.user
        pref, _ = NotificationPreference.objects.get_or_create(user=user)
        if not user.is_active or not pref.push_enabled or not getattr(pref, event.category, False):
            event.deliveries.filter(status="pending").update(status="cancelled")
            event.finished_at = timezone.now()
        elif event.created_at < timezone.now() - timedelta(days=7):
            event.deliveries.filter(status="pending").update(status="failed")
            event.finished_at = timezone.now()
        else:
            if not event.expanded:
                NotificationDelivery.objects.bulk_create([
                    NotificationDelivery(event=event, device=device)
                    for device in NotificationDevice.objects.filter(user=user, active=True)
                ])
                event.expanded = True
            # One device per transaction: keep locks and network time bounded.
            delivery = event.deliveries.filter(status="pending").order_by("pk").first()
            if delivery:
                delivery.attempts += 1
                if not delivery.device_id:
                    delivery.status = "cancelled"
                else:
                    try:
                        sent = send_push_notification(user=user, category=event.category,
                            title=event.title, body=event.body, data={**event.data, "notification_id": event.pk},
                            device_id=delivery.device_id, raise_on_failure=True)
                        delivery.status = "sent" if sent else "cancelled"
                    except Exception:
                        delivery.status = "failed" if delivery.attempts >= 8 else "pending"
                        event.next_attempt_at = timezone.now() + timedelta(seconds=min(3600, 30 * 2 ** delivery.attempts))
                delivery.save(update_fields=["attempts", "status"])
            if not event.deliveries.filter(status="pending").exists():
                event.finished_at = timezone.now()
        event.save(update_fields=["expanded", "finished_at", "next_attempt_at"])
    return True
