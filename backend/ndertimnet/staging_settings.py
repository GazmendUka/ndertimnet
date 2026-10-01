"""Isolated Render staging. Never use production credentials or customer data."""
import os
from urllib.parse import urlsplit
from django.core.exceptions import ImproperlyConfigured
from .settings import *  # noqa: F403

if ENVIRONMENT != "production" or DEBUG:  # noqa: F405
    raise ImproperlyConfigured("Staging requires production security settings and DEBUG=false.")
database_url = urlsplit(os.environ.get("DATABASE_URL", ""))
expected_host = os.environ.get("STAGING_DATABASE_HOST", "")
if (not expected_host or database_url.hostname != expected_host
        or database_url.path != "/ndertimnet_staging"):
    raise ImproperlyConfigured("Staging requires its explicitly designated staging database.")

# Fail closed if someone accidentally copies production secrets into staging.
for variable in ("SENDGRID_API_KEY", "CLOUDINARY_URL", "GOOGLE_APPLICATION_CREDENTIALS",
                 "RAIACCEPT_SANDBOX_USERNAME", "RAIACCEPT_SANDBOX_PASSWORD",
                 "RAIACCEPT_PRODUCTION_USERNAME", "RAIACCEPT_PRODUCTION_PASSWORD",
                 "RAIACCEPT_MERCHANT_ACCOUNT_ID"):
    if os.environ.get(variable):
        raise ImproperlyConfigured("External delivery/storage/payment credentials are not permitted in staging yet.")

EMAIL_BACKEND = "django.core.mail.backends.dummy.EmailBackend"
CONTACT_EMAIL_BACKEND = "core.staging.BlockedEmailBackend"
PUSH_NOTIFICATIONS_ENABLED = False
FIREBASE_PROJECT_ID = ""
BILLING_JOBS_ENABLED = False
RAIACCEPT_MODE = "sandbox"
STORAGES = {**STORAGES, "default": {"BACKEND": "core.staging.BlockedMediaStorage"}}  # noqa: F405
ALLOWED_HOSTS = [os.environ.get("RENDER_EXTERNAL_HOSTNAME", "localhost")]
CORS_ALLOWED_ORIGINS = [os.environ["FRONTEND_BASE_URL"]]
CORS_ALLOW_ALL_ORIGINS = False
CSRF_TRUSTED_ORIGINS = [os.environ["FRONTEND_BASE_URL"], os.environ["BACKEND_BASE_URL"]]
MIDDLEWARE = ["core.staging.NoIndexMiddleware", *MIDDLEWARE]  # noqa: F405
