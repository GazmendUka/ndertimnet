from decimal import Decimal
from uuid import uuid4
from unittest.mock import patch
from django.db import transaction
from django.test import override_settings
from rest_framework.test import APITestCase
from payments.test_billing import BillingFixture
from payments.models import OfferPackPurchase, PlatformCharge, PlatformCheckout
from payments.offer_packs import PACK_TERMS_VERSION, PACK_TERMS, pack_remaining
from payments.billing import authorize_offer_send, settle_charge, subscription_overview


@override_settings(RAIACCEPT_MODE='sandbox', RAIACCEPT_MERCHANT_ACCOUNT_ID='merchant', RAIACCEPT_SANDBOX_USERNAME='synthetic', RAIACCEPT_SANDBOX_PASSWORD='synthetic')
class OfferPackTests(BillingFixture, APITestCase):
    def body(self):
        return dict(signer_name='Test Person', terms_version=PACK_TERMS_VERSION,
                    purchase_key=str(uuid4()), accept_notice=True, platform='web', amount='0.01')

    @patch('payments.billing_views.create_checkout', return_value={'order_id': 'pack-order', 'payment_url': 'https://bank.test/checkout'})
    def test_price_consent_and_idempotent_purchase(self, bank):
        body = self.body()
        result = self.client.post('/api/billing/buy-offer-pack/', body, format='json')
        self.assertEqual(result.status_code, 202, result.data)
        self.assertEqual(result.data['charge']['amount'], '19.95')
        self.assertEqual(OfferPackPurchase.objects.get().offers, 3)
        self.assertEqual(pack_remaining(self.company), 0)
        self.client.post('/api/billing/buy-offer-pack/', body, format='json')
        self.assertEqual(bank.call_count, 1)
        self.assertEqual(PlatformCharge.objects.filter(kind='offer_pack').count(), 1)
        charge = PlatformCharge.objects.get(kind='offer_pack')
        with transaction.atomic():
            settle_charge(charge)
            settle_charge(charge)
        self.assertEqual(pack_remaining(self.company), 3)
        self.client.post('/api/billing/buy-offer-pack/', body, format='json')
        self.assertEqual(OfferPackPurchase.objects.count(), 1)
        self.assertEqual(bank.call_count, 1)

    def test_consent_native_and_bank_guards(self):
        for changes in ({'accept_notice': False}, {'terms_version': 'old'}, {'purchase_key': 'bad'}, {'signer_name': ''}):
            response = self.client.post('/api/billing/buy-offer-pack/', {**self.body(), **changes}, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post('/api/billing/buy-offer-pack/', {**self.body(), 'platform': 'ios'}, format='json').status_code, 400)
        with override_settings(RAIACCEPT_SANDBOX_PASSWORD=''):
            self.assertEqual(self.client.post('/api/billing/buy-offer-pack/', self.body(), format='json').status_code, 503)
        self.assertFalse(OfferPackPurchase.objects.exists())

    def pack(self):
        charge = PlatformCharge.objects.create(payer=self.user, company=self.company, kind='offer_pack', amount='19.95', regular_amount='19.95', status='paid')
        return OfferPackPurchase.objects.create(charge=charge, purchase_key=uuid4(), signer_name='Test Person', terms_version=PACK_TERMS_VERSION, terms_text=PACK_TERMS)

    def test_consumed_once_and_not_on_revision(self):
        pack = self.pack()
        with transaction.atomic():
            authorize_offer_send(self.offer, self.user)
            authorize_offer_send(self.offer, self.user)
        pack.refresh_from_db()
        self.assertEqual(pack.offers_used, 1)
        self.assertEqual(PlatformCharge.objects.get(offer=self.offer).included_in_pack_id, pack.pk)
        self.assertEqual(pack_remaining(self.company), 2)
        self.assertEqual(subscription_overview(self.company)['purchased_offers_remaining'], 2)

    def test_monthly_quota_and_free_offers_used_before_nonexpiring_pack(self):
        pack = self.pack()
        self.active_subscription()
        with transaction.atomic():
            authorize_offer_send(self.offer, self.user)
        pack.refresh_from_db()
        self.assertEqual(pack.offers_used, 0)

    def test_pack_does_not_expire_and_balance_is_private(self):
        from datetime import datetime, timezone
        pack = self.pack()
        OfferPackPurchase.objects.filter(pk=pack.pk).update(signed_at=datetime(2000, 1, 1, tzinfo=timezone.utc))
        self.assertEqual(pack_remaining(self.company), 3)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(f'/api/billing/{pack.charge_id}/checkout/', {'platform': 'web'}).status_code, 404)
        self.assertEqual(self.client.get('/api/billing/offer-pack-terms/').status_code, 403)

    def test_exhausted_or_unpaid_pack_does_not_unlock_offer(self):
        pack = self.pack()
        pack.offers_used = 3; pack.save()
        quote = self.client.get('/api/billing/offer-quote/', {'offer': self.offer.pk}).data
        self.assertTrue(quote['subscription_required'])
        self.assertEqual(quote['purchased_offers_remaining'], 0)
        pack.offers_used = 0; pack.save()
        pack.charge.status = 'pending'; pack.charge.save()
        self.assertEqual(pack_remaining(self.company), 0)

    @patch('payments.billing_views.create_checkout', return_value={'order_id': 'standard-order', 'payment_url': 'https://bank.test/checkout'})
    def test_standard_checkout_really_charges_29(self, bank):
        from payments.agreements import VERSION
        result = self.client.post('/api/billing/subscribe/', dict(plan='standard', signer_name='Test Person', accept_notice=True, terms_version=VERSION, platform='web'), format='json')
        self.assertEqual(result.status_code, 202)
        self.assertEqual(result.data['charge']['amount'], '29.00')
        self.assertEqual(bank.call_args.args[0]['invoice']['amount'], 29.0)

    @patch('payments.billing_views.get_transaction_details')
    def test_verified_callback_grants_pack_once_and_wrong_amount_never_grants(self, details):
        pack = self.pack()
        charge = pack.charge; charge.status = 'pending'; charge.save()
        PlatformCheckout.objects.create(charge=charge, amount='19.95', order_id='pack-order')
        payload = {'order': {'orderIdentification': 'pack-order'}, 'transaction': {'transactionId': 'pack-tx'}}
        details.return_value = {'merchant': {'merchantAccountId': 'merchant'}, 'transaction': {'transactionId': 'pack-tx', 'transactionType': 'PURCHASE', 'transactionAmount': '0.01', 'transactionCurrency': 'EUR', 'isProduction': False, 'statusCode': '0000', 'status': 'SUCCESS'}}
        self.assertEqual(self.client.post('/api/billing/notify/', payload, format='json').status_code, 409)
        self.assertEqual(pack_remaining(self.company), 0)
        details.return_value['transaction']['transactionAmount'] = '19.95'
        self.assertEqual(self.client.post('/api/billing/notify/', payload, format='json').status_code, 200)
        self.assertEqual(self.client.post('/api/billing/notify/', payload, format='json').status_code, 200)
        self.assertEqual(pack_remaining(self.company), 3)
        self.assertEqual(OfferPackPurchase.objects.count(), 1)

from django.db import connection
from unittest import skipUnless
from rest_framework.test import APITransactionTestCase
from payments.test_launch import BillingConcurrencyTests


@skipUnless(connection.vendor == 'postgresql', 'Requires PostgreSQL row locks')
@override_settings(RAIACCEPT_MODE='sandbox', RAIACCEPT_MERCHANT_ACCOUNT_ID='merchant', RAIACCEPT_SANDBOX_USERNAME='synthetic', RAIACCEPT_SANDBOX_PASSWORD='synthetic')
class OfferPackConcurrencyTests(BillingFixture, APITransactionTestCase):
    race = BillingConcurrencyTests.race

    @patch('payments.billing_views.create_checkout', side_effect=BillingConcurrencyTests.bank)
    def test_simultaneous_purchase_creates_one_order(self, bank):
        body = dict(signer_name='Test Person', terms_version=PACK_TERMS_VERSION, purchase_key=str(uuid4()), accept_notice=True, platform='web')
        action = lambda c: c.post('/api/billing/buy-offer-pack/', body, format='json')
        results = self.race([(self.user.pk, action), (self.user.pk, action)])
        self.assertTrue(all(status in (202, 409) for status, _ in results), results)
        self.assertIn(202, [status for status, _ in results])
        self.assertEqual(OfferPackPurchase.objects.count(), 1)
        self.assertEqual(PlatformCheckout.objects.count(), 1)
        self.assertEqual(bank.call_count, 1)

    @patch('offers.views.schedule_push_notification')
    def test_last_purchased_offer_cannot_be_used_twice(self, push):
        from jobrequests.models import JobRequest
        from offers.models import Offer, OfferVersion
        pack = OfferPackTests.pack(self)
        pack.offers_used = 2; pack.save()
        job = JobRequest.objects.create(customer=self.customer, city=self.city, title='Second pack test')
        offer = Offer.objects.create(company=self.company, job_request=job)
        version = OfferVersion.objects.create(offer=offer, version_number=1, price_amount='1000')
        offer.current_version = version; offer.save()
        results = self.race([(self.user.pk, lambda c: c.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})), (self.user.pk, lambda c: c.post(f'/api/offers/{offer.pk}/sign/', {'personal_number': '1234'}))])
        self.assertEqual(sorted(status for status, _ in results), [200, 400], results)
        pack.refresh_from_db(); self.assertEqual(pack.offers_used, 3)
