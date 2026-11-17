from decimal import Decimal
from unittest.mock import patch, MagicMock
from uuid import uuid4
from django.test import override_settings, SimpleTestCase
from django.db import transaction
from rest_framework.test import APITestCase
from payments.test_billing import BillingFixture
from payments.models import StoreCheckout, PlatformCharge, OfferPackPurchase, PlatformCheckout
from payments import store_billing, store_gateway as gateway
from payments.offer_packs import pack_remaining
from payments.billing import available_period, authorize_offer_send


@override_settings(STORE_BILLING_ENABLED=True, STORE_BILLING_ENVIRONMENT="Sandbox",
    STORE_APPLE_KEY_ID="synthetic", STORE_APPLE_ISSUER_ID="synthetic", STORE_APPLE_PRIVATE_KEY="synthetic",
    STORE_GOOGLE_CREDENTIALS_JSON="{}")
class StoreBillingTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        from django.core.cache import cache
        cache.clear()

    def body(self, **changes):
        return {"code": "offers_3", "platform": "ios", "amount": "19.95", "currency": "EUR",
            "terms_version": store_billing.TERMS_VERSION, "accept_notice": True,
            "signer_name": "Test Person", **changes}

    def prepare(self, **changes):
        result = self.client.post('/api/billing/store-prepare/', self.body(**changes), format='json')
        self.assertEqual(result.status_code, 200, result.data)
        return result.data

    def verify(self, intent, reference="123456"):
        return self.client.post('/api/billing/store-verify/', {"id": intent["id"], "reference": reference}, format='json')

    def purchase(self, amount="19.95", currency="EUR", consumed=False):
        return gateway.VerifiedPurchase(Decimal(amount), currency, "Sandbox", consumed)

    def test_disabled_store_fails_before_creating_contract_or_charge(self):
        with override_settings(STORE_BILLING_ENABLED=False):
            self.assertFalse(self.client.get('/api/billing/store-config/', {'platform':'ios'}).data['enabled'])
            self.assertEqual(self.client.post('/api/billing/store-prepare/', self.body()).status_code, 400)
        self.assertFalse(PlatformCharge.objects.exists())

    def test_consent_product_price_and_platform_guards(self):
        for change in [{"code":"missing"}, {"platform":"web"}, {"amount":"NaN"}, {"amount":"-1"},
                {"amount":"Infinity"}, {"amount":"0.0001"}, {"currency":"eur"}, {"accept_notice":False},
                {"terms_version":"old"}, {"signer_name":""}, {"charge_id":"bad"}]:
            response = self.client.post('/api/billing/store-prepare/', self.body(**change), format='json')
            self.assertEqual(response.status_code, 400, (change, response.data))
        self.assertFalse(PlatformCharge.objects.exists())

    def test_terms_are_store_specific_and_snapshot_exact_local_currency(self):
        result = self.client.get('/api/billing/store-terms/', self.body(amount="249.00",currency="SEK"))
        self.assertEqual(result.status_code, 200)
        self.assertIn("249.00 SEK", result.data['text'])
        self.assertIn("Apple App Store", result.data['text'])
        self.assertNotIn("faqen e bankës", result.data['text'])

    def test_preparation_is_idempotent_does_not_grant_or_call_bank(self):
        with patch('payments.billing_views.create_checkout') as bank:
            a = self.prepare(); b = self.prepare()
        self.assertEqual(a['id'], b['id'])
        self.assertEqual(OfferPackPurchase.objects.count(), 1)
        self.assertEqual(pack_remaining(self.company), 0)
        bank.assert_not_called()
        self.assertFalse(PlatformCheckout.objects.exists())

    @patch('payments.store_gateway.verify')
    def test_verified_pack_grants_once_and_preserves_free_balance(self, provider):
        self.company.free_offers_remaining = 20; self.company.save()
        intent = self.prepare(offers=1000, price="0.01")
        provider.return_value = self.purchase()
        self.assertEqual(self.verify(intent).status_code, 200)
        self.assertEqual(self.verify(intent).status_code, 200)
        self.assertEqual(pack_remaining(self.company), 3)
        self.company.refresh_from_db(); self.assertEqual(self.company.free_offers_remaining, 20)
        self.assertEqual(OfferPackPurchase.objects.count(), 1)
        self.assertEqual(self.verify(intent, "different").status_code, 409)

    @patch('payments.store_gateway.verify')
    def test_pending_bad_price_wrong_currency_environment_never_grant(self, provider):
        intent = self.prepare()
        for purchase in [self.purchase("20.01"), self.purchase(currency="USD"), gateway.VerifiedPurchase(Decimal('19.95'),'EUR','Production')]:
            provider.return_value = purchase
            self.assertEqual(self.verify(intent).status_code, 409)
            self.assertEqual(pack_remaining(self.company), 0)
        provider.side_effect = gateway.StorePending("Pending")
        self.assertEqual(self.verify(intent).status_code, 202)
        self.assertEqual(pack_remaining(self.company), 0)
        checkout=StoreCheckout.objects.get(pk=intent['id'])
        self.assertEqual(checkout.verification_reference, '123456')

    @patch('payments.store_gateway.verify')
    def test_store_funded_discount_is_recorded_without_overcharging(self, provider):
        intent=self.prepare();provider.return_value=self.purchase('17.95')
        self.assertEqual(self.verify(intent).status_code,200)
        self.assertEqual(StoreCheckout.objects.get().paid_amount,Decimal('17.95'))
        history=self.client.get('/api/billing/history/').data
        self.assertEqual(history[0]['store_payment']['amount'],'17.950')

    @patch('payments.store_gateway.verify')
    def test_standard_and_pro_use_existing_monthly_quotas_and_ledger(self, provider):
        for code,amount,quota in [('standard','29.00',10),('pro','59.00',30)]:
            intent=self.prepare(code=code,amount=amount)
            provider.return_value=self.purchase(amount)
            self.assertEqual(self.verify(intent,code+'-transaction').status_code,200)
            period=available_period(self.company)
            self.assertEqual(period.monthly_offers,quota)
            self.assertIsNotNone(period.subscription.started_at)
            with transaction.atomic(): authorize_offer_send(self.offer,self.user)
            # End the synthetic subscription before testing another first purchase.
            from django.utils import timezone
            period.subscription.ends_at=timezone.now();period.subscription.save()

    @patch('payments.store_gateway.verify')
    def test_cannot_buy_paid_month_twice(self, provider):
        intent=self.prepare(code='standard',amount='29.00');provider.return_value=self.purchase('29.00')
        self.assertEqual(self.verify(intent).status_code,200)
        self.assertEqual(self.client.post('/api/billing/store-prepare/',self.body(code='standard',amount='29.00')).status_code,400)

    @patch('payments.store_gateway.verify')
    def test_refund_revokes_only_unspent_purchased_quota(self, provider):
        intent=self.prepare();provider.return_value=self.purchase();self.verify(intent)
        self.assertEqual(pack_remaining(self.company),3)
        provider.side_effect=gateway.StoreRevoked('Refunded')
        self.assertEqual(self.verify(intent).status_code,409)
        self.assertEqual(pack_remaining(self.company),0)
        self.assertEqual(PlatformCharge.objects.get(kind='offer_pack').status,'refunded')

    @patch('payments.store_gateway.consume_google')
    @patch('payments.store_gateway.verify')
    def test_google_finishing_retries_without_double_credit(self, provider, consume):
        intent=self.prepare(platform='android');provider.return_value=self.purchase()
        consume.side_effect=gateway.StoreError('Retry delivery')
        self.assertEqual(self.verify(intent).status_code,409)
        self.assertEqual(pack_remaining(self.company),3)
        consume.side_effect=None
        self.assertEqual(self.verify(intent).status_code,200)
        self.assertEqual(pack_remaining(self.company),3)
        self.assertIsNotNone(StoreCheckout.objects.get(pk=intent['id']).finished_at)

    @patch('payments.store_gateway.verify',side_effect=gateway.StoreRevoked('Canceled before delivery'))
    def test_revoked_first_payment_closes_pending_intent_without_grant(self, provider):
        intent=self.prepare(code='standard',amount='29.00')
        self.assertEqual(self.verify(intent).status_code,409)
        self.assertEqual(StoreCheckout.objects.get().status,'refunded')
        from payments.billing import current_subscription
        self.assertIsNone(current_subscription(self.company))
        self.assertIsNone(available_period(self.company))

    def test_other_accounts_and_customers_cannot_verify_or_read_terms(self):
        intent=self.prepare()
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.verify(intent).status_code,403)
        self.assertEqual(self.client.get('/api/billing/store-terms/',self.body()).status_code,403)
        self.client.force_authenticate(None)
        self.assertIn(self.verify(intent).status_code,[401,403])

    def test_missing_reference_returns_error_not_server_exception(self):
        intent=self.prepare()
        self.assertEqual(self.verify(intent,None).status_code,409)

    @patch('payments.store_gateway.verify')
    def test_another_company_cannot_claim_the_checkout(self, provider):
        from payments.test_launch import BillingConcurrencyTests
        intent=self.prepare()
        other,_=BillingConcurrencyTests.competitor(self)
        self.client.force_authenticate(other)
        self.assertEqual(self.verify(intent).status_code,404)
        provider.assert_not_called()

    @patch('payments.store_gateway.verify')
    def test_native_plan_change_is_scheduled_and_never_starts_checkout(self, provider):
        intent=self.prepare(code='standard',amount='29.00');provider.return_value=self.purchase('29.00')
        self.assertEqual(self.verify(intent).status_code,200)
        response=self.client.post('/api/billing/change-plan/',{**self.body(code='pro',amount='59.00'),'plan':'pro'},format='json')
        self.assertEqual(response.status_code,200,response.data)
        from payments.models import BillingSubscription
        sub=BillingSubscription.objects.get()
        self.assertEqual(sub.pending_plan_code,'pro')
        self.assertEqual(sub.monthly_offers,10)
        self.assertFalse(PlatformCheckout.objects.exists())

    @patch('payments.store_gateway.requests.get')
    def test_forged_apple_signed_transaction_never_grants_credit(self, http):
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        key=ec.generate_private_key(ec.SECP256R1()).private_bytes(serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,serialization.NoEncryption()).decode()
        intent=self.prepare()
        http.return_value.status_code=200
        http.return_value.json.return_value={'signedTransactionInfo':'forged.payload.signature'}
        with override_settings(STORE_APPLE_PRIVATE_KEY=key):
            self.assertEqual(self.verify(intent).status_code,409)
        self.assertEqual(pack_remaining(self.company),0)

    def test_canceled_store_can_retry_and_does_not_unlock_quota(self):
        intent=self.prepare()
        self.assertEqual(self.client.post('/api/billing/store-cancel/',{'id':intent['id']}).status_code,200)
        self.assertEqual(pack_remaining(self.company),0)
        retry=self.prepare();self.assertNotEqual(retry['id'],intent['id'])

    @override_settings(RAIACCEPT_MODE='sandbox',RAIACCEPT_MERCHANT_ACCOUNT_ID='synthetic',RAIACCEPT_SANDBOX_USERNAME='synthetic',RAIACCEPT_SANDBOX_PASSWORD='synthetic')
    @patch('payments.billing_views.create_checkout')
    def test_unfinished_store_blocks_bank_and_cancel(self, bank):
        intent=self.prepare(code='standard',amount='29.00')
        r=self.client.post(f"/api/billing/{intent['charge_id']}/checkout/",{'platform':'web'})
        self.assertEqual(r.status_code,400,r.data)
        self.assertEqual(self.client.post('/api/billing/cancel-subscription/').status_code,400)
        bank.assert_not_called()

    def test_config_sandbox_allowlist_does_not_include_other_companies(self):
        with override_settings(STORE_BILLING_ENVIRONMENT='Production',STORE_SANDBOX_COMPANY_IDS=[str(self.company.pk)]):
            self.assertEqual(gateway.environment(self.company.pk),'Sandbox')
            self.assertEqual(gateway.environment(self.company.pk+1),'Production')

    @patch('payments.store_gateway.verify')
    def test_refunding_old_month_preserves_later_paid_month_and_free_quota(self, provider):
        from datetime import datetime, timezone as utc
        from payments.models import BillingSubscription
        self.company.free_offers_remaining = 20; self.company.save()
        provider.return_value = self.purchase('29.00')
        with patch('payments.billing.timezone.now', return_value=datetime(2026, 10, 1, tzinfo=utc.utc)):
            first = self.prepare(code='standard', amount='29.00')
            self.assertEqual(self.verify(first, 'first-month').status_code, 200)
        with patch('payments.billing.timezone.now', return_value=datetime(2026, 11, 1, tzinfo=utc.utc)):
            second = self.prepare(code='standard', amount='29.00')
            self.assertEqual(self.verify(second, 'second-month').status_code, 200)
        provider.side_effect = gateway.StoreRevoked('Refunded old month')
        with patch('payments.billing.timezone.now', return_value=datetime(2026, 11, 5, tzinfo=utc.utc)):
            self.assertEqual(self.verify(first, 'first-month').status_code, 409)
            self.assertIsNone(BillingSubscription.objects.get().ends_at)
            self.assertEqual(available_period(self.company).number, 1)
            self.assertEqual(available_period(self.company).monthly_offers, 10)
            self.assertEqual(self.verify(second, 'second-month').status_code, 409)
            self.assertIsNone(available_period(self.company))
        self.company.refresh_from_db(); self.assertEqual(self.company.free_offers_remaining, 20)


class GoogleGatewayTests(SimpleTestCase):
    @override_settings(STORE_BILLING_ENABLED=True,STORE_GOOGLE_CREDENTIALS_JSON='{}')
    @patch('payments.store_gateway.google_session')
    def test_google_validates_binding_paid_state_real_amount_and_test_environment(self, factory):
        checkout=MagicMock(pk=uuid4(),product_id=gateway.PRODUCTS['offers_3'],environment='Sandbox',platform='android')
        purchase={'obfuscatedExternalAccountId':str(checkout.pk),'quantity':1,'purchaseType':0,'purchaseState':0,
            'orderId':'GPA.1234-5678-9012-34567','productId':checkout.product_id,'consumptionState':0}
        order={'purchaseToken':'synthetic-token','state':'PROCESSED','total':{'units':'19','nanos':950000000,'currencyCode':'EUR'}}
        session=factory.return_value.__enter__.return_value
        first=MagicMock(status_code=200);first.json.return_value=purchase
        second=MagicMock(status_code=200);second.json.return_value=order
        session.get.side_effect=[first,second]
        self.assertEqual(gateway.google_transaction(checkout,'synthetic-token').amount,Decimal('19.95'))
        purchase['obfuscatedExternalAccountId']='another-account';session.get.side_effect=[first]
        with self.assertRaises(gateway.StoreError):gateway.google_transaction(checkout,'synthetic-token')
        purchase['obfuscatedExternalAccountId']=str(checkout.pk);purchase['purchaseState']=2;session.get.side_effect=[first]
        with self.assertRaises(gateway.StorePending):gateway.google_transaction(checkout,'synthetic-token')

    def test_invalid_apple_reference_is_rejected_before_any_http_request(self):
        with patch('payments.store_gateway.requests.get') as http:
            with self.assertRaises(gateway.StoreError):gateway.apple_transaction(MagicMock(),'https://malicious.test/')
        http.assert_not_called()


from rest_framework.test import APITransactionTestCase


@override_settings(STORE_BILLING_ENABLED=True,STORE_BILLING_ENVIRONMENT='Sandbox',
    STORE_APPLE_KEY_ID='synthetic',STORE_APPLE_ISSUER_ID='synthetic',STORE_APPLE_PRIVATE_KEY='synthetic')
class StoreConcurrencyTests(BillingFixture,APITransactionTestCase):
    def race(self, jobs):
        from payments.test_launch import BillingConcurrencyTests
        return BillingConcurrencyTests.race(self,jobs)

    def test_simultaneous_preparation_reuses_one_charge_and_store_intent(self):
        body=StoreBillingTests.body(self)
        action=lambda client:client.post('/api/billing/store-prepare/',body,format='json')
        results=self.race([(self.user.pk,action),(self.user.pk,action)])
        self.assertEqual([r[0] for r in results],[200,200],results)
        self.assertEqual(results[0][1]['id'],results[1][1]['id'])
        self.assertEqual(PlatformCharge.objects.count(),1)
        self.assertEqual(StoreCheckout.objects.count(),1)

    @patch('payments.store_gateway.verify',return_value=gateway.VerifiedPurchase(Decimal('19.95'),'EUR','Sandbox'))
    def test_simultaneous_delivery_grants_three_not_six(self, provider):
        intent=self.client.post('/api/billing/store-prepare/',StoreBillingTests.body(self),format='json').data
        action=lambda client:client.post('/api/billing/store-verify/',{'id':intent['id'],'reference':'synthetic-transaction'},format='json')
        results=self.race([(self.user.pk,action),(self.user.pk,action)])
        self.assertEqual([r[0] for r in results],[200,200],results)
        self.assertEqual(pack_remaining(self.company),3)


class AppleProductBindingTests(SimpleTestCase):
    @override_settings(STORE_APPLE_PRIVATE_KEY="unused", STORE_APPLE_KEY_ID="test", STORE_APPLE_ISSUER_ID="test")
    @patch("payments.store_gateway.jwt.encode", return_value="synthetic-jwt")
    @patch("payments.store_gateway.requests.get")
    @patch("appstoreserverlibrary.signed_data_verifier.SignedDataVerifier")
    def test_only_matching_account_quantity_product_and_purchase_type_are_delivered(self, verifier, http, token):
        from types import SimpleNamespace
        checkout = SimpleNamespace(pk=uuid4(), product_id=gateway.PRODUCTS["offers_3"], environment="Sandbox")
        def payload(**changes):
            data = dict(transactionId="12345", productId=checkout.product_id, appAccountToken=str(checkout.pk), quantity=1,
                        revocationDate=None, type=SimpleNamespace(value="Consumable"), price=19950, currency="EUR")
            data.update(changes)
            return SimpleNamespace(**data)
        http.return_value.status_code = 200
        http.return_value.json.return_value = {"signedTransactionInfo": "synthetic-jws-boundary-fixture"}
        decoded = verifier.return_value.verify_and_decode_signed_transaction
        decoded.return_value = payload()
        self.assertEqual(gateway.apple_transaction(checkout, "12345").amount, Decimal("19.95"))
        self.assertEqual(http.call_args.args[0], "https://api.storekit-sandbox.apple.com/inApps/v1/transactions/12345")
        for change in ({"appAccountToken": str(uuid4())}, {"transactionId": "54321"}, {"quantity": 2},
                       {"productId": "another.app.product"}, {"type": SimpleNamespace(value="Non-Renewing Subscription")}):
            decoded.return_value = payload(**change)
            with self.assertRaises(gateway.StoreError): gateway.apple_transaction(checkout, "12345")
        checkout.product_id = gateway.PRODUCTS["standard"]
        decoded.return_value = payload(type=SimpleNamespace(value="Consumable"))
        with self.assertRaises(gateway.StoreError): gateway.apple_transaction(checkout, "12345")
        decoded.return_value = payload(type=SimpleNamespace(value="Non-Renewing Subscription"), price=29000)
        self.assertEqual(gateway.apple_transaction(checkout, "12345").amount, Decimal("29"))
        decoded.return_value = payload(type=SimpleNamespace(value="Non-Renewing Subscription"), revocationDate=1)
        with self.assertRaises(gateway.StoreRevoked): gateway.apple_transaction(checkout, "12345")
