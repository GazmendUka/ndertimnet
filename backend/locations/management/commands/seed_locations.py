# backend/locations/management/commands/seed_locations.py

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from locations.models import City


class Command(BaseCommand):
    help = "Seed ALL official municipalities for Kosovo (XK) and Albania (AL)"

    def handle(self, *args, **options):

        # 🔥 1. Rensa gamla städer
        City.objects.all().delete()
        self.stdout.write(self.style.WARNING("⚠️ Alla befintliga städer raderade"))

        countries = {

            # 🇽🇰 KOSOVO — 38 kommuner
            "XK": [
                "Deçan", "Dragash", "Drenas", "Ferizaj", "Fushë Kosovë",
                "Gjakovë", "Gjilan", "Graçanicë", "Hani i Elezit",
                "Istog", "Junik", "Kaçanik", "Kamenicë", "Klinë",
                "Kllokot", "Leposaviq", "Lipjan", "Malishevë",
                "Mamushë", "Mitrovicë e Jugut", "Mitrovicë e Veriut",
                "Novobërdë", "Obiliq", "Partesh", "Pejë",
                "Prishtinë", "Prizren", "Podujevë", "Rahovec",
                "Ranillug", "Shtime", "Skenderaj", "Shtërpcë",
                "Suharekë", "Viti", "Vushtrri", "Zubin Potok", "Zveçan",
            ],

            # 🇦🇱 ALBANIA — 61 bashki
            "AL": [
                "Berat", "Belsh", "Bulqizë", "Cërrik", "Delvinë",
                "Devoll", "Dibër", "Divjakë", "Durrës", "Elbasan",
                "Fier", "Finiq", "Gjirokastër", "Gramsh", "Has",
                "Himarë", "Kamëz", "Kavajë", "Këlcyrë", "Klos",
                "Kolonjë", "Konispol", "Korçë", "Krujë", "Kuçovë",
                "Kukës", "Kurbin", "Lezhë", "Libohovë", "Librazhd",
                "Lushnjë", "Malësi e Madhe", "Mallakastër", "Mat",
                "Memaliaj", "Mirditë", "Patos", "Peqin", "Përmet",
                "Pogradec", "Poliçan", "Prrenjas", "Pukë", "Roskovec",
                "Rrogozhinë", "Sarandë", "Selenicë", "Shijak",
                "Shkodër", "Skrapar", "Tepelenë", "Tiranë",
                "Tropojë", "Ura Vajgurore", "Vau i Dejës",
                "Vlorë", "Vorë",
            ],
        }

        total_created = 0

        # 🔥 2. Seed data
        for country_code, cities in countries.items():

            created = 0

            for city_name in cities:
                slug = slugify(f"{city_name}-{country_code}")

                City.objects.create(
                    name=city_name,
                    country=country_code,
                    slug=slug,
                    is_active=True,
                )

                created += 1
                total_created += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ {created} städer tillagda för {country_code}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 KLART — Totalt {total_created} städer skapade"
            )
        )