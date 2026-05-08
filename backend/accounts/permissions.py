# backend/accounts/permissions.py

from rest_framework.permissions import BasePermission


# ======================================================
# EMAIL VERIFIED
# ======================================================

class IsEmailVerified(BasePermission):
    """
    Lejon vetëm përdoruesit me email të verifikuar.
    Admin/staff përjashtohen.
    """

    message = "Ju lutem verifikoni email-in për të vazhduar."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Admin/staff bypass
        if user.is_staff or user.is_superuser:
            return True

        return getattr(user, "email_verified", False)


# ======================================================
# COMPANY MARKETPLACE ACCESS
# ======================================================

class IsCompanyMarketplaceReady(BasePermission):
    """
    Blockerar endast företag som saknar required marketplace-fields.
    """

    message = "Plotëso profilin për të marrë qasje në marketplace."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Endast companies påverkas
        if getattr(user, "role", None) != "company":
            return True

        company = getattr(user, "company_profile", None)

        if not company:
            return False

        return company.can_access_marketplace()


# ======================================================
# COMPANY OFFER ACCESS
# ======================================================

class IsCompanyOfferReady(BasePermission):
    """
    Krävs för att skapa/skicka offerter.
    """

    message = "Plotëso profilin për të dërguar oferta."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) != "company":
            return True

        company = getattr(user, "company_profile", None)

        if not company:
            return False

        return company.can_send_offers()


# ======================================================
# COMPANY LEAD ACCESS
# ======================================================

class IsCompanyLeadReady(BasePermission):
    """
    Krävs för lead unlocks.
    """

    message = "Plotëso profilin për të zhbllokuar klientë."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) != "company":
            return True

        company = getattr(user, "company_profile", None)

        if not company:
            return False

        return company.can_unlock_leads()


# ======================================================
# COMPANY CHAT ACCESS
# ======================================================

class IsCompanyChatReady(BasePermission):
    """
    Krävs för chat/message-system.
    """

    message = "Plotëso profilin për të përdorur chat-in."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) != "company":
            return True

        company = getattr(user, "company_profile", None)

        if not company:
            return False

        return company.can_access_chat()