# accounts/utils/email_verification.py

from django.core import signing
from django.conf import settings

EMAIL_VERIFY_SALT = "email-verify"

def generate_email_verification_token(user):
    print("🔐 GENERATE TOKEN - SECRET_KEY:", settings.SECRET_KEY[:10])

    return signing.dumps(
        {"user_id": user.id},
        salt=EMAIL_VERIFY_SALT,
    )


def verify_email_token(token, max_age=60 * 60 * 24):
    print("🔍 VERIFY TOKEN - SECRET_KEY:", settings.SECRET_KEY[:10])
    print("🔍 TOKEN RECEIVED:", token)

    try:
        data = signing.loads(
            token,
            salt=EMAIL_VERIFY_SALT,
            max_age=max_age,
        )
        print("✅ TOKEN VALID FOR USER:", data.get("user_id"))
        return data.get("user_id")
    except signing.BadSignature:
        print("❌ BAD SIGNATURE")
        return None
