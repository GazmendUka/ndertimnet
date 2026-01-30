from rest_framework import permissions

class IsCompanyUser(permissions.BasePermission):
    """
    Tillåter endast användare som har en company_profile.
    """

    def has_permission(self, request, view):
        user = request.user
        # Måste vara inloggad och ha en företagsprofil
        return bool(user and user.is_authenticated and hasattr(user, "company_profile"))




