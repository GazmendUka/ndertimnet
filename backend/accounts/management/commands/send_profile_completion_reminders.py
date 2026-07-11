from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.emails import send_profile_completion_reminder_email
from accounts.models import User


def customer_profile_is_complete(user):
    customer = getattr(user, "customer_profile", None)

    if not customer:
        return False

    return all([
        bool(user.first_name and user.first_name.strip()),
        bool(user.last_name and user.last_name.strip()),
        bool(customer.phone and customer.phone.strip()),
        bool(customer.address and customer.address.strip()),
        bool(customer.postal_code and customer.postal_code.strip()),
        bool(customer.city_id),
    ])


def company_profile_is_complete(user):
    company = getattr(user, "company_profile", None)

    if not company:
        return False

    return company.calculate_profile_step() >= 4


def user_profile_is_complete(user):
    if user.role == "company":
        return company_profile_is_complete(user)

    if user.role == "customer":
        return customer_profile_is_complete(user)

    return True


class Command(BaseCommand):
    help = "Send one-time email reminders to users with incomplete profiles"

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=12,
            help="Only remind users created at least this many hours ago.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=200,
            help="Maximum number of reminders to send.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List users that would receive a reminder without sending emails.",
        )

    def handle(self, *args, **options):
        cutoff = timezone.now() - timezone.timedelta(hours=options["hours"])
        limit = options["limit"]
        dry_run = options["dry_run"]

        users = (
            User.objects
            .filter(
                is_active=True,
                date_joined__lte=cutoff,
                profile_completion_reminder_sent_at__isnull=True,
            )
            .exclude(role="admin")
            .select_related("customer_profile", "company_profile")
            .order_by("date_joined")[:limit]
        )

        sent = 0
        skipped = 0
        failed = 0

        for user in users:
            if user_profile_is_complete(user):
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(f"Would remind: {user.email} ({user.role})")
                sent += 1
                continue

            try:
                send_profile_completion_reminder_email(user)
                user.profile_completion_reminder_sent_at = timezone.now()
                user.save(update_fields=["profile_completion_reminder_sent_at"])
                sent += 1
                self.stdout.write(self.style.SUCCESS(
                    f"Reminder sent: {user.email}"
                ))
            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(
                    f"Reminder failed for {user.email}: {exc}"
                ))

        self.stdout.write(
            f"Done. Sent: {sent}. Skipped complete: {skipped}. Failed: {failed}."
        )
