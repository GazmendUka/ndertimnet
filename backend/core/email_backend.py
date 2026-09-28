"""SendGrid transport for Django's billing reminder emails."""
import os
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, ReplyTo


class SendGridBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        key = os.environ.get('SENDGRID_API_KEY')
        if not key:
            if self.fail_silently:
                return 0
            raise ImproperlyConfigured('SENDGRID_API_KEY is required for reminder delivery.')
        delivered = 0
        client = SendGridAPIClient(key)
        for email in email_messages:
            if not email.recipients():
                continue
            try:
                if email.attachments:
                    raise ValueError('The reminder transport does not support attachments.')
                message = Mail(from_email=email.from_email, to_emails=email.to,
                               subject=email.subject, plain_text_content=email.body)
                if email.reply_to:
                    message.reply_to = ReplyTo(email.reply_to[0])
                for recipient in email.cc:
                    message.add_cc(recipient)
                for recipient in email.bcc:
                    message.add_bcc(recipient)
                for alternative in getattr(email, 'alternatives', []):
                    if alternative.mimetype == 'text/html':
                        message.html_content = alternative.content
                response = client.send(message)
                if not 200 <= response.status_code < 300:
                    raise RuntimeError('Reminder provider rejected delivery.')
                delivered += 1
            except Exception:
                if not self.fail_silently:
                    raise RuntimeError('Reminder delivery failed; retry required.') from None
        return delivered
