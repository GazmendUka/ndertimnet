from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.utils import timezone
from rest_framework.test import APITestCase

from .admin import CompanyAdmin
from .models import Company


class CompanyProfileStatusSecurityTests(APITestCase):
    """Company self-service must never grant administrator-controlled status."""

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="profile-security@example.com",
            password="test-password",
            role="company",
            email_verified=True,
        )
        self.company = Company.objects.create(
            user=self.user, company_name="Security Test Company"
        )
        self.client.force_authenticate(self.user)
        self.url = "/api/accounts/profile/company/"

    def test_patch_and_put_cannot_self_verify_but_allow_profile_edits(self):
        for method in ("patch", "put"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(
                    self.url,
                    {"is_verified": True, "company_name": f"Updated by {method}"},
                    format="multipart",
                )
                self.assertEqual(response.status_code, 200)
                self.company.refresh_from_db()
                self.assertFalse(self.company.is_verified)
                self.assertIsNone(self.company.verified_at)
                self.assertFalse(response.data["data"]["is_verified"])
                self.assertEqual(self.company.company_name, f"Updated by {method}")

    def test_owner_cannot_change_admin_verification_or_timestamp(self):
        verified_at = timezone.now()
        self.company.is_verified = True
        self.company.verified_at = verified_at
        self.company.save(update_fields=["is_verified", "verified_at"])

        response = self.client.patch(
            self.url,
            {"is_verified": False, "verified_at": "2000-01-01T00:00:00Z"},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.company.refresh_from_db()
        self.assertTrue(self.company.is_verified)
        self.assertEqual(self.company.verified_at, verified_at)

    def test_profile_cannot_change_admin_active_status(self):
        for initial_status in (True, False):
            with self.subTest(initial_status=initial_status):
                self.company.is_active = initial_status
                self.company.save(update_fields=["is_active"])
                response = self.client.patch(
                    self.url, {"is_active": not initial_status}, format="multipart"
                )
                self.assertEqual(response.status_code, 200)
                self.company.refresh_from_db()
                self.assertEqual(self.company.is_active, initial_status)

    def test_staff_account_cannot_bypass_status_protection_in_profile_api(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        response = self.client.patch(
            self.url, {"is_verified": True}, format="multipart"
        )
        self.assertEqual(response.status_code, 200)
        self.company.refresh_from_db()
        self.assertFalse(self.company.is_verified)

    def test_get_reports_status_approved_by_admin(self):
        self.company.is_verified = True
        self.company.verified_at = timezone.now()
        self.company.save(update_fields=["is_verified", "verified_at"])
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["data"]["is_verified"])

    def test_admin_save_still_verifies_and_revokes(self):
        request = RequestFactory().post("/admin/accounts/company/")
        request.user = get_user_model().objects.create_superuser(
            email="verification-admin@example.com", password="test-password"
        )
        model_admin = CompanyAdmin(Company, admin.site)
        self.assertTrue(model_admin.has_change_permission(request, self.company))

        self.company.is_verified = True
        model_admin.save_model(request, self.company, form=None, change=True)
        self.company.refresh_from_db()
        self.assertTrue(self.company.is_verified)
        self.assertIsNotNone(self.company.verified_at)

        self.company.is_verified = False
        model_admin.save_model(request, self.company, form=None, change=True)
        self.company.refresh_from_db()
        self.assertFalse(self.company.is_verified)
        self.assertIsNone(self.company.verified_at)
