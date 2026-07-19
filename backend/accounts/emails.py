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
                    Përshëndetje {user.first_name or ""},
                  </p>

                  <p style="margin:0 0 16px 0;">
                    Faleminderit që po përdorni shërbimin tonë, 
                    <strong>Ndërtimnet.com</strong>.
                  </p>

                  <p style="margin:0 0 24px 0;">
                    Ju lutem konfirmoni adresën tuaj të email-it duke klikuar butonin më poshtë.
                  </p>

                  <p style="text-align:center;margin:30px 0;">
                    <a href="{verify_url}"
                       style="background:#111827;color:#ffffff;text-decoration:none;
                              padding:12px 22px;border-radius:8px;font-weight:600;
                              display:inline-block;">
                       Verifiko email-in
                    </a>
                  </p>

                  <p style="margin-top:32px;font-size:14px;color:#6b7280;">
                    Nëse nuk e keni krijuar këtë llogari, mund ta injoroni këtë mesazh.
                  </p>

                  <hr style="margin:40px 0 20px 0;border:none;border-top:1px solid #e5e7eb;" />

                  <p style="font-size:13px;color:#9ca3af;text-align:center;">
                    © 2026 Ndërtimnet. Të gjitha të drejtat e rezervuara.
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
        subject="Verifikoni email-in tuaj – Ndërtimnet",
        html_content=html_content,
    )

    try:
        api_key = os.environ.get("SENDGRID_API_KEY")

        if not api_key:
            raise Exception("Çelësi SENDGRID_API_KEY nuk është konfiguruar")

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return response.status_code
    except Exception as e:
        print("GABIM SENDGRID:", str(e))
        raise


def send_password_reset_email(user, reset_url):
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
                    Përshëndetje {user.first_name or ""},
                  </p>

                  <p style="margin:0 0 24px 0;">
                    Keni kërkuar rivendosjen e fjalëkalimit.
                  </p>

                  <p style="text-align:center;margin:30px 0;">
                    <a href="{reset_url}"
                       style="background:#111827;color:#ffffff;text-decoration:none;
                              padding:12px 22px;border-radius:8px;font-weight:600;
                              display:inline-block;">
                       Rivendos fjalëkalimin
                    </a>
                  </p>

                  <p style="margin-top:32px;font-size:14px;color:#6b7280;">
                    Nëse nuk e keni kërkuar këtë veprim, mund ta injoroni këtë mesazh.
                  </p>

                  <hr style="margin:40px 0 20px 0;border:none;border-top:1px solid #e5e7eb;" />

                  <p style="font-size:13px;color:#9ca3af;text-align:center;">
                    © 2026 Ndërtimnet. Të gjitha të drejtat e rezervuara.
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
        subject="Rivendos fjalëkalimin – Ndërtimnet",
        html_content=html_content,
    )

    try:
        api_key = os.environ.get("SENDGRID_API_KEY")

        if not api_key:
            raise Exception("Çelësi SENDGRID_API_KEY nuk është konfiguruar")

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return response.status_code
    except Exception as e:
        print("GABIM SENDGRID:", str(e))
        raise


def send_welcome_email(user):
    login_url = settings.FRONTEND_LOGIN_URL
    profile_url = (
        f"{settings.FRONTEND_URL}/company/profile"
        if user.role == "company"
        else f"{settings.FRONTEND_URL}/customer/profile"
    )

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
                    Përshëndetje {user.first_name or ""},
                  </p>

                  <p style="margin:0 0 16px 0;">
                    Mirë se vini në <strong>Ndërtimnet.com</strong>.
                    Faleminderit që u bëtë pjesë e platformës sonë.
                  </p>

                  <p style="margin:0 0 16px 0;">
                    Në Ndërtimnet mund të krijoni kërkesa për punë, të gjeni bashkëpunime,
                    të dërgoni ose të merrni oferta dhe të ndiqni komunikimin tuaj në një vend të vetëm.
                  </p>

                  <p style="margin:0 0 24px 0;">
                    Hyni në llogarinë tuaj dhe eksploroni mundësitë që
                    Ndërtimnet ju ofron.
                  </p>

                  <p style="text-align:center;margin:30px 0;">
                    <a href="{profile_url}"
                       style="background:#111827;color:#ffffff;text-decoration:none;
                              padding:12px 22px;border-radius:8px;font-weight:600;
                              display:inline-block;">
                       Fillo tani
                    </a>
                  </p>

                  <p style="font-size:14px;color:#6b7280;margin:0 0 16px 0;">
                    Nëse nuk jeni të kyçur, mund të hyni këtu:
                    <a href="{login_url}" style="color:#111827;">{login_url}</a>
                  </p>

                  <p style="margin:28px 0 0 0;">
                    Faliminderit,<br />
                    Ndërtimnet.com
                  </p>

                  <hr style="margin:40px 0 20px 0;border:none;border-top:1px solid #e5e7eb;" />

                  <p style="font-size:13px;color:#9ca3af;text-align:center;">
                    © 2026 Ndërtimnet. Të gjitha të drejtat e rezervuara.
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
        subject="Mirë se vini në Ndërtimnet",
        html_content=html_content,
    )

    try:
        api_key = os.environ.get("SENDGRID_API_KEY")

        if not api_key:
            raise Exception("Çelësi SENDGRID_API_KEY nuk është konfiguruar")

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return response.status_code
    except Exception as e:
        print("GABIM SENDGRID:", str(e))
        raise


def send_profile_completion_reminder_email(user):
    profile_url = (
        f"{settings.FRONTEND_URL}/company/profile"
        if user.role == "company"
        else f"{settings.FRONTEND_URL}/customer/profile"
    )
    email_step = (
        "Së pari verifikoni email-in tuaj, pastaj plotësoni profilin."
        if not user.email_verified
        else "Profili juaj është gati për t'u plotësuar."
    )
    profile_reason = (
        "Një profil i plotë ju ndihmon të merrni kërkesa më të përshtatshme "
        "dhe të dërgoni oferta me më shumë besueshmëri."
        if user.role == "company"
        else "Një profil i plotë e bën më të lehtë krijimin e kërkesave "
        "dhe pranimin e ofertave nga kompanitë."
    )

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
                    Përshëndetje {user.first_name or ""},
                  </p>

                  <p style="margin:0 0 16px 0;">
                    Ju keni krijuar një llogari në <strong>Ndërtimnet.com</strong>,
                    por profili juaj nuk është plotësuar ende.
                  </p>

                  <p style="margin:0 0 16px 0;">
                    {email_step}
                  </p>

                  <p style="margin:0 0 24px 0;">
                    {profile_reason}
                  </p>

                  <p style="text-align:center;margin:30px 0;">
                    <a href="{profile_url}"
                       style="background:#111827;color:#ffffff;text-decoration:none;
                              padding:12px 22px;border-radius:8px;font-weight:600;
                              display:inline-block;">
                       Hyr dhe plotëso profilin
                    </a>
                  </p>

                  <p style="margin-top:32px;font-size:14px;color:#6b7280;">
                    Nëse tashmë e keni plotësuar profilin, mund ta injoroni këtë mesazh.
                  </p>

                  <p style="margin:28px 0 0 0;">
                    Faliminderit,<br />
                    Ndërtimnet.com
                  </p>

                  <hr style="margin:40px 0 20px 0;border:none;border-top:1px solid #e5e7eb;" />

                  <p style="font-size:13px;color:#9ca3af;text-align:center;">
                    © 2026 Ndërtimnet. Të gjitha të drejtat e rezervuara.
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
        subject="Plotësoni profilin tuaj – Ndërtimnet",
        html_content=html_content,
    )

    try:
        api_key = os.environ.get("SENDGRID_API_KEY")

        if not api_key:
            raise Exception("Çelësi SENDGRID_API_KEY nuk është konfiguruar")

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return response.status_code
    except Exception as e:
        print("GABIM SENDGRID:", str(e))
        raise


def send_company_verified_email(user):
    login_url = settings.FRONTEND_LOGIN_URL

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
                    Përshëndetje {user.first_name or ""},
                  </p>

                  <p style="margin:0 0 16px 0;">
                    Kompania juaj në <strong>Ndërtimnet.com</strong> është verifikuar.
                  </p>

                  <p style="margin:0 0 24px 0;">
                    Tani profili juaj mund të shfaqet me status të verifikuar dhe
                    klientët mund ta kenë më të lehtë të krijojnë besim te kompania juaj.
                  </p>

                  <p style="text-align:center;margin:30px 0;">
                    <a href="{login_url}"
                       style="background:#111827;color:#ffffff;text-decoration:none;
                              padding:12px 22px;border-radius:8px;font-weight:600;
                              display:inline-block;">
                       Hyr në llogari
                    </a>
                  </p>

                  <p style="margin:28px 0 0 0;">
                    Faleminderit,<br />
                    Ndërtimnet.com
                  </p>

                  <hr style="margin:40px 0 20px 0;border:none;border-top:1px solid #e5e7eb;" />

                  <p style="font-size:13px;color:#9ca3af;text-align:center;">
                    © 2026 Ndërtimnet. Të gjitha të drejtat e rezervuara.
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
        subject="Kompania juaj u verifikua – Ndërtimnet",
        html_content=html_content,
    )

    try:
        api_key = os.environ.get("SENDGRID_API_KEY")

        if not api_key:
            raise Exception("Çelësi SENDGRID_API_KEY nuk është konfiguruar")

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return response.status_code
    except Exception as e:
        print("GABIM SENDGRID:", str(e))
        raise
