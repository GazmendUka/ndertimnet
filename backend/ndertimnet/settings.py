# backend/ndertimnet/settings.py

from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-insecure--t6=(e9ekfr2wtlrv@a2ax#snpw)c!db*w%65^n*%i4xjnpdjy"
DEBUG = True

ALLOWED_HOSTS = ["*"]
# ALLOWED_HOSTS = ["localhost", "127.0.0.1", "ndertimnet.com", ".ngrok-free.app"]


LANGUAGE_CODE = "sq"
TIME_ZONE = "Europe/Stockholm"
USE_I18N = True
USE_TZ = True


# ======================================================
# INSTALLED APPS
# ======================================================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third party
    "rest_framework",
    "django_filters",
    "corsheaders",

    # Project apps
    "leads",
    "main",
    "jobrequests",
    "payments",
    "offers",

    # Local apps
    "accounts.apps.AccountsConfig", 
    "locations",
    "taxonomy",

    # Cron
    "django_crontab",
]


# ======================================================
# MIDDLEWARE
# ======================================================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    # CORS måste komma här!
    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "ndertimnet.urls"


# ======================================================
# TEMPLATES
# ======================================================
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "ndertimnet.wsgi.application"


# ======================================================
# DATABASE
# ======================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# ======================================================
# AUTH VALIDATION + CUSTOM USER
# ======================================================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "accounts.User"


# ======================================================
# AUTHENTICATION BACKENDS (EMAIL LOGIN)
# ======================================================
AUTHENTICATION_BACKENDS = [
    "accounts.email_backend.EmailAuthBackend",   # vår email backend
    "django.contrib.auth.backends.ModelBackend",
]


# ======================================================
# STATIC & MEDIA
# ======================================================
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")


# ======================================================
# REST FRAMEWORK CONFIG
# ======================================================
REST_FRAMEWORK = {
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,

    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),

    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),

    "DEFAULT_RENDERER_CLASSES": (
    "rest_framework.renderers.JSONRenderer",
    ),
}


# ======================================================
# CORS
# ======================================================
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "authorization",
    "content-type",
    "accept",
    "origin",
    "user-agent",
    "x-csrftoken",
]


# ======================================================
# CRON JOBS
# ======================================================
CRONJOBS = [
    ("0 2 * * *", "django.core.management.call_command", ["cleanup_expired_jobs"]),
    ("30 2 * * *", "django.core.management.call_command", ["check_reopen_jobs"]),
]

CRONTAB_COMMAND_PREFIX = (
    '*/usr/bin/env bash -c "cd /Users/uka/ndertimnet/backend && source .venv/bin/activate && "'
)
CRONTAB_COMMAND_SUFFIX = (
    " >> /Users/uka/ndertimnet/backend/logs/cleanup.log 2>&1"
)


# ======================================================
# LOGGING
# ======================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

# ======================================================
# EMAIL VERIFICATION (Ndertimnet)
# ======================================================

# Hur länge verifieringslänken är giltig (i timmar)
EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24

# Frontend-länk som användaren klickar på i mailet
# {token} ersätts dynamiskt
# DEV
FRONTEND_VERIFY_EMAIL_URL = "http://localhost:3000/verify-email/{token}"

# PROD (senare)
# FRONTEND_VERIFY_EMAIL_URL = "https://ndertimnet.com/verify-email?token={token}"



# ======================================================
# EMAIL (DEV)
# ======================================================

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "Ndertimnet <no-reply@ndertimnet.com>"

# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST = "smtp.gmail.com"
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = "no-reply@ndertimnet.com"
# EMAIL_HOST_PASSWORD = "APP_PASSWORD"
# DEFAULT_FROM_EMAIL = "Ndertimnet <no-reply@ndertimnet.com>"


