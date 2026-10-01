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
for variable in ("SENDGRID_API_KEY", "CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME",
                 "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUD_NAME",
                 "GOOGLE_APPLICATION_CREDENTIALS",
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
# Opt in only after the deployment operator verifies this cloud is separate from
# production. Ordinary provider variables remain forbidden, even when enabled.
media_enabled = os.environ.get("STAGING_MEDIA_ENABLED", "false") == "true"
media_keys = ("STAGING_CLOUDINARY_CLOUD_NAME", "STAGING_CLOUDINARY_API_KEY",
              "STAGING_CLOUDINARY_API_SECRET", "STAGING_EXPECTED_CLOUD_NAME")
media_values = [os.environ.get(key, "") for key in media_keys]
if media_enabled:
    if not all(media_values) or media_values[0] != media_values[3]:
        raise ImproperlyConfigured("Staging media requires complete, matching test-cloud configuration.")
    CLOUDINARY_STORAGE = dict(zip(("CLOUD_NAME", "API_KEY", "API_SECRET"), media_values[:3]))
    CLOUDINARY_STORAGE.update(SECURE=True, MEDIA_TAG="ndertimnet-staging", PREFIX="staging-media")
    STORAGES = {**STORAGES, "default": {"BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"}}
elif any(media_values):
    raise ImproperlyConfigured("Staging media credentials require explicit opt-in.")
ALLOWED_HOSTS = [os.environ.get("RENDER_EXTERNAL_HOSTNAME", "localhost")]
CORS_ALLOWED_ORIGINS = [os.environ["FRONTEND_BASE_URL"]]
CORS_ALLOW_ALL_ORIGINS = False
CSRF_TRUSTED_ORIGINS = [os.environ["FRONTEND_BASE_URL"], os.environ["BACKEND_BASE_URL"]]
MIDDLEWARE = ["core.staging.NoIndexMiddleware", *MIDDLEWARE]  # noqa: F405
