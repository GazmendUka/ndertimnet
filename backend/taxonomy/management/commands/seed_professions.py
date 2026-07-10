# backend/taxonomy/management/commands/seed_professions.py

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from taxonomy.models import Industry, Profession


TAXONOMY = [
    {
        "name": "Ndërtim dhe renovim",
        "slug": "ndertim-dhe-renovim",
        "professions": [
            "Nuk e di",
            "Ndërtim i përgjithshëm",
            "Renovim banjo",
            "Renovim kuzhine",
            "Elektricist",
            "Hidraulik",
            "Lyerje",
            "Fasada dhe izolim",
            "Punime çatie",
            "Dysheme",
            "Dyer dhe dritare",
            "Punime të brendshme",
        ],
    },
    {
        "name": "Pastrim dhe mirëmbajtje",
        "slug": "pastrim-dhe-mirembajtje",
        "professions": [
            "Pastrim shtëpie",
            "Pastrim pas shpërnguljes",
            "Pastrim pas ndërtimit",
            "Pastrim zyre",
            "Pastrim shkallësh",
            "Larje dritaresh",
            "Pastrim i thellë",
            "Larje qilimash dhe mobiliesh",
        ],
    },
    {
        "name": "Shpërngulje dhe transport",
        "slug": "shperngulje-dhe-transport",
        "professions": [
            "Ndihmë për shpërngulje",
            "Bartje",
            "Transport mobiliesh",
            "Magazinim",
            "Paketim",
            "Montim dhe çmontim",
            "Largim mbeturinash",
            "Mbeturina ndërtimi",
        ],
    },
    {
        "name": "Kopsht dhe ambient i jashtëm",
        "slug": "kopsht-dhe-ambient-i-jashtem",
        "professions": [
            "Kositje bari",
            "Krasitje",
            "Prerje gardhi",
            "Dizajn kopshti",
            "Gardhe",
            "Shtrim guri",
            "Verandë dhe terasë",
            "Pastrimi i borës",
        ],
    },
    {
        "name": "Siguri dhe bravari",
        "slug": "siguri-dhe-bravari",
        "professions": [
            "Ndërrim dryni",
            "Hapje dryni",
            "Alarm",
            "Kamera sigurie",
            "Sistem hyrjeje",
            "Mbrojtje nga zjarri",
            "Dyer sigurie",
            "Zgjidhje smart home",
        ],
    },
    {
        "name": "Shërbime prone dhe mirëmbajtje",
        "slug": "sherbime-prone-dhe-mirembajtje",
        "professions": [
            "Mirëmbajtje prone",
            "Riparime të thjeshta",
            "Instalim pajisjesh shtëpiake",
            "Servis ventilimi",
            "Pompë nxehtësie",
            "Dezinsektim",
            "Lagështi dhe myk",
            "Shërbim emergjent",
        ],
    },
]


class Command(BaseCommand):
    help = "Seed industries and professions for Ndertimnet"

    def handle(self, *args, **options):
        industries_created = 0
        industries_updated = 0
        professions_created = 0
        professions_updated = 0

        for industry_order, industry_data in enumerate(TAXONOMY, start=1):
            industry, was_created = Industry.objects.update_or_create(
                slug=industry_data["slug"],
                defaults={
                    "name": industry_data["name"],
                    "is_active": True,
                    "sort_order": industry_order,
                },
            )

            if was_created:
                industries_created += 1
            else:
                industries_updated += 1

            for profession_order, name in enumerate(industry_data["professions"], start=1):
                profession, was_created = Profession.objects.update_or_create(
                    slug=slugify(name),
                    defaults={
                        "industry": industry,
                        "name": name,
                        "is_active": True,
                        "sort_order": profession_order,
                    },
                )

                if was_created:
                    professions_created += 1
                else:
                    professions_updated += 1

        default_industry = Industry.objects.get(slug="ndertim-dhe-renovim")
        remapped = Profession.objects.filter(industry__isnull=True).update(
            industry=default_industry
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Taxonomy seeded | "
                f"industries created: {industries_created}, updated: {industries_updated}; "
                f"professions created: {professions_created}, updated: {professions_updated}; "
                f"legacy remapped: {remapped}"
            )
        )
