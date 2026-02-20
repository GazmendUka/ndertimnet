#backend/accounts/services/reactivation.py 

from django.contrib.auth import get_user_model
from accounts.models import Company

User = get_user_model()


def reactivate_company_account(email: str, password: str):
    """
    Reactivate a soft-deleted company account.
    Returns user if reactivated, otherwise None.
    """

    try:
        user = User.objects.get(email__iexact=email, role="company")
    except User.DoesNotExist:
        return None

    if user.is_active:
        return None

    # 🔄 Reactivate user
    user.is_active = True
    user.set_password(password)
    user.save()  # 🔥 no update_fields

    # 🔄 Reactivate company
    try:
        company = Company.objects.get(user=user)
        company.is_active = True
        company.archived_at = None
        company.save()
    except Company.DoesNotExist:
        pass

    return user
