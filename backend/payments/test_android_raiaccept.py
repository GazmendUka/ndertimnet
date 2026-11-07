"""Real HTTP adapter/checkout/DB/verification pipeline, synthetic bank transport.

No real gateway, card, customer or production database is used by these tests.
"""
import json
from decimal import Decimal
from unittest.mock import patch
from urllib.parse import urlsplit
from django.test import override_settings
from rest_framework.test import APITestCase
from payments.test_billing import BillingFixture
from payments.models import PlatformCharge, PlatformCheckout, OfferPackPurchase, SubscriptionAgreement
from payments.offer_packs import pack_remaining
from payments.billing import available_period
from payments.services.raiaccept import RaiAcceptError


@override_settings(ANDROID_RAIACCEPT_TEST_ENVIRONMENT=True,
    ANDROID_RAIACCEPT_SANDBOX_ENABLED=True, RAIACCEPT_MODE="sandbox",
    RAIACCEPT_PRODUCTION_USERNAME="", RAIACCEPT_PRODUCTION_PASSWORD="",
    RAIACCEPT_SANDBOX_USERNAME="synthetic", RAIACCEPT_SANDBOX_PASSWORD="synthetic",
    RAIACCEPT_MERCHANT_ACCOUNT_ID="synthetic-merchant",
    BACKEND_BASE_URL="https://backend.example.test", FRONTEND_BASE_URL="https://frontend.example.test")
class AndroidRaiAcceptTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        self.company.free_offers_remaining = 20
        self.company.save()
        setting = override_settings(ANDROID_RAIACCEPT_SANDBOX_COMPANY_IDS=[str(self.company.pk)])
        setting.enable(); self.addCleanup(setting.disable)
        self.orders = {}
        self.order_status = "PENDING"
        self.tx_status = None
        self.tx_changes = {}
        self.unavailable = False
        self.checkout_timeout = False
        self.transport = patch("payments.services.raiaccept._send_json", side_effect=self.bank)
        self.transport.start(); self.addCleanup(self.transport.stop)

    def bank(self, request, **kwargs):
        if self.unavailable:
            raise RaiAcceptError("Synthetic network interruption")
        if "authenticate.raiaccept.com" in request.full_url:
            return {"AuthenticationResult": {"IdToken": "synthetic-token"}}
        path = urlsplit(request.full_url).path
        if path == "/orders" and request.method == "POST":
            order = f"synthetic-order-{len(self.orders) + 1}"
            self.orders[order] = json.loads(request.data)
            return {"orderIdentification": order}
        order = path.split("/")[2]
        if path.endswith("/checkout") and request.method == "POST":
            if self.checkout_timeout:
                raise RaiAcceptError("Synthetic session timeout after order creation")
            return {"paymentRedirectURL": f"https://bank.example.test/{order}"}
        if path.endswith("/transactions"):
            return {"transactions": [{"transactionType": "PURCHASE", "transactionId": order + "-tx"}] if self.tx_status else []}
        if "/transactions/" in path:
            tx = {"transactionId": order + "-tx", "transactionType": "PURCHASE",
                  "transactionAmount": str(self.orders[order]["invoice"]["amount"]),
                  "transactionCurrency": "EUR", "isProduction": False,
                  "statusCode": "0000", "status": self.tx_status, **self.tx_changes}
            return {"merchant": {"merchantAccountId": "synthetic-merchant"}, "transaction": tx}
        return {"orderIdentification": order, "status": self.order_status,
                "isProduction": False, "merchant": {"merchantAccountId": "synthetic-merchant"}}

    def body(self, code="offers_3", **changes):
        terms_url = "offer-pack-terms/" if code == "offers_3" else "subscription-terms/"
        terms = self.client.get("/api/billing/" + terms_url, {"plan": code}).data
        return {"platform": "android", "checkout_provider": "raiaccept_sandbox",
                "signer_name": "Synthetic Tester", "accept_notice": True,
                "terms_version": terms["version"], "purchase_key": terms.get("purchase_key"),
                "plan": code, **changes}

    def buy(self, code="offers_3", body=None):
        url = "buy-offer-pack/" if code == "offers_3" else "subscribe/"
        return self.client.post("/api/billing/" + url, body or self.body(code), format="json")

    def notify(self):
        order = next(iter(self.orders))
        return self.client.post("/api/billing/notify/", {
            "order": {"orderIdentification": order}, "transaction": {"transactionId": order + "-tx"}}, format="json")

    def refresh_bank(self):
        PlatformCheckout.objects.update(last_checked_at=None)
        result = self.client.post("/api/billing/refresh-status/")
        self.assertEqual(result.status_code, 200, result.data)

    def assert_no_quota(self):
        self.assertEqual(pack_remaining(self.company), 0)
        self.assertIsNone(available_period(self.company))
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 20)

    def test_config_and_payload_are_explicit_sandbox_android(self):
        config = self.client.get("/api/billing/android-raiaccept-config/").data
        self.assertEqual(config, {"enabled": True, "environment": "Sandbox", "provider": "raiaccept_sandbox"})
        result = self.buy()
        self.assertEqual(result.status_code, 202, result.data)
        payload = next(iter(self.orders.values()))
        self.assertEqual(payload["invoice"]["amount"], 19.95)
        for key in ("successUrl", "failUrl", "cancelUrl"):
            self.assertEqual(payload["urls"][key], "https://backend.example.test/api/billing/android-raiaccept-return/")
        self.assertEqual(payload["urls"]["notificationUrl"], "https://backend.example.test/api/billing/notify/")
        self.assertIsNone(payload["recurring"])
        self.assert_no_quota()

    def test_production_and_disabled_or_non_allowlisted_test_never_create_order(self):
        for changes in [
            {"ANDROID_RAIACCEPT_TEST_ENVIRONMENT": False},
            {"ANDROID_RAIACCEPT_SANDBOX_ENABLED": False},
            {"ANDROID_RAIACCEPT_SANDBOX_COMPANY_IDS": []},
            {"RAIACCEPT_MODE": "production"},
            {"RAIACCEPT_PRODUCTION_PASSWORD": "synthetic-present"},
        ]:
            with self.subTest(changes=changes), override_settings(**changes):
                self.assertFalse(self.client.get("/api/billing/android-raiaccept-config/").data["enabled"])
                for code in ("offers_3", "standard", "pro"):
                    result = self.buy(code)
                    self.assertEqual(result.status_code, 400, result.data)
                self.assertEqual(self.client.get("/api/billing/android-raiaccept-return/").status_code, 404 if "ANDROID_RAIACCEPT_SANDBOX_COMPANY_IDS" not in changes else 200)
        self.assertFalse(PlatformCharge.objects.exists())
        self.assertFalse(SubscriptionAgreement.objects.exists())
        self.assertEqual(len(self.orders), 0)

    def test_android_never_masquerades_as_web_and_missing_credentials_fail_closed(self):
        for change in ({"checkout_provider": "web"}, {"checkout_provider": None}, {"platform": "ios"}):
            self.assertEqual(self.buy(body=self.body(**change)).status_code, 400)
        with override_settings(RAIACCEPT_SANDBOX_PASSWORD=""):
            self.assertFalse(self.client.get("/api/billing/android-raiaccept-config/").data["enabled"])
            self.assertEqual(self.buy().status_code, 503)
        self.assertFalse(PlatformCharge.objects.exists())

    def test_consent_and_signer_required_before_bank_order(self):
        for change in ({"accept_notice": False}, {"signer_name": ""}, {"terms_version": "old"}):
            self.assertEqual(self.buy(body=self.body(**change)).status_code, 400)
            self.assertEqual(self.buy("standard", self.body("standard", **change)).status_code, 400)
        self.assertFalse(PlatformCharge.objects.exists())
        self.assertEqual(len(self.orders), 0)

    def test_pack_success_verified_once_preserves_free_quota_and_archives_consent(self):
        body = self.body(amount="0.01", offers=1000)
        self.assertEqual(self.buy(body=body).status_code, 202)
        self.assertEqual(self.buy(body=body).status_code, 202)
        self.assertEqual(len(self.orders), 1)
        self.assert_no_quota()
        self.tx_status = "SUCCESS"
        self.assertEqual(self.notify().status_code, 200)
        self.assertEqual(self.notify().status_code, 200)
        self.refresh_bank()
        self.assertEqual(pack_remaining(self.company), 3)
        self.assertEqual(OfferPackPurchase.objects.count(), 1)
        self.company.refresh_from_db(); self.assertEqual(self.company.free_offers_remaining, 20)
        history = self.client.get("/api/billing/history/").data
        self.assertEqual(history[0]["status"], "paid")
        self.assertTrue(history[0]["receipt_number"])
        agreements = self.client.get("/api/billing/subscription/").data["agreements"]
        self.assertEqual(agreements[0]["signer_name"], "Synthetic Tester")

    def test_standard_success_grants_ten_only_after_verification(self):
        result = self.buy("standard")
        self.assertEqual(result.status_code, 202, result.data)
        self.assertEqual(Decimal(result.data["charge"]["amount"]), Decimal("29.00"))
        self.assert_no_quota()
        self.tx_status = "PAID"
        self.assertEqual(self.notify().status_code, 200)
        period = available_period(self.company)
        self.assertEqual(period.monthly_offers, 10)
        self.assertEqual(period.offers_used, 0)
        self.company.refresh_from_db(); self.assertEqual(self.company.free_offers_remaining, 20)

    def test_pro_missing_callback_reconciles_thirty_on_return(self):
        result = self.buy("pro")
        self.assertEqual(result.status_code, 202, result.data)
        self.assertEqual(Decimal(result.data["charge"]["amount"]), Decimal("59.00"))
        self.assert_no_quota()
        self.tx_status = "SUCCESS"
        self.refresh_bank()
        self.refresh_bank()
        self.assertEqual(available_period(self.company).monthly_offers, 30)
        self.assertEqual(PlatformCharge.objects.filter(status="paid").count(), 1)

    def test_browser_return_and_forged_success_never_grant(self):
        self.buy()
        result = self.client.get("/api/billing/android-raiaccept-return/?status=paid&amount=19.95")
        self.assertEqual(result.status_code, 200)
        self.assertContains(result, "ndertimnet://company/payments?payment=return")
        self.assertEqual(result["Cache-Control"], "no-store")
        self.refresh_bank()
        self.assert_no_quota()
        self.assertEqual(PlatformCheckout.objects.get().status, "pending")

    def test_terminal_decline_grants_nothing_and_retry_is_same_charge(self):
        self.buy()
        self.tx_status = "DECLINED"; self.order_status = "FAILED"
        self.refresh_bank()
        self.assert_no_quota()
        charge = PlatformCharge.objects.get()
        self.assertEqual(charge.status, "failed")
        result = self.client.post(f"/api/billing/{charge.pk}/checkout/", self.body(), format="json")
        self.assertEqual(result.status_code, 202, result.data)
        self.assertEqual(OfferPackPurchase.objects.count(), 1)
        self.assertEqual(len(self.orders), 2)

    def test_terminal_cancel_grants_nothing(self):
        self.buy(); self.order_status = "CANCELED"
        self.refresh_bank()
        self.assertEqual(PlatformCheckout.objects.get().status, "canceled")
        self.assert_no_quota()

    def test_declined_card_on_open_order_keeps_pending_not_safe_to_rebuy(self):
        body = self.body(); self.buy(body=body)
        self.tx_status = "DECLINED"
        self.refresh_bank()
        self.assertEqual(PlatformCheckout.objects.get().status, "pending")
        self.buy(body=body)
        self.assertEqual(len(self.orders), 1)
        self.assert_no_quota()

    def test_network_loss_after_order_does_not_create_second_order(self):
        self.checkout_timeout = True
        body = self.body()
        self.assertEqual(self.buy(body=body).status_code, 502)
        self.assertEqual(self.buy(body=body).status_code, 409)
        self.assertEqual(len(self.orders), 1)
        self.assertTrue(PlatformCheckout.objects.get().order_id)
        self.assert_no_quota()
        self.tx_status = "SUCCESS"; self.checkout_timeout = False
        self.refresh_bank()
        self.assertEqual(pack_remaining(self.company), 3)

    def test_network_loss_on_return_does_not_grant_or_cancel(self):
        self.buy(); self.unavailable = True
        self.refresh_bank()
        self.assertEqual(PlatformCheckout.objects.get().status, "pending")
        self.assert_no_quota()
        self.unavailable = False; self.tx_status = "SUCCESS"
        self.refresh_bank()
        self.assertEqual(pack_remaining(self.company), 3)

    def test_wrong_amount_currency_environment_or_transaction_never_grants(self):
        self.buy(); self.tx_status = "SUCCESS"
        for changes in ({"transactionAmount": "0.01"}, {"transactionCurrency": "USD"},
                        {"isProduction": True}, {"transactionType": "REFUND"}, {"statusCode": "9999"}):
            self.tx_changes = changes
            self.assertEqual(self.notify().status_code, 409)
            self.assert_no_quota()

    def test_foreign_and_customer_accounts_cannot_resume_test_purchase(self):
        self.buy(); charge = PlatformCharge.objects.get()
        body = self.body()
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/billing/android-raiaccept-config/").status_code, 403)
        self.assertEqual(self.client.post(f"/api/billing/{charge.pk}/checkout/", body, format="json").status_code, 404)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get("/api/billing/android-raiaccept-config/").status_code, (401, 403))
        self.assert_no_quota()
