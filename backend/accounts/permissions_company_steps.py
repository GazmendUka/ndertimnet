from rest_framework.permissions import BasePermission
from accounts.services.profile_completeness import require_company_step


class IsCompanyStepAtLeast(BasePermission):
    """
    DRF-permission som kräver att inloggad användare är ett företag
    och att company.profile_step >= min_step.
    """

    message = "Company profile incomplete."
    min_step = 2  # default

    def has_permission(self, request, view):
        user = request.user

        # 1️⃣ Måste vara inloggad
        if not user or not user.is_authenticated:
            return False

        # 2️⃣ Måste vara company-roll
        if getattr(user, "role", None) != "company":
            return False

        # 3️⃣ RÄTT attribut i ert system
        company = getattr(user, "company_profile", None)
        if not company:
            return False

        # 4️⃣ Hård kontroll av profile_step
        #    Kastar PermissionDenied (403) med tydligt meddelande
        require_company_step(company, min_step=self.min_step)

        return True


class IsCompanyStep2(IsCompanyStepAtLeast):
    min_step = 2
