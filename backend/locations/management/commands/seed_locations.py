# backend/locations/management/commands/seed_locations.py

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from locations.models import City


class Command(BaseCommand):
    help = "Seed cities for Kosova (XK) and Shqipëri (AL)"


    def handle(self, *args, **options):

        countries = {
            "XK": {
                "label": "Kosova",
                "cities": [
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
            },
            "AL": {
                "label": "Shqipëri",
                "cities": [
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
            },
        }

        total_created = 0

        for country_code, data in countries.items():
            created = 0

            for city_name in data["cities"]:
                slug = slugify(f"{city_name}-{country_code}")

                _, was_created = City.objects.get_or_create(
                    name=city_name,
                    country=country_code,
                    defaults={
                        "slug": slug,
                        "is_active": True,
                    },
                )


                if was_created:
                    created += 1
                    total_created += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ {created} städer tillagda för {data['label']} ({country_code})"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 Klar! Totalt {total_created} nya städer tillagda."
            )
        )