# accounts/utils/email_verification.py

from django.core import signing

EMAIL_VERIFY_SALT = "email-verify"

def generate_email_verification_token(user):
    """
    Skapar en signerad token för email-verifiering.
    """
    return signing.dumps(
        {"user_id": user.id},
        salt=EMAIL_VERIFY_SALT,
    )

def verify_email_token(token, max_age=60 * 60 * 24):  # 24 timmar
    """
    Verifierar token och returnerar user_id om giltig.
    """
    try:
        data = signing.loads(
            token,
            salt=EMAIL_VERIFY_SALT,
            max_age=max_age,
        )
        return data.get("user_id")

    except signing.SignatureExpired:
        print("TOKEN EXPIRED")
        return None

    except signing.BadSignature:
        print("BAD SIGNATURE")
        return None