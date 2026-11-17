"""Recover store delivery and check revocations without exposing purchase tokens."""
from datetime import timedelta
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from django.utils import timezone
from payments.models import StoreCheckout, PaymentStatus
from payments.store_billing import resolve
from payments.store_gateway import StoreError


class Command(BaseCommand):
    help = "Revalidate and finish up to 100 store purchases. Dry run unless --apply."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, **options):
        if not options["apply"]:
            self.stdout.write("Dry run: no store requests or quota changes.")
            return
        if not getattr(settings, "STORE_BILLING_ENABLED", False):
            raise CommandError("Store billing is disabled.")
        now = timezone.now()
        candidates = StoreCheckout.objects.select_related("charge").exclude(verification_reference="").filter(
            Q(status=PaymentStatus.PENDING, last_checked_at__lt=now - timedelta(minutes=5))
            | Q(status=PaymentStatus.PENDING, last_checked_at__isnull=True)
            | Q(status=PaymentStatus.PAID, platform="android", finished_at__isnull=True)
            | Q(status=PaymentStatus.PAID, last_checked_at__lt=now - timedelta(days=1))
        ).order_by("last_checked_at", "created_at")[:100]
        for checkout in candidates:
            try:
                resolve(checkout, checkout.verification_reference)
            except StoreError:
                # The code and secret-free ID suffice for operators; never print raw exceptions.
                self.stdout.write(f"Store checkout {checkout.pk}: deferred or revoked")
                StoreCheckout.objects.filter(pk=checkout.pk).update(last_checked_at=now)
            else:
                self.stdout.write(f"Store checkout {checkout.pk}: checked")
