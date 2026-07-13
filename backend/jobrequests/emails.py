import os

from django.conf import settings
from django.utils.html import escape
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


SUBJECTS = {
    "approved": "Kërkesa juaj u publikua – Ndërtimnet",
    "changes_requested": "Kërkesa juaj kërkon ndryshime – Ndërtimnet",
    "rejected": "Vendim për kërkesën tuaj – Ndërtimnet",
    "blocked": "Kërkesa juaj u bllokua – Ndërtimnet",
}


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
        "approved": "Kërkesa juaj është miratuar dhe tani është publikuar për kompanitë.",
        "changes_requested": "Duhet të përditësoni disa të dhëna përpara publikimit.",
        "rejected": "Kërkesa juaj nuk mund të publikohet.",
        "blocked": "Kërkesa juaj është bllokuar. Kontaktoni mbështetjen nëse mendoni se ky është një gabim.",
    }[job.moderation_status]

    html_content = f"""
    <div style="background:#f5f6f8;padding:36px;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:14px;">
        <p>Përshëndetje {job.customer.first_name or ''},</p>
        <h2 style="margin:18px 0 8px;">{job.title}</h2>
        <p style="line-height:1.6;">{status_text}</p>
        {note_html}
        <p style="margin-top:26px;"><a href="{detail_url}" style="background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;">Shiko kërkesën</a></p>
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
