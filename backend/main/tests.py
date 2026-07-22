from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import HeroAdvertisement, HeroAdvertisementSection


@override_settings(
    STORAGES={
        "default": {
            "BACKEND": "django.core.files.storage.InMemoryStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
)
class HeroAdvertisementApiTests(APITestCase):
    def test_active_hero_advertisement_is_returned(self):
        advertisement = HeroAdvertisement.objects.create(
            title="Ofertë speciale",
            subtitle="Materiale për ndërtim",
            background_image="hero/test.jpg",
            is_active=True,
        )
        HeroAdvertisementSection.objects.create(
            advertisement=advertisement,
            title="Detaje",
            body="Teksti i reklamës",
        )

        hero_response = self.client.get("/api/reklama/hero/")
        detail_response = self.client.get(f"/api/reklama/{advertisement.slug}/")

        self.assertEqual(hero_response.status_code, 200)
        self.assertEqual(hero_response.data["title"], "Ofertë speciale")
        self.assertEqual(hero_response.data["target_url"], f"/reklama/{advertisement.slug}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(len(detail_response.data["sections"]), 1)

    def test_expired_hero_advertisement_is_not_returned(self):
        HeroAdvertisement.objects.create(
            title="Reklamë e vjetër",
            background_image="hero/old.jpg",
            is_active=True,
            ends_at=timezone.now() - timezone.timedelta(days=1),
        )

        response = self.client.get("/api/reklama/hero/")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)
