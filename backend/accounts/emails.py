#backend/accounts/emails.py

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from django.conf import settings


def send_verification_email(user, token):
    verify_url = settings.FRONTEND_VERIFY_EMAIL_URL.format(token=token)

    message = Mail(
        from_email=settings.DEFAULT_FROM_EMAIL,
        to_emails=user.email,
        subject="Verifikoni email-in tuaj – Ndertimnet",
        html_content=f"""
            <p>Përshëndetje {user.first_name},</p>
            <p>Klikoni butonin më poshtë për të verifikuar email-in tuaj:</p>
            <p>
                <a href="{verify_url}" 
                   style="padding:10px 16px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
                   Verifiko Email-in
                </a>
            </p>
            <p>Nëse nuk e keni kërkuar këtë email, mund ta injoroni.</p>
        """
    )

    try:
        api_key = os.environ.get("SENDGRID_API_KEY")

        if not api_key:
            raise Exception("SENDGRID_API_KEY is not configured")

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return response.status_code
    except Exception as e:
        print("SENDGRID ERROR:", str(e))
        raise
