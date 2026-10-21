from datetime import timedelta
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
from PIL import Image
from django.contrib import admin
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, override_settings
from tempfile import TemporaryDirectory
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User, Company
from .models import HeroAdvertisement
from .admin import HeroAdvertisementAdmin


def picture(width=1200, height=600, fmt="PNG"):
    output = BytesIO()
    Image.new("RGB", (width, height), "orange").save(output, format=fmt)
    return SimpleUploadedFile("campaign.png", output.getvalue(), content_type="image/png")


class MarketingTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.media = TemporaryDirectory(prefix="ndertimnet-campaign-media-")
        cls.storage_settings = override_settings(MEDIA_ROOT=cls.media.name, STORAGES={
            "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
            "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}})
        cls.storage_settings.enable()
        super().setUpClass()
        cls.addClassCleanup(cls.media.cleanup)
        cls.addClassCleanup(cls.storage_settings.disable)

    def setUp(self):
        cache.clear()
        self.owner = User.objects.create_user("campaign-owner@example.com", "test-password", role="company", email_verified=True)
        self.company = Company.objects.create(user=self.owner, company_name="Test Campaign Company")
        self.other = User.objects.create_user("other-company@example.com", "test-password", role="company", email_verified=True)
        self.other_company = Company.objects.create(user=self.other, company_name="Other Test Company")
        self.staff = User.objects.create_superuser("campaign-admin@example.com", "test-password")
        self.client.force_authenticate(self.owner)

    def submit(self, **changes):
        return self.client.post("/api/marketing/campaigns/", {
            "title": "Fushata e provës", "description": "Përshkrim i gjatë për fushatën e provës.",
            "destination_url": "https://example.com/campaign", "cta_text": "Zbulo më shumë",
            "duration_days": 7, "image": picture(), **changes,
        }, format="multipart")

    def create_campaign(self, **changes):
        return HeroAdvertisement.objects.create(company=self.company,
            title="Fushatë e provës", subtitle="Përshkrim i fushatës për provë", background_image="test/campaign.png",
            external_url="https://example.com/campaign", link_type="external", review_status="pending", **changes)

    def approve(self, campaign, decision="approved", **changes):
        for key, value in changes.items():
            setattr(campaign, key, value)
        campaign.review_status = decision
        request = RequestFactory().post("/admin/")
        request.user = self.staff
        HeroAdvertisementAdmin(HeroAdvertisement, admin.site).save_model(
            request, campaign, SimpleNamespace(changed_data=["review_status"]), True)
        campaign.refresh_from_db()

    def test_submission_is_real_and_cannot_self_approve_or_spoof_owner(self):
        result = self.submit(company=self.other_company.pk, review_status="approved", is_active=True,
                             starts_at=timezone.now().isoformat())
        self.assertEqual(result.status_code, 201, result.data)
        campaign = HeroAdvertisement.objects.get(pk=result.data["id"])
        self.assertEqual(campaign.company, self.company)
        self.assertEqual(campaign.review_status, "pending")
        self.assertFalse(campaign.is_active)
        self.assertIsNone(campaign.starts_at)
        self.assertTrue(campaign.background_image.storage.exists(campaign.background_image.name))
        self.assertEqual(self.client.get("/api/marketing/campaigns/").data["count"], 1)
        self.assertIsNone(self.client.get("/api/reklama/hero/").data)
        self.assertEqual(self.client.get(f"/api/reklama/{campaign.slug}/").status_code, 404)

    def test_private_list_withdraw_and_no_company_edit_bypass(self):
        campaign = self.create_campaign()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/marketing/campaigns/").data["count"], 0)
        self.assertEqual(self.client.post(f"/api/marketing/campaigns/{campaign.pk}/withdraw/").status_code, 404)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.patch("/api/marketing/campaigns/", {"is_active": True}).status_code, 405)
        self.assertEqual(self.client.post(f"/api/marketing/campaigns/{campaign.pk}/withdraw/").status_code, 200)
        campaign.refresh_from_db()
        self.assertEqual(campaign.review_status, "withdrawn")

    def test_unverified_customer_inactive_and_anonymous_are_denied(self):
        customer = User.objects.create_user("campaign-customer@example.com", "test-password", role="customer", email_verified=True)
        for user in [None, customer]:
            self.client.force_authenticate(user)
            self.assertIn(self.client.get("/api/marketing/campaigns/").status_code, [401, 403])
        self.owner.email_verified = False
        self.owner.save()
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get("/api/marketing/campaigns/").status_code, 403)
        self.owner.email_verified = True
        self.owner.save()
        self.company.is_active = False
        self.company.save()
        self.assertEqual(self.client.get("/api/marketing/campaigns/").status_code, 403)

    def test_admin_approval_publishes_shared_hero_and_preserves_dates_on_resave(self):
        campaign = self.create_campaign()
        self.approve(campaign)
        self.assertTrue(campaign.is_active)
        self.assertEqual(campaign.reviewed_by, self.staff)
        self.assertEqual(campaign.ends_at - campaign.starts_at, timedelta(days=7))
        starts, ends = campaign.starts_at, campaign.ends_at
        self.approve(campaign)
        self.assertEqual((campaign.starts_at, campaign.ends_at), (starts, ends))
        for url in ["/api/reklama/hero/", "/api/advertisements/hero/", f"/api/reklama/{campaign.slug}/"]:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["id"], campaign.pk)
            self.assertEqual(response.data["company_name"], self.company.company_name)
            self.assertNotIn("review_note", response.data)
        self.client.post(f"/api/marketing/campaigns/{campaign.pk}/withdraw/")
        self.assertIsNone(self.client.get("/api/reklama/hero/").data)
        self.assertEqual(self.client.get(f"/api/reklama/{campaign.slug}/").status_code, 404)

    def test_schedule_expiry_pause_rejection_and_account_deactivation_hide_every_public_route(self):
        now = timezone.now()
        campaign = self.create_campaign()
        cases = [
            {"review_status": "approved", "is_active": True, "starts_at": now + timedelta(days=1), "ends_at": now + timedelta(days=8)},
            {"review_status": "approved", "is_active": True, "starts_at": now - timedelta(days=8), "ends_at": now - timedelta(seconds=1)},
            {"review_status": "paused", "is_active": True},
            {"review_status": "rejected", "is_active": True},
            {"review_status": "pending", "is_active": True},
        ]
        for values in cases:
            HeroAdvertisement.objects.filter(pk=campaign.pk).update(**values)
            self.assertIsNone(self.client.get("/api/reklama/hero/").data)
            self.assertEqual(self.client.get(f"/api/reklama/{campaign.slug}/").status_code, 404)
        self.approve(campaign, starts_at=now, ends_at=now+timedelta(days=7))
        self.company.is_active = False
        self.company.save()
        self.assertIsNone(self.client.get("/api/reklama/hero/").data)
        self.company.is_active = True
        self.company.save()
        self.owner.is_active = False
        self.owner.save()
        self.assertIsNone(self.client.get("/api/reklama/hero/").data)

    def test_invalid_images_protocols_periods_and_text_never_create_campaigns(self):
        for changes in [
            {"image": picture(100,100)}, {"image": picture(fmt="GIF")},
            {"image": SimpleUploadedFile("fake.png", b"not an image", content_type="image/png")},
            {"destination_url": "javascript:alert(1)"}, {"destination_url": "ftp://example.com/file"},
            {"duration_days": 99}, {"title": "Hi"}, {"description": "short"},
            {"cta_text": "x"*41}, {"description": "x"*261},
        ]:
            with self.subTest(fields=list(changes)):
                cache.clear()
                self.assertEqual(self.submit(**changes).status_code, 400)
        self.assertFalse(HeroAdvertisement.objects.exists())

    def test_storage_error_does_not_claim_success_or_leak_secrets(self):
        from cloudinary.exceptions import Error
        with patch("django.core.files.storage.filesystem.FileSystemStorage._save", side_effect=Error("SECRET provider failure")):
            response = self.submit()
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("SECRET", str(response.data))
        self.assertFalse(HeroAdvertisement.objects.exists())

    def test_legacy_admin_ads_still_work_and_priority_is_respected(self):
        legacy = HeroAdvertisement.objects.create(title="Legacy campaign", background_image="test/legacy.png", is_active=True)
        self.assertEqual(self.client.get("/api/reklama/hero/").data["id"], legacy.pk)
        campaign = self.create_campaign(display_order=1)
        self.approve(campaign)
        self.assertEqual(self.client.get("/api/reklama/hero/").data["id"], legacy.pk)

    def test_rejection_requires_a_reason_and_owner_sees_it(self):
        campaign = self.create_campaign()
        campaign.review_status = "rejected"
        with self.assertRaises(ValidationError):
            campaign.full_clean()
        self.approve(campaign, "rejected", review_note="Ju lutemi ndryshoni imazhin.")
        response = self.client.get("/api/marketing/campaigns/")
        self.assertEqual(response.data["results"][0]["rejection_reason"], campaign.review_note)

    def test_actual_admin_form_approves_and_checks_permissions(self):
        campaign = self.create_campaign()
        self.client.force_login(self.staff)
        url = f"/admin/main/heroadvertisement/{campaign.pk}/change/"
        response = self.client.post(url, {
            "company": self.company.pk, "title": campaign.title, "subtitle": campaign.subtitle,
            "slug": campaign.slug, "external_url": campaign.external_url, "link_type": "external",
            "review_status": "approved", "review_note": "", "duration_days": 7,
            "cta_text": "Zbulo më shumë", "display_order": 0,
            "starts_at_0": "", "starts_at_1": "", "ends_at_0": "", "ends_at_1": "",
            "sections-TOTAL_FORMS": 0, "sections-INITIAL_FORMS": 0,
            "sections-MIN_NUM_FORMS": 0, "sections-MAX_NUM_FORMS": 5, "_save": "Save",
        })
        self.assertEqual(response.status_code, 302, getattr(response, "context", None))
        campaign.refresh_from_db()
        self.assertEqual(campaign.review_status, "approved")
        self.assertTrue(campaign.is_active)
        self.client.force_login(self.owner)
        self.assertNotEqual(self.client.get(url).status_code, 200)

    def test_campaign_images_follow_account_erasure_and_publication_stops_immediately(self):
        from accounts.services.deletion import request_deletion, process_deletion
        response = self.submit()
        campaign = HeroAdvertisement.objects.get(pk=response.data["id"])
        image = campaign.background_image
        self.approve(campaign)
        request = request_deletion(self.owner)
        self.assertIsNone(self.client.get("/api/reklama/hero/").data)
        process_deletion(request.pk)
        request.refresh_from_db()
        self.assertEqual(request.status, "completed")
        self.assertFalse(HeroAdvertisement.objects.filter(pk=campaign.pk).exists())
        self.assertFalse(image.storage.exists(image.name))

    def test_list_is_paginated_and_upload_size_limit_applies(self):
        for index in range(13):
            self.create_campaign(slug=f"list-test-{index}")
        self.assertEqual(len(self.client.get("/api/marketing/campaigns/").data["results"]), 12)
        self.assertEqual(len(self.client.get("/api/marketing/campaigns/?page=2").data["results"]), 1)
        oversized = SimpleUploadedFile("large.png", b"x"*(5*1024*1024+1), content_type="image/png")
        self.assertEqual(self.submit(image=oversized).status_code, 400)
