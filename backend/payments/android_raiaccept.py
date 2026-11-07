"""Sandbox preparation only; this is not a production market-eligibility rule."""
from django.conf import settings
from rest_framework.exceptions import ValidationError

PROVIDER = "raiaccept_sandbox"


def environment_enabled():
    return (getattr(settings, "ANDROID_RAIACCEPT_TEST_ENVIRONMENT", False) is True
            and getattr(settings, "ANDROID_RAIACCEPT_SANDBOX_ENABLED", False) is True
            and settings.RAIACCEPT_MODE == "sandbox"
            and not settings.RAIACCEPT_PRODUCTION_USERNAME
            and not settings.RAIACCEPT_PRODUCTION_PASSWORD)


def enabled(company):
    return environment_enabled() and str(company.pk) in {
        str(pk) for pk in settings.ANDROID_RAIACCEPT_SANDBOX_COMPANY_IDS
    }


def require_access(company, data):
    if (data.get("platform") != "android"
            or data.get("checkout_provider") != PROVIDER or not enabled(company)):
        raise ValidationError({"detail": "Blerjet në aplikacion nuk janë aktivizuar ende.",
                               "code": "store_billing_required"})
