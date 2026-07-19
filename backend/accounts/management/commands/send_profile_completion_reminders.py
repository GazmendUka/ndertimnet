from django.core.management.base import BaseCommand
from django.db.models import Q
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
    help = "Dërgon email rikujtues për përdoruesit me profil të paplotësuar"

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=12,
            help="Dërgo rikujtim vetëm për përdoruesit e krijuar para kaq orësh.",
        )
        parser.add_argument(
            "--interval-days",
            type=int,
            default=3,
            help="Sa ditë duhet të kalojnë mes dy rikujtimeve.",
        )
        parser.add_argument(
            "--max-reminders",
            type=int,
            default=3,
            help="Numri maksimal i rikujtimeve për një përdorues.",
        )
        parser.add_argument(
            "--role",
            choices=["company", "customer"],
            default=None,
            help="Kufizo rikujtimet vetëm për një rol.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=200,
            help="Numri maksimal i rikujtimeve për këtë ekzekutim.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Shfaq përdoruesit pa dërguar email.",
        )

    def handle(self, *args, **options):
        cutoff = timezone.now() - timezone.timedelta(hours=options["hours"])
        reminder_cutoff = timezone.now() - timezone.timedelta(days=options["interval_days"])
        max_reminders = options["max_reminders"]
        limit = options["limit"]
        dry_run = options["dry_run"]
        role = options["role"]

        users = (
            User.objects
            .filter(
                is_active=True,
                date_joined__lte=cutoff,
                profile_completion_reminder_count__lt=max_reminders,
            )
            .filter(
                Q(profile_completion_reminder_sent_at__isnull=True)
                | Q(profile_completion_reminder_sent_at__lte=reminder_cutoff)
            )
            .exclude(role="admin")
            .select_related("customer_profile", "company_profile")
            .order_by("date_joined")
        )

        if role:
            users = users.filter(role=role)

        users = users[:limit]

        sent = 0
        skipped = 0
        failed = 0

        for user in users:
            if user_profile_is_complete(user):
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(
                    f"Do të rikujtohej: {user.email} ({user.role})"
                )
                sent += 1
                continue

            try:
                send_profile_completion_reminder_email(user)
                user.profile_completion_reminder_sent_at = timezone.now()
                user.profile_completion_reminder_count += 1
                user.save(update_fields=[
                    "profile_completion_reminder_sent_at",
                    "profile_completion_reminder_count",
                ])
                sent += 1
                self.stdout.write(self.style.SUCCESS(
                    f"Rikujtimi u dërgua: {user.email}"
                ))
            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(
                    f"Rikujtimi dështoi për {user.email}: {exc}"
                ))

        self.stdout.write(
            f"Përfundoi. Dërguar: {sent}. Të plota: {skipped}. Dështuan: {failed}."
        )
