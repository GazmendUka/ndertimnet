import os
from unittest.mock import patch
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import User, Company
from accounts.staging_verification import enabled
from accounts.emails import send_verification_email

STAGING = {"SETTINGS_MODULE": "ndertimnet.staging_settings", "STAGING_ACCOUNT_CONFIRMATION_ENABLED": True}
ENDPOINT = "/api/accounts/test/confirm-account/"


@override_settings(**STAGING)
class StagingRegistrationTests(TestCase):
    def register(self, role="company"):
        data = {"email": f"{role}@example.test", "password": "Synthetic-only-18!pass",
                "company_name": "Synthetic Apple test", "first_name": "", "last_name": "",
                "registration_channel": "ios"}
        client = APIClient()
        response = client.post(f"/api/accounts/register/{role}/", data, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        user = User.objects.get(email=data["email"])
        self.assertFalse(user.email_verified)
        login = client.post("/api/accounts/login/", {k: data[k] for k in ("email", "password")}, format="json")
        self.assertEqual(login.status_code, 200, login.data)
        client.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["data"]["access"])
        return client, user

    @patch("accounts.emails.SendGridAPIClient")
    def test_company_register_login_confirm_and_store_access_without_mail_or_payment(self, transport):
        client, user = self.register()
        company = Company.objects.get(user=user)
        baseline = company.free_offers_remaining
        self.assertFalse(company.is_verified)
        result = client.post(ENDPOINT, {}, format="json")
        self.assertEqual(result.status_code, 200, result.data)
        user.refresh_from_db();company.refresh_from_db()
        self.assertTrue(user.email_verified);self.assertIsNotNone(user.email_verified_at)
        self.assertFalse(company.is_verified)
        self.assertEqual(company.free_offers_remaining, baseline)
        stamp = user.email_verified_at
        self.assertEqual(client.post(ENDPOINT).status_code, 200)
        user.refresh_from_db();self.assertEqual(user.email_verified_at, stamp)
        with override_settings(STORE_BILLING_ENABLED=True, STORE_BILLING_ENVIRONMENT="Sandbox",
                               STORE_APPLE_KEY_ID="synthetic", STORE_APPLE_ISSUER_ID="synthetic", STORE_APPLE_PRIVATE_KEY="synthetic"):
            config = client.get("/api/billing/store-config/?platform=ios")
        self.assertTrue(config.data["enabled"]);self.assertEqual(config.data["environment"], "Sandbox")
        from payments.models import StoreCheckout, PlatformCharge, BillingSubscription
        self.assertFalse(StoreCheckout.objects.exists());self.assertFalse(PlatformCharge.objects.exists());self.assertFalse(BillingSubscription.objects.exists())
        transport.assert_not_called()

    @patch("accounts.emails.SendGridAPIClient")
    def test_customer_is_kept_as_customer_and_resend_does_not_claim_mail_delivery(self, transport):
        client, user = self.register("customer")
        response = client.post("/api/accounts/resend-verification/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["verification_mode"], "staging_authenticated")
        self.assertEqual(client.post(ENDPOINT).status_code, 200)
        user.refresh_from_db();self.assertEqual(user.role, "customer");self.assertTrue(user.email_verified)
        self.assertFalse(Company.objects.filter(user=user).exists())
        transport.assert_not_called()

    def test_anonymous_confirmation_is_rejected(self):
        response = APIClient().post(ENDPOINT)
        self.assertIn(response.status_code, (401, 403))

    def test_credentials_are_required_and_body_cannot_target_another_account(self):
        client, actor = self.register()
        other = User.objects.create_user(email="other@example.test", password="Other-synthetic-18!", role="customer")
        self.assertEqual(client.post(ENDPOINT, {"user_id": other.pk, "email": other.email}, format="json").status_code, 200)
        other.refresh_from_db();self.assertFalse(other.email_verified)
        wrong = APIClient().post("/api/accounts/login/", {"email": actor.email, "password": "wrong"}, format="json")
        self.assertEqual(wrong.status_code, 401)

    def test_disabled_account_is_not_reactivated_even_if_session_was_authenticated(self):
        client, user = self.register()
        user.is_active = False;user.save(update_fields=["is_active"])
        client.force_authenticate(user)
        self.assertEqual(client.post(ENDPOINT).status_code, 400)
        user.refresh_from_db();self.assertFalse(user.is_active);self.assertFalse(user.email_verified)

    def test_already_created_unverified_account_can_login_and_confirm_without_registering_again(self):
        user = User.objects.create_user(email="existing@example.test", password="Existing-synthetic-18!", role="company")
        Company.objects.create(user=user, company_name="Existing synthetic")
        client = APIClient();login = client.post("/api/accounts/login/", {"email":user.email,"password":"Existing-synthetic-18!"},format="json")
        client.credentials(HTTP_AUTHORIZATION="Bearer "+login.data["data"]["access"])
        self.assertEqual(client.post(ENDPOINT).status_code, 200)
        self.assertEqual(User.objects.filter(email=user.email).count(), 1)


class ProductionConfirmationGuards(TestCase):
    @override_settings(SETTINGS_MODULE="ndertimnet.settings", STAGING_ACCOUNT_CONFIRMATION_ENABLED=True)
    def test_copying_the_flag_does_not_enable_production_confirmation(self):
        user = User.objects.create_user(email="protected@example.test", role="customer")
        client = APIClient();client.force_authenticate(user)
        self.assertFalse(enabled());self.assertEqual(client.post(ENDPOINT).status_code, 404)
        user.refresh_from_db();self.assertFalse(user.email_verified)

    @override_settings(SETTINGS_MODULE="ndertimnet.staging_settings", STAGING_ACCOUNT_CONFIRMATION_ENABLED=False)
    def test_module_without_the_explicit_setting_does_not_enable_confirmation(self):
        self.assertFalse(enabled())

    @override_settings(SETTINGS_MODULE="ndertimnet.settings", STAGING_ACCOUNT_CONFIRMATION_ENABLED=True)
    @patch("accounts.emails.SendGridAPIClient")
    def test_production_verification_still_uses_real_delivery(self, transport):
        user = User.objects.create_user(email="protected@example.test", role="customer")
        with patch.dict(os.environ, {"SENDGRID_API_KEY":"synthetic-only"}):send_verification_email(user, "synthetic-token")
        transport.assert_called_once_with("synthetic-only")
