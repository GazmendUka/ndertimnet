import os
import subprocess
import sys
from unittest.mock import patch
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse
from django.db import DatabaseError
from django.core.exceptions import PermissionDenied
from core.health import health
from core.staging import BlockedMediaStorage, BlockedEmailBackend, NoIndexMiddleware


class StagingSafetyTests(SimpleTestCase):
    def test_noindex_header(self):
        response = NoIndexMiddleware(lambda request: HttpResponse("test"))(RequestFactory().get("/"))
        self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow, noarchive")

    def test_storage_is_blocked(self):
        storage = BlockedMediaStorage()
        for operation, args in ((storage.open, ("image.jpg",)), (storage.exists, ("image.jpg",)),
                                (storage.delete, ("image.jpg",)), (storage.url, ("image.jpg",))):
            with self.assertRaises(PermissionDenied):
                operation(*args)

    def test_contact_cannot_claim_delivery(self):
        with self.assertRaises(PermissionDenied):
            BlockedEmailBackend().send_messages([object()])

    def test_health_uses_database_and_no_cache(self):
        with patch("core.health.connection") as connection:
            response = health(RequestFactory().get("/health/"))
        connection.cursor.return_value.__enter__.return_value.execute.assert_called_once_with("SELECT 1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_health_does_not_expose_error(self):
        with patch("core.health.connection") as connection:
            connection.cursor.side_effect = DatabaseError("private connection details")
            response = health(RequestFactory().get("/health/"))
        self.assertEqual(response.status_code, 503)
        self.assertNotIn(b"private", response.content)

    def test_staging_configuration_guards(self):
        env = {"PATH": os.environ["PATH"], "PYTHONDONTWRITEBYTECODE": "1",
               "ENVIRONMENT": "production", "DEBUG": "false", "SECRET_KEY": "synthetic-test-key",
               "ALLOWED_HOSTS": "backend.invalid",
               "DATABASE_URL": "postgresql://test:test@staging.invalid/ndertimnet_staging",
               "STAGING_DATABASE_HOST": "staging.invalid",
               "FRONTEND_BASE_URL": "https://frontend.invalid", "BACKEND_BASE_URL": "https://backend.invalid"}
        code = "from ndertimnet import staging_settings as s; assert not s.DEBUG; assert not s.PUSH_NOTIFICATIONS_ENABLED; assert not s.CORS_ALLOW_ALL_ORIGINS"
        good = subprocess.run([sys.executable, "-c", code], env=env, capture_output=True)
        self.assertEqual(good.returncode, 0, good.stderr.decode())
        for change in ({"DATABASE_URL": "postgresql://test:test@production.invalid/prod"},
                       {"DEBUG": "true"}, {"CLOUDINARY_URL": "synthetic-blocked-value"},
                       {"SENDGRID_API_KEY": "synthetic-blocked-value"}):
            bad = subprocess.run([sys.executable, "-c", code], env={**env, **change}, capture_output=True)
            self.assertNotEqual(bad.returncode, 0)
