from tempfile import TemporaryDirectory
from unittest.mock import patch

from cloudinary.exceptions import AuthorizationRequired, Error as CloudinaryError
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Company


class CompanyDocumentUploadTests(APITestCase):
    def setUp(self):
        media = TemporaryDirectory()
        self.addCleanup(media.cleanup)
        storage = override_settings(
            MEDIA_ROOT=media.name,
            STORAGES={"default": {"BACKEND": "django.core.files.storage.FileSystemStorage"}},
        )
        storage.enable()
        self.addCleanup(storage.disable)
        user = get_user_model().objects.create_user(
            email="document-test@example.com", password="test-only", role="company",
            email_verified=True,
        )
        self.company = Company.objects.create(user=user, company_name="Document test")
        self.client.force_authenticate(user)
        self.url = "/api/accounts/profile/company/"

    def upload(self, filename="registration.jpg", content_type="image/jpeg", content=b"test document"):
        return self.client.patch(self.url, {
            "registration_document": SimpleUploadedFile(filename, content, content_type),
        }, format="multipart")

    def test_storage_auth_failure_returns_safe_json_and_allows_retry(self):
        # A real provider message may expose the rejected API key.
        provider_message = "Invalid api_key synthetic-private-value"
        with patch.object(default_storage, "save", side_effect=AuthorizationRequired(provider_message)):
            with self.assertLogs("accounts.views", level="ERROR") as logs:
                response = self.upload()
        self.assertEqual(response.status_code, 503)
        self.assertFalse(response.data["success"])
        self.assertIn("application/json", response["Content-Type"])
        self.assertNotIn(provider_message, response.content.decode())
        self.assertNotIn("synthetic-private-value", " ".join(logs.output))
        self.company.refresh_from_db()
        self.assertFalse(self.company.registration_document)
        self.assertFalse(self.company.is_verified)

        retry = self.upload()
        self.assertEqual(retry.status_code, 200)
        self.assertTrue(retry.data["data"]["profile_sections"]["verification"])
        self.company.refresh_from_db()
        self.assertTrue(default_storage.exists(self.company.registration_document.name))
        self.assertFalse(self.company.is_verified)

    def test_failed_replacement_preserves_saved_document_and_profile(self):
        self.assertEqual(self.upload().status_code, 200)
        self.company.refresh_from_db()
        original = self.company.registration_document.name
        with patch.object(default_storage, "save", side_effect=CloudinaryError("Provider unavailable")):
            with self.assertLogs("accounts.views", level="ERROR"):
                response = self.client.patch(self.url, {
                    "company_name": "Unsaved name",
                    "registration_document": SimpleUploadedFile("new.pdf", b"test", "application/pdf"),
                }, format="multipart")
        self.assertEqual(response.status_code, 503)
        self.company.refresh_from_db()
        self.assertEqual(self.company.registration_document.name, original)
        self.assertTrue(default_storage.exists(original))
        self.assertEqual(self.company.company_name, "Document test")

    def test_supported_document_types_can_be_saved_without_admin_verification(self):
        for extension, mime in [("pdf", "application/pdf"), ("jpg", "image/jpeg"), ("png", "image/png")]:
            with self.subTest(extension=extension):
                response = self.upload(f"registration.{extension}", mime)
                self.assertEqual(response.status_code, 200)
                self.assertFalse(response.data["data"]["is_verified"])

    def test_invalid_type_and_oversized_document_never_reach_storage(self):
        with patch.object(default_storage, "save") as save:
            self.assertEqual(self.upload("registration.txt", "text/plain").status_code, 400)
            self.assertEqual(self.upload(content=b"x" * (5 * 1024 * 1024 + 1)).status_code, 400)
        save.assert_not_called()

    def test_document_above_memory_threshold_and_within_size_limit_can_be_saved(self):
        # Django spools files above its default 2.5 MB threshold to disk.
        content = b"x" * (3 * 1024 * 1024)
        response = self.upload("registration.pdf", "application/pdf", content)
        self.assertEqual(response.status_code, 200)
        self.company.refresh_from_db()
        self.assertEqual(self.company.registration_document.size, len(content))
