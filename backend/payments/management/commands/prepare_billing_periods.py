from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import Company
from payments.models import BillingSubscription
from payments.billing import ensure_periods


class Command(BaseCommand):
    help = "Create monthly subscription amounts due; never charge cards automatically. Run daily."

    def handle(self, *args, **options):
        count = 0
        for subscription in BillingSubscription.objects.filter(started_at__isnull=False).iterator():
            with transaction.atomic():
                Company.objects.select_for_update().get(pk=subscription.company_id)
                ensure_periods(subscription)
                count += 1
        self.stdout.write(f"Prepared periods for {count} subscriptions.")
