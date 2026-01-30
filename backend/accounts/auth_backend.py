###########################
#accounts/auth_backend.py
###########################
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailAuthBackend(ModelBackend):
    """
    Authenticate using email instead of username.
    """

    def authenticate(self, request, email=None, password=None, username=None, **kwargs):
        # If username is used instead of email → treat it as email
        if email is None and username is not None:
            email = username

        if email is None or password is None:
            return None

        email = email.lower().strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None

        if user.check_password(password):
            return user

        return None
