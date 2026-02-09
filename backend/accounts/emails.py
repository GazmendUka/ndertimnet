from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings


def send_verification_email(user, token):
    verify_url = settings.FRONTEND_VERIFY_EMAIL_URL.format(token=token)

    subject = "Verifikoni email-in tuaj – Ndertimnet"

    # TEXT fallback (VIKTIGT)
    text_content = (
        "Përshëndetje,\n\n"
        "Ju lutem verifikoni email-in tuaj duke klikuar linkun më poshtë:\n\n"
        f"{verify_url}\n\n"
        "Nëse nuk e keni krijuar këtë llogari, mund ta injoroni këtë email.\n\n"
        "— Ndertimnet"
    )

    # HTML content
    html_content = render_to_string(
        "emails/verify_email.html",
        {
            "user": user,
            "verify_url": verify_url,
        },
    )

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )

    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)
