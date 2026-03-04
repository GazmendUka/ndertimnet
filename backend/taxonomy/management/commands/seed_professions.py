#backend/taxonomy/management/commands/seed_professions.py

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from taxonomy.models import Profession


# NOTE:
# - Yrken är på albanska (produkt- och UX-beslut)
# - slug används som stabil identifierare (unique=True i modellen)
# - update_or_create gör command idempotent (safe i production)
# - Ändrar du ett namn här uppdateras det i databasen, inga dubbletter

PROFESSIONS = [
    "Nuk e di",
    "Ndërtim i përgjithshëm",
    "Elektricist",
    "Hidraulik",
    "Punime çatie",
    "Dyer dhe dritare",
    "Fasada dhe izolim",
    "Punime të brendshme",
]


class Command(BaseCommand):
    help = "Seed professions (profesionet) in Albanian for Ndertimnet"

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for name in PROFESSIONS:
            slug = slugify(name)

            obj, was_created = Profession.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "is_active": True,
                },
            )

            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Profesionet u seeduan | krijuar: {created}, përditësuar: {updated}"
            )
        )
