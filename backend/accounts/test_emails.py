import os
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from .emails import send_profile_completion_reminder_email


@override_settings(
    DEFAULT_FROM_EMAIL="no-reply@ndertimnet.com",
    FRONTEND_URL="https://ndertimnet.com",
)
class ProfileCompletionReminderEmailTests(SimpleTestCase):
    @patch.dict(os.environ, {"SENDGRID_API_KEY": "test-key"})
    @patch("accounts.emails.SendGridAPIClient")
    def test_company_reminder_thanks_member_and_mentions_growing_activity(
        self,
        sendgrid_client_class,
    ):
        user = SimpleNamespace(
            email="company@example.com",
            first_name="Arben",
            role="company",
            email_verified=True,
        )
        sendgrid_client_class.return_value.send.return_value.status_code = 202

        result = send_profile_completion_reminder_email(user)

        self.assertEqual(result, 202)
        message = sendgrid_client_class.return_value.send.call_args.args[0]
        message_payload = message.get()
        html_content = message_payload["content"][0]["value"]
        normalized_html = " ".join(html_content.split())
        self.assertEqual(
            message_payload["subject"],
            "Faleminderit që jeni pjesë e Ndërtimnet – plotësoni profilin",
        )
        self.assertIn("Faleminderit që jeni bërë pjesë", normalized_html)
        self.assertIn("të hyni në llogarinë tuaj", normalized_html)
        self.assertIn("gjithnjë e më shumë anëtarë", normalized_html)
        self.assertIn("kërkesat e reja nga klientët", normalized_html)
        self.assertIn("Hyr, shiko dhe plotëso profilin", normalized_html)
        self.assertIn("https://ndertimnet.com/company/profile", normalized_html)
        self.assertNotIn("customer/profile", normalized_html)

    @patch.dict(os.environ, {"SENDGRID_API_KEY": "test-key"})
    @patch("accounts.emails.SendGridAPIClient")
    def test_customer_reminder_keeps_existing_customer_copy(
        self,
        sendgrid_client_class,
    ):
        user = SimpleNamespace(
            email="customer@example.com",
            first_name="Arta",
            role="customer",
            email_verified=True,
        )
        sendgrid_client_class.return_value.send.return_value.status_code = 202

        result = send_profile_completion_reminder_email(user)

        self.assertEqual(result, 202)
        message_payload = sendgrid_client_class.return_value.send.call_args.args[0].get()
        html_content = message_payload["content"][0]["value"]
        self.assertEqual(
            message_payload["subject"],
            "Plotësoni profilin tuaj – Ndërtimnet",
        )
        self.assertIn("Ju keni krijuar një llogari", html_content)
        self.assertNotIn("kërkesat e reja nga klientët", html_content)
        self.assertIn("https://ndertimnet.com/customer/profile", html_content)
