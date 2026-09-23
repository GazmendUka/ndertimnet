from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models import PlatformCheckout
from payments.reconciliation import reconcile_checkout
from payments.credits import compensate_closed_jobs


class Command(BaseCommand):
    help = "Verify pending bank orders and credit paid unsent offers on closed jobs. Dry-run by default."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--limit", type=int, default=100)

    def handle(self, *args, **options):
        from django.db.models import F
        candidates = PlatformCheckout.objects.filter(status="pending", created_at__lte=timezone.now()-timedelta(minutes=2)).order_by(F("last_checked_at").asc(nulls_first=True), "created_at")[:max(1, options["limit"])]
        for pk in list(candidates.values_list("pk", flat=True)):
            result = reconcile_checkout(pk) if options["apply"] else "Would verify"
            self.stdout.write(f"Checkout {pk}: {result}")
        if options["apply"]:
            self.stdout.write(f"Credits issued: {compensate_closed_jobs()}")
