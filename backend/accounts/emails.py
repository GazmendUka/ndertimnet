# backend/accounts/emails.py

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from django.conf import settings


def send_verification_email(user, token):
    verify_url = settings.FRONTEND_VERIFY_EMAIL_URL.format(token=token)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f5f6f8;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;">
              
              <tr>
                <td style="font-size:16px;color:#111827;line-height:1.6;">
                  
                  <p style="margin:0 0 16px 0;">
                    Hej {user.first_name or ""},
                  </p>

                  <p style="margin:0 0 16px 0;">
                    Tack för att du använder vår tjänst, <strong>Ndërtimnet.com</strong>.
                  </p>

                  <p style="margin:0 0 24px 0;">
                    Bekräfta din emailadress genom att klicka på knappen nedan.
                  </p>

                  <p style="text-align:center;margin:30px 0;">
                    <a href="{verify_url}"
                       style="background:#111827;color:#ffffff;text-decoration:none;
                              padding:12px 22px;border-radius:8px;font-weight:600;
                              display:inline-block;">
                       Verifiera email
                    </a>
                  </p>

                  <p style="margin-top:32px;font-size:14px;color:#6b7280;">
                    om du inte skapade kontot kan du ignorera detta meddelande.
                  </p>

                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    message = Mail(
        from_email=settings.DEFAULT_FROM_EMAIL,
        to_emails=user.email,
        subject="Verifiera din email – Ndërtimnet",
        html_content=html_content,
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
