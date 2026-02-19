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

    total_points = 7
    points = 0

    # 1️⃣ Email verifierad
    if user and user.email_verified:
        points += 1

    # 2️⃣ Organisationsnummer
    if company.org_number:
        points += 1

    # 3️⃣ Företagsnamn
    if company.company_name:
        points += 1

    # 4️⃣ Adress
    if company.address:
        points += 1

    # 5️⃣ Telefon
    if company.phone:
        points += 1

    # 6️⃣ Stad
    if company.city or company.cities.exists():
        points += 1

    # 7️⃣ Yrken
    if company.professions.exists():
        points += 1

    percentage = int((points / total_points) * 100)

    return percentage


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
