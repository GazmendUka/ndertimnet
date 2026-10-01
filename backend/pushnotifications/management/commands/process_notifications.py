from datetime import timedelta
from time import monotonic
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from pushnotifications.models import NotificationEvent, NotificationDelivery
from pushnotifications.queue import process_one


class Command(BaseCommand):
    help = "Deliver queued push notifications; run every minute. No email delivery."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)

    def handle(self, *args, **options):
        count = 0
        started = monotonic()
        for _ in range(max(0, min(options["limit"], 1000))):
            if monotonic() - started > 50:
                break
            if not process_one():
                break
            count += 1
        # Use the same event -> deliveries lock order as the delivery worker.
        # Expiry must not race a send, including when several schedulers overlap.
        with transaction.atomic():
            expired = list(NotificationEvent.objects.select_for_update(skip_locked=True)
                .filter(finished_at__isnull=True, created_at__lt=timezone.now() - timedelta(days=7))
                .order_by("pk").values_list("pk", flat=True)[:1000])
            NotificationDelivery.objects.filter(event_id__in=expired, status="pending").update(status="failed")
            expired_count = NotificationEvent.objects.filter(pk__in=expired).update(finished_at=timezone.now())
        NotificationEvent.objects.filter(finished_at__lt=timezone.now() - timedelta(days=30)).delete()
        self.stdout.write(f"Processed: {count}; expired events: {expired_count}; failed deliveries: {NotificationDelivery.objects.filter(status='failed').count()}")
