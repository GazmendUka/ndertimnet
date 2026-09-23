"""Isolated local/CI tests. Never points at the application's DATABASE_URL."""
import os
from django.core.exceptions import ImproperlyConfigured
from .settings import *  # noqa: F403

TEST_DATABASE_URL = os.environ.get('BILLING_TEST_DATABASE_URL', '')
if not TEST_DATABASE_URL:
    raise ImproperlyConfigured('Set BILLING_TEST_DATABASE_URL to a dedicated PostgreSQL test database.')
import dj_database_url
DATABASES = {'default': dj_database_url.parse(TEST_DATABASE_URL, conn_max_age=0)}
if DATABASES['default']['ENGINE'] != 'django.db.backends.postgresql' or not DATABASES['default']['NAME'].startswith('ndertimnet_test'):
    raise ImproperlyConfigured('Billing test database must be PostgreSQL and named ndertimnet_test*.')
DATABASES['default']['OPTIONS'] = {'options': '-c lock_timeout=8000 -c statement_timeout=15000'}
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
RAIACCEPT_MODE = 'sandbox'
RAIACCEPT_SANDBOX_USERNAME = ''
RAIACCEPT_SANDBOX_PASSWORD = ''
RAIACCEPT_PRODUCTION_USERNAME = ''
RAIACCEPT_PRODUCTION_PASSWORD = ''
PUSH_NOTIFICATIONS_ENABLED = False
# Some legacy mail helpers read the provider key directly instead of Django's backend.
os.environ.pop('SENDGRID_API_KEY', None)
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
