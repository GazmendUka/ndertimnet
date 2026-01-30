# accounts/services/profile_completeness.py

from rest_framework.exceptions import PermissionDenied


def get_company_profile_step(company) -> int:
    """
    Returnerar profilens steg (0–4) baserat på CompanyProfile-specen
    """

    if not company:
        return 0

    user = getattr(company, "user", None)

    # STEP 0 – konto finns
    step = 0

    # STEP 1 – Grundinfo
    if not company.company_name:
        return step

    if not user or not user.email_verified:
        return step

    step = 1

    # STEP 2 – Kontaktinfo
    if not company.phone:
        return step

    if not company.website:
        return step

    step = 2

    # STEP 3 – Profilinnehåll
    if not company.description:
        return step

    if not company.professions.exists():
        return step

    if not company.cities.exists():
        return step

    step = 3

    # STEP 4 – Full profil
    return 4



def require_company_step(company, min_step: int):
    """
    Stoppar request om företagsprofilen inte är tillräckligt komplett
    """
    current = get_company_profile_step(company)

    if current < min_step:
        raise PermissionDenied(
            f"Company profile incomplete (step {current}/{min_step})"
        )
