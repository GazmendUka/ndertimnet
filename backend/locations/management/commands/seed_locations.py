# backend/locatinos/namagement/commands/seed_locations.py

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from locations.models import City

CITIES = {
    "XK": [
        "Deçani",
        "Dragashi",
        "Drenasi",
        "Ferizaj",
        "Fushë Kosova",
        "Gjakova",
        "Gjilan",
        "Graçanica",
        "Hani i Elezit",
        "Istog",
        "Junik",
        "Kaçanik",
        "Kamenica",
        "Klina",
        "Kllokot",
        "Leposaviq",
        "Malishev",
        "Mamushës",
        "Mitrovica",
        "Novo Brdo",
        "Obiliq",
        "Parteshi",
        "Peja",
        "Prishtinë",
        "Prizren",
        "Podujevë",
        "Rahovec",
        "Ranillug",
        "Shtime",
        "Skenderaj",
        "Shtërpcë",
        "Thërandë",
        "Viti",
        "Vushtrri",
        "Zubin Potok",
        "Zvečan",

    ],
    
    "AL": [
        "Berat",
        "Dibër",
        "Durrës",
        "Elbasan",
        "Fier",
        "Gjirokastër",
        "Korçë",
        "Kukës",
        "Lezhë",
        "Shkodër",
        "Tirana",
        "Vlorë",
    ],
}

class Command(BaseCommand):
    help = "Seed cities for Kosovo and Albania"

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for country, cities in CITIES.items():
            for name in cities:
                slug = slugify(f"{name}-{country}")

                obj, was_created = City.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "country": country,
                        "is_active": True,
                    },
                )

                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Cities seeded | created: {created}, updated: {updated}"
            )
        )
