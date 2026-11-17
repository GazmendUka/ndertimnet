from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import Company


class RegistrationChannelTests(TestCase):
    @patch("accounts.views.send_verification_email")
    def test_actual_company_registration_records_channel_without_payment(self, send_mail):
        for channel in ("ios", "android", "web"):
            response = APIClient().post("/api/accounts/register/company/", {
                "email": f"{channel}@example.test", "password": "synthetic-password-123",
                "company_name": "Synthetic company", "registration_channel": channel,
            }, format="json")
            self.assertLess(response.status_code, 300, response.data)
            self.assertEqual(Company.objects.get(user__email=f"{channel}@example.test").registration_channel, channel)
        from payments.models import PlatformCharge, BillingSubscription
        self.assertFalse(PlatformCharge.objects.exists())
        self.assertFalse(BillingSubscription.objects.exists())
        self.assertEqual(send_mail.call_count, 3)

    @patch("accounts.views.send_verification_email")
    def test_old_clients_are_unknown_and_invalid_channels_are_rejected(self, send_mail):
        client = APIClient()
        data = {"email": "legacy@example.test", "password": "synthetic-password-123", "company_name": "Synthetic"}
        self.assertLess(client.post("/api/accounts/register/company/", data, format="json").status_code, 300)
        self.assertEqual(Company.objects.get(user__email=data["email"]).registration_channel, "unknown")
        data.update(email="invalid@example.test", registration_channel="made-up")
        self.assertEqual(client.post("/api/accounts/register/company/", data, format="json").status_code, 400)
        self.assertFalse(Company.objects.filter(user__email=data["email"]).exists())
