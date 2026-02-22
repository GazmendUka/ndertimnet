# backend/ndertimnet/settings.py

from pathlib import Path
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent


# ======================================================
# ENV HELPERS
# ======================================================
def env_bool(key: str, default: bool = False) -> bool:
    val = os.environ.get(key)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "y", "on")


def env_list(key: str, default=None, sep=","):
    if default is None:
        default = []
    val = os.environ.get(key)
    if not val:
        return default
    return [x.strip() for x in val.split(sep) if x.strip()]

# ======================================================
# CORE SECURITY
# ======================================================
# Environment: development | production
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").lower()

# Use env in production. Keep dev fallback for local runs.
SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "dev-secret-key-change-me"
)

DEBUG = env_bool("DEBUG", default=(ENVIRONMENT != "production"))




# ======================================================
# HOSTS / CSRF
# ======================================================
# In production you should NOT use ["*"].
# Set ALLOWED_HOSTS on Render to your service domain and later your custom domains.
default_hosts = ["localhost", "127.0.0.1"]
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", default=default_hosts)

# --- Render safety fallback ---
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    if RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)


# If you're behind Render, you'll want these security flags in production.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# CSRF trusted origins for HTTPS domains (especially if you ever use session auth/admin)
# Example value in Render:
# CSRF_TRUSTED_ORIGINS=https://your-backend.onrender.com,https://ndertimnet.com,https://www.ndertimnet.com
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", default=[])


# ======================================================
# INTERNATIONALIZATION
# ======================================================
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
    "rest_framework_simplejwt.token_blacklist",

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

    # Cron (note: Render doesn't run system cron by default)
    "django_crontab",
]


# ======================================================
# MIDDLEWARE
# ======================================================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Static files in production
    "whitenoise.middleware.WhiteNoiseMiddleware",

    # CORS must be high
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
# Render best practice: use DATABASE_URL
# Local dev can continue on sqlite if DATABASE_URL isn't provided.
DATABASE_URL = os.environ.get("DATABASE_URL", "")

if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=ENVIRONMENT == "production",
        )
    }
else:
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
# JWT CONFIG (Enterprise Mode)
# ======================================================
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),

    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,

    "UPDATE_LAST_LOGIN": True,

    "AUTH_HEADER_TYPES": ("Bearer",),
}


# ======================================================
# AUTHENTICATION BACKENDS (EMAIL LOGIN)
# ======================================================
AUTHENTICATION_BACKENDS = [
    "accounts.email_backend.EmailAuthBackend",
    "django.contrib.auth.backends.ModelBackend",
]


# ======================================================
# STATIC & MEDIA
# ======================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Whitenoise compression + cache
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


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

    # You can tighten this later; for now keep as is.
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
# In production, do NOT allow all origins.
# We'll keep dev permissive but lock prod to your frontend domains.
if ENVIRONMENT == "production":
    # Set in Render:
    # CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-URL.vercel.app,https://ndertimnet.com,https://www.ndertimnet.com
    CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", default=[])
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOWED_ORIGINS = env_list(
        "CORS_ALLOWED_ORIGINS",
        default=["http://localhost:3000"]
    )
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
# SECURITY HEADERS (production)
# ======================================================
if ENVIRONMENT == "production":
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True

    # Good baseline; can be tuned later
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "0"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
    SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", False)

    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"


# ======================================================
# CRON JOBS (NOTE)
# ======================================================
# django-crontab is not typically used on Render unless you run cron separately.
# Keep the definitions, but remove local Mac-specific prefixes/suffixes.
CRONJOBS = [
    ("0 2 * * *", "django.core.management.call_command", ["cleanup_expired_jobs"]),
    ("30 2 * * *", "django.core.management.call_command", ["check_reopen_jobs"]),
]
CRONTAB_COMMAND_PREFIX = os.environ.get("CRONTAB_COMMAND_PREFIX", "")
CRONTAB_COMMAND_SUFFIX = os.environ.get("CRONTAB_COMMAND_SUFFIX", "")


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
EMAIL_VERIFICATION_TOKEN_TTL_HOURS = int(os.environ.get("EMAIL_VERIFICATION_TOKEN_TTL_HOURS", "24"))

# Use env so prod points to your Vercel/custom domain, dev points to localhost
FRONTEND_VERIFY_EMAIL_URL = os.environ.get(
    "FRONTEND_VERIFY_EMAIL_URL",
    "http://localhost:3000/verify-email/{token}",
)


# ======================================================
# EMAIL (DEV default)
# ======================================================
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL",
    "no-reply@ndertimnet.com"
)
