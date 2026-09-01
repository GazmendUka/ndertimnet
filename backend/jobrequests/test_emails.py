import os
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from .emails import send_job_moderation_email


@override_settings(
    DEFAULT_FROM_EMAIL="no-reply@ndertimnet.com",
    FRONTEND_URL="https://ndertimnet.com",
)
class JobModerationEmailTests(SimpleTestCase):
    @patch.dict(
        os.environ,
        {
            "SENDGRID_API_KEY": "test-key",
            "JOB_REVIEW_NOTIFICATION_EMAILS": "info@ndertimnet.com",
            "BACKEND_BASE_URL": "https://api.ndertimnet.com",
        },
    )
    @patch("jobrequests.emails.SendGridAPIClient")
    @patch("jobrequests.emails.Mail")
    def test_new_job_notification_contains_minimal_review_details(
        self,
        mail_class,
        sendgrid_client_class,
    ):
        from .emails import send_new_job_review_notification

        job = SimpleNamespace(
            id=42,
            title="Renovimi i banjës",
        )
        sendgrid_client_class.return_value.send.return_value.status_code = 202

        result = send_new_job_review_notification(job)

        self.assertEqual(result, 202)
        mail_kwargs = mail_class.call_args.kwargs
        self.assertEqual(mail_kwargs["to_emails"], ["info@ndertimnet.com"])
        self.assertEqual(
            mail_kwargs["subject"],
            "Ny offertförfrågan #42 att granska – Ndërtimnet",
        )
        self.assertIn("Renovimi i banjës", mail_kwargs["html_content"])
        self.assertIn(
            "https://api.ndertimnet.com/admin/jobrequests/jobrequest/42/change/",
            mail_kwargs["html_content"],
        )
        self.assertNotIn("customer@example.com", mail_kwargs["html_content"])
        sendgrid_client_class.assert_called_once_with("test-key")
        sendgrid_client_class.return_value.send.assert_called_once_with(
            mail_class.return_value
        )

    @patch.dict(os.environ, {"SENDGRID_API_KEY": "test-key"})
    @patch("jobrequests.emails.SendGridAPIClient")
    @patch("jobrequests.emails.Mail")
    def test_approved_email_thanks_customer_and_explains_platform_growth(
        self,
        mail_class,
        sendgrid_client_class,
    ):
        job = SimpleNamespace(
            id=42,
            title="Renovimi i banjës",
            moderation_status="approved",
            moderation_note="",
            customer=SimpleNamespace(
                email="customer@example.com",
                first_name="Arta",
            ),
        )
        sendgrid_client_class.return_value.send.return_value.status_code = 202

        result = send_job_moderation_email(job)

        self.assertEqual(result, 202)
        mail_kwargs = mail_class.call_args.kwargs
        self.assertEqual(mail_kwargs["to_emails"], "customer@example.com")
        self.assertEqual(
            mail_kwargs["subject"],
            "Kërkesa juaj u miratua dhe u publikua – Ndërtimnet",
        )
        self.assertIn("Faleminderit që dërguat kërkesën tuaj", mail_kwargs["html_content"])
        self.assertIn("tani është publikuar në platformën tonë", mail_kwargs["html_content"])
        self.assertIn("Platforma jonë është e re", mail_kwargs["html_content"])
        self.assertIn("Numri i kompanive rritet çdo javë", mail_kwargs["html_content"])
        self.assertIn(
            "https://ndertimnet.com/customer/jobrequests/42",
            mail_kwargs["html_content"],
        )
        sendgrid_client_class.assert_called_once_with("test-key")
        sendgrid_client_class.return_value.send.assert_called_once_with(
            mail_class.return_value
        )
