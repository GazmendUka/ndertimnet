# backend/accounts/services/reactivation.py

from django.contrib.auth import get_user_model
from accounts.emails import send_verification_email
from accounts.utils.email_verification import generate_email_verification_token

User = get_user_model()


def initiate_company_reactivation(email: str, request=None) -> bool:
    """
    If a soft-deleted company account exists,
    create a reactivation token and send email.
    Returns True if reactivation flow started.
    """

    try:
        user = User.objects.get(email__iexact=email, role="company")
    except User.DoesNotExist:
        return False

    if user.is_active:
        return False

    # 🔐 Generate new verification token
    token = generate_email_verification_token(user)

    # 🔐 Send reactivation email
    send_verification_email(user, token)

    return True
