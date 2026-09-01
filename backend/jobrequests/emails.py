import os

from django.conf import settings
from django.utils.html import escape
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


SUBJECTS = {
    "approved": "Kërkesa juaj u miratua dhe u publikua – Ndërtimnet",
    "changes_requested": "Kërkesa juaj kërkon ndryshime – Ndërtimnet",
    "rejected": "Vendim për kërkesën tuaj – Ndërtimnet",
    "blocked": "Kërkesa juaj u bllokua – Ndërtimnet",
}


def send_new_job_review_notification(job):
    recipient_emails = [
        email.strip()
        for email in os.environ.get(
            "JOB_REVIEW_NOTIFICATION_EMAILS",
            "info@ndertimnet.com",
        ).split(",")
        if email.strip()
    ]
    api_key = os.environ.get("SENDGRID_API_KEY")
    if not recipient_emails or not api_key:
        return None

    backend_url = os.environ.get("BACKEND_BASE_URL", "").rstrip("/")
    admin_url = (
        f"{backend_url}/admin/jobrequests/jobrequest/{job.id}/change/"
        if backend_url
        else ""
    )
    admin_link_html = (
        '<p style="margin-top:26px;">'
        f'<a href="{escape(admin_url)}" style="background:#111827;color:#fff;'
        'text-decoration:none;padding:12px 20px;border-radius:999px;">'
        "Granska förfrågan</a></p>"
        if admin_url
        else ""
    )

    html_content = f"""
    <div style="background:#f5f6f8;padding:36px;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:14px;">
        <p style="margin:0 0 16px;">Hej,</p>
        <h2 style="margin:0 0 12px;">Ny offertförfrågan att granska</h2>
        <p style="line-height:1.6;">
          En ny offertförfrågan har inkommit och väntar på granskning i admin.
        </p>
        <div style="margin:20px 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;line-height:1.7;">
          <strong>Förfrågnings-ID:</strong> {job.id}<br />
          <strong>Titel:</strong> {escape(job.title)}
        </div>
        {admin_link_html}
        <p style="margin:28px 0 0;line-height:1.6;">Ndërtimnet.com</p>
      </div>
    </div>
    """
    message = Mail(
        from_email=settings.DEFAULT_FROM_EMAIL,
        to_emails=recipient_emails,
        subject=f"Ny offertförfrågan #{job.id} att granska – Ndërtimnet",
        html_content=html_content,
    )
    return SendGridAPIClient(api_key).send(message).status_code


def send_job_moderation_email(job):
    if job.moderation_status not in SUBJECTS or not job.customer.email:
        return None

    detail_url = f"{settings.FRONTEND_URL}/customer/jobrequests/{job.id}"
    note_html = ""
    if job.moderation_note:
        note_html = (
            '<div style="margin:20px 0;padding:16px;background:#f3f4f6;border-radius:10px;">'
            f"{escape(job.moderation_note)}"
            "</div>"
        )

    status_text = {
        "approved": (
            "Faleminderit që dërguat kërkesën tuaj për ofertë në Ndërtimnet. "
            "Kërkesa juaj është miratuar dhe tani është publikuar në platformën tonë."
        ),
        "changes_requested": "Duhet të përditësoni disa të dhëna përpara publikimit.",
        "rejected": "Kërkesa juaj nuk mund të publikohet.",
        "blocked": "Kërkesa juaj është bllokuar. Kontaktoni mbështetjen nëse mendoni se ky është një gabim.",
    }[job.moderation_status]

    approved_message_html = ""
    if job.moderation_status == "approved":
        approved_message_html = """
        <div style="margin:20px 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
          <p style="margin:0 0 10px;line-height:1.6;"><strong>Ju falënderojmë për durimin.</strong></p>
          <p style="margin:0;line-height:1.6;">
            Platforma jonë është e re dhe aktualisht po shtojmë vazhdimisht kompani
            që mund t'ju dërgojnë oferta. Numri i kompanive rritet çdo javë dhe,
            ndërsa rrjeti ynë zgjerohet, do të keni gjithnjë e më shumë mundësi
            për të marrë oferta së shpejti.
          </p>
        </div>
        """

    customer_name = escape(job.customer.first_name or "")
    job_title = escape(job.title)

    html_content = f"""
    <div style="background:#f5f6f8;padding:36px;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:14px;">
        <p>Përshëndetje {customer_name},</p>
        <h2 style="margin:18px 0 8px;">{job_title}</h2>
        <p style="line-height:1.6;">{status_text}</p>
        {approved_message_html}
        {note_html}
        <p style="margin-top:26px;"><a href="{detail_url}" style="background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;">Shiko kërkesën</a></p>
        <p style="margin:28px 0 0;line-height:1.6;">Faleminderit,<br />Ndërtimnet.com</p>
      </div>
    </div>
    """
    message = Mail(
        from_email=settings.DEFAULT_FROM_EMAIL,
        to_emails=job.customer.email,
        subject=SUBJECTS[job.moderation_status],
        html_content=html_content,
    )
    api_key = os.environ.get("SENDGRID_API_KEY")
    if not api_key:
        return None
    return SendGridAPIClient(api_key).send(message).status_code
