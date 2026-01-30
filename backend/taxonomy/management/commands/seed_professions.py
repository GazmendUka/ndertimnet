#backend/taxonomy/management/commands/seed_professions.py

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from taxonomy.models import Profession

PROFESSIONS = [
    # El / VVS / Teknik
    "Elektricist",
    "Hidraulik",
    "Instalues i ngrohjes",
    "Instalues i ventilimit",
    "Teknik HVAC",

    # Trä / Snickeri
    "Zdrukthëtar",
    "Marangoz",
    "Punues druri",
    "Punues alumini",

    # Mur / Gips
    "Murator",
    "Suvatues",
    "Punues gipsi",
    "Plakist",

    # Golv / Kakel
    "Shtrues pllakash",
    "Shtrues dyshemeje",
    "Parketist",

    # Måleri
    "Piktor",
    "Dekorues",

    # Tak
    "Punime çatie",
    "Mbulesa çatie",
    "Izolim çatie",

    # Isolering / Fasad
    "Izolim termik",
    "Izolim hidro",
    "Montues fasade",
    "Fasadist",

    # Fönster / Dörrar
    "Montues dritaresh dhe dyersh",

    # Betong / Stål / Mark
    "Punime betoni",
    "Punime hekuri",
    "Armaturist",
    "Gërmime",
    "Punime toke",

    # Entreprenad / Renovering
    "Ndërtim i përgjithshëm",
    "Kompani ndërtimi",
    "Ndërmarrje ndërtimi",
    "Renovim banese",
    "Renovim total",
    "Rikonstruksion",

    # Projektering / Kontroll
    "Arkitekt",
    "Inxhinier ndërtimi",
    "Projektues",
    "Mbikëqyrje ndërtimi",
]


class Command(BaseCommand):
    help = "Seed professions"

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
                f"✅ Professions seeded | created: {created}, updated: {updated}"
            )
        )
