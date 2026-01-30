# accounts/emails.py

from django.core.mail import send_mail
from django.conf import settings

def send_verification_email(user, token):
    verify_url = settings.FRONTEND_VERIFY_EMAIL_URL.format(
        token=token.token
    )

    subject = "Verifiera din e-postadress – Ndertimnet"
    message = (
        "Hej!\n\n"
        "Verifiera din e-postadress genom att klicka på länken nedan:\n\n"
        f"{verify_url}\n\n"
        "Om du inte skapade ett konto kan du ignorera detta mail.\n\n"
        "Vänliga hälsningar\n"
        "Ndertimnet"
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
