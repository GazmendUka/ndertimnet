# accounts/services/profile_completeness.py

from rest_framework.exceptions import PermissionDenied


# ======================================================
# PROFILE STEP (ONBOARDING LOGIC)
# ======================================================

def get_company_profile_step(company) -> int:
    """
    Returnerar profilens onboarding-steg (0–4)
    """

    if not company:
        return 0

    user = getattr(company, "user", None)

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


# ======================================================
# PROFILE COMPLETION (UX LOGIC)
# ======================================================

def get_company_profile_completion(company) -> int:
    """
    Returnerar profilens fullständighet i procent (0–100)
    baserat på poängmodell.
    """

    if not company:
        return 0

    user = getattr(company, "user", None)

    sections = [
        bool(
            company.company_name
            and company.org_number
            and company.phone
            and company.address
            and user
            and user.email_verified
        ),
        company.professions.exists(),
        bool(company.city_id or company.cities.exists()),
        len((company.description or "").strip()) >= 20,
        len((company.default_offer_presentation or "").strip()) >= 10,
        bool(company.registration_document),
    ]
    return round((sum(sections) / len(sections)) * 100)


# ======================================================
# PERMISSION CHECK
# ======================================================

def require_company_step(company, min_step: int):
    """
    Stoppar request om företagsprofilen inte är tillräckligt komplett
    """
    current = get_company_profile_step(company)

    if current < min_step:
        raise PermissionDenied(
            f"Company profile incomplete (step {current}/{min_step})"
        )
