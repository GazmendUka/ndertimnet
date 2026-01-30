#backend/accounts/commands/recalc_profile_steps.py

from django.core.management.base import BaseCommand
from accounts.models import Company


class Command(BaseCommand):
    help = "Recalculate profile_step for all companies"

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            "🔄 Recalculating company profile steps...\n"
        ))

        companies = Company.objects.all()
        updated = 0

        for company in companies:
            old = company.profile_step
            new = company.calculate_profile_step()

            if old != new:
                company.profile_step = new
                company.save(update_fields=["profile_step"])
                updated += 1

                self.stdout.write(
                    f"✔ {company.company_name}: {old} → {new}"
                )

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Done. Updated {updated} companies."
        ))
