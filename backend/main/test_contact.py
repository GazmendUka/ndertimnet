from unittest.mock import Mock, patch

from django.core import mail
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from core.email_backend import SendGridBackend


@override_settings(
    CONTACT_EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CONTACT_RECIPIENT_EMAIL="support@example.com",
    DEFAULT_FROM_EMAIL="no-reply@example.com",
)
class ContactApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        mail.get_connection("django.core.mail.backends.locmem.EmailBackend")
        mail.outbox.clear()
        self.payload = {
            "name": " Test Person ", "email": "visitor@example.com",
            "message": " Please help with my project. ",
        }

    def send(self, **changes):
        return self.client.post("/api/contact/", {**self.payload, **changes}, format="json")

    def test_public_contact_sends_to_support_with_reply_address(self):
        response = self.send(to="attacker@example.com", subject="Override")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["accepted"])
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ["support@example.com"])
        self.assertEqual(email.from_email, "no-reply@example.com")
        self.assertEqual(email.reply_to, ["visitor@example.com"])
        self.assertIn("Test Person", email.body)
        self.assertIn("Please help with my project.", email.body)
        self.assertNotEqual(email.subject, "Override")

    def test_expired_login_does_not_block_public_contact(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer expired-token")
        self.assertEqual(self.send().status_code, 200)

    def test_invalid_or_oversized_input_never_sends(self):
        cases = [
            {"name": " "}, {"name": "x" * 121}, {"name": "A\nB"},
            {"email": "invalid"}, {"email": "user@example.com\r\nBcc: other@example.com"},
            {"message": "short"}, {"message": " " * 20}, {"message": "x" * 5001},
        ]
        for fields in cases:
            with self.subTest(fields=list(fields)):
                cache.clear()
                self.assertEqual(self.send(**fields).status_code, 400)
        self.assertEqual(len(mail.outbox), 0)

    @patch("main.contact.EmailMessage.send", side_effect=RuntimeError("sensitive provider data"))
    def test_provider_exception_does_not_claim_success_or_leak_data(self, send):
        with self.assertLogs("main.contact", level="WARNING") as logs:
            response = self.send()
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("accepted", response.data)
        self.assertNotIn("sensitive provider data", str(response.data) + str(logs.output))
        self.assertNotIn("visitor@example.com", str(logs.output))

    @patch("main.contact.EmailMessage.send", return_value=0)
    def test_zero_deliveries_is_failure(self, send):
        self.assertEqual(self.send().status_code, 503)

    def test_sixth_request_is_throttled(self):
        for _ in range(5):
            self.assertEqual(self.send().status_code, 200)
        response = self.send()
        self.assertEqual(response.status_code, 429)
        self.assertIn("Retry-After", response)
        self.assertEqual(len(mail.outbox), 5)

    def test_get_does_not_send(self):
        self.assertEqual(self.client.get("/api/contact/").status_code, 405)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(CONTACT_EMAIL_BACKEND="core.email_backend.SendGridBackend")
    @patch.dict("os.environ", {"SENDGRID_API_KEY": ""})
    def test_missing_sendgrid_configuration_fails_closed(self):
        self.assertEqual(self.send().status_code, 503)
        self.assertEqual(len(mail.outbox), 0)


class ContactTransportTests(SimpleTestCase):
    @patch.dict("os.environ", {"SENDGRID_API_KEY": "test-only-key"})
    @patch("core.email_backend.SendGridAPIClient")
    def test_sendgrid_preserves_reply_to_without_changing_sender(self, client_class):
        client_class.return_value.send.return_value = Mock(status_code=202)
        message = mail.EmailMessage(
            "Contact", "A plain text message", "no-reply@example.com",
            ["support@example.com"], reply_to=["visitor@example.com"],
        )
        self.assertEqual(SendGridBackend().send_messages([message]), 1)
        payload = client_class.return_value.send.call_args.args[0].get()
        self.assertEqual(payload["reply_to"]["email"], "visitor@example.com")
        self.assertEqual(payload["from"]["email"], "no-reply@example.com")

    @patch.dict("os.environ", {"SENDGRID_API_KEY": "test-only-key"})
    @patch("core.email_backend.SendGridAPIClient")
    def test_sendgrid_rejection_is_not_success(self, client_class):
        client_class.return_value.send.return_value = Mock(status_code=400)
        message = mail.EmailMessage("Contact", "Body", "no-reply@example.com", ["support@example.com"])
        with self.assertRaises(RuntimeError):
            SendGridBackend().send_messages([message])
