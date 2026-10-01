"""Offline marketplace tests; inherits dedicated PostgreSQL database safeguards."""
from .test_billing_settings import *  # noqa: F403

ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
SECURE_SSL_REDIRECT = False
CONTACT_EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
FIREBASE_PROJECT_ID = ""
