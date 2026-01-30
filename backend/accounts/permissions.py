#backend/accounts/permissions.py

from rest_framework.permissions import BasePermission

class IsCompanyProfileComplete(BasePermission):
    """
    Blockerar endast företag vars profil inte är klar (profile_step < 4).
    Customers/admin påverkas inte.
    """
    required_step = 4
    message = "Slutför din företagsprofil för att få åtkomst."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Endast företag ska spärras av denna permission
        if getattr(user, "role", None) != "company":
            return True

        company = getattr(user, "company_profile", None)
        if not company:
            return False

        step = getattr(company, "profile_step", 0) or 0
        return step >= self.required_step


class IsEmailVerified(BasePermission):
    message = "E-postadressen måste verifieras för att utföra denna åtgärd."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "email_verified", False)
        )

class IsCompanyProfileCompleteOnlyForCompanies(BasePermission):
    message = "Slutför din företagsprofil."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) != "company":
            return True

        company = getattr(user, "company_profile", None)
        return company and company.profile_step >= 4
