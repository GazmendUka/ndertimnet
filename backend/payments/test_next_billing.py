from decimal import Decimal
from unittest.mock import patch
from django.test import override_settings
from django.db import transaction
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User, Company, Customer
from offers.models import Offer, OfferVersion
from payments.test_billing import BillingFixture
from payments.models import PlatformCharge, PlatformCheckout, SubscriptionAgreement, BillingSubscription
from payments.billing import validate_offer_price, offer_billing_state, settle_charge


@override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID="merchant", RAIACCEPT_SANDBOX_USERNAME="test", RAIACCEPT_SANDBOX_PASSWORD="test", RAIACCEPT_MODE="sandbox")
class BillingRulesTests(BillingFixture, APITestCase):
    def sign(self):
        with self.captureOnCommitCallbacks(execute=False):
            return self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})

    def test_hourly_price_requires_hours_and_uses_server_calculated_total(self):
        self.version.price_type = 'hourly'; self.version.price_amount = Decimal('30'); self.version.save()
        self.assertEqual(self.client.get('/api/billing/offer-quote/', {'offer': self.offer.pk}).status_code, 400)
        r = self.client.patch(f'/api/offers/{self.offer.pk}/', {'estimated_hours': '40', 'estimated_total': '1'})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['current_version']['estimated_total'], '1200.00')
        state = self.client.get('/api/billing/offer-quote/', {'offer': self.offer.pk}).data
        self.assertEqual(state['fee'], '12.95')
        self.assertEqual(self.client.patch(f'/api/offers/{self.offer.pk}/', {'estimated_hours': '-2'}).status_code, 400)

    def other_offer(self):
        user = User.objects.create_user(email='other@example.test', password='test', role='company')
        company = Company.objects.create(user=user, company_name='Other')
        offer = Offer.objects.create(company=company, job_request=self.job)
        v = OfferVersion.objects.create(offer=offer, version_number=1, price_amount='100')
        offer.current_version=v;offer.save()
        return offer

    @patch('payments.billing_views.create_checkout')
    def test_full_capacity_blocks_before_any_bank_call_or_free_quota_spend(self, bank):
        self.job.max_offers=1;self.job.save()
        other=self.other_offer();v=other.current_version;v.is_signed=True;v.save()
        r=self.client.post('/api/billing/offer-checkout/', {'offer': self.offer.pk, 'platform':'web'})
        self.assertEqual(r.status_code,400,r.data)
        self.assertEqual(r.data['code'],'offer_limit_reached');bank.assert_not_called()
        self.company.free_offers_remaining=25;self.company.save()
        self.assertEqual(self.sign().status_code,400)
        self.company.refresh_from_db();self.assertEqual(self.company.free_offers_remaining,25)
        self.job.max_offers=6;self.job.save()
        self.assertEqual(self.sign().status_code,200)

    def test_pending_payment_reserves_place_until_verified_failed(self):
        self.job.max_offers=1;self.job.save()
        other=self.other_offer()
        c=PlatformCharge.objects.create(offer=other,company=other.company,payer=other.company.user,kind='offer_fee',regular_amount='2.95',amount='2.95')
        a=PlatformCheckout.objects.create(charge=c,amount='2.95')
        self.company.free_offers_remaining=25;self.company.save()
        self.assertEqual(self.sign().data['code'],'offer_limit_reached')
        a.status='failed';a.save();c.status='failed';c.save()
        self.assertEqual(self.sign().status_code,200)

    def test_paid_reservation_and_revisions_keep_their_place(self):
        self.job.max_offers=1;self.job.save();self.paid_offer_charge()
        self.assertEqual(self.sign().status_code,200)
        self.assertEqual(self.client.patch(f'/api/offers/{self.offer.pk}/', {'includes_text':'Updated scope'}).status_code,200)
        self.job.refresh_from_db();self.assertEqual(self.job.offers_count,1)
        self.assertEqual(self.sign().status_code,200)

    def test_unilateral_price_reporting_is_retired(self):
        r = self.client.post('/api/billing/report-offer-price/', {'offer': self.offer.pk, 'total': '500'})
        self.assertEqual(r.status_code, 410)
        self.assertFalse(self.offer.price_reports.exists())

    @patch('payments.billing_views.create_checkout', return_value={'order_id':'contract','payment_url':'https://bank.test/checkout'})
    def test_contract_requires_signature_and_is_immutable_and_owner_only(self, bank):
        data={'plan':'offers_3','platform':'web','accept_notice':True}
        self.assertEqual(self.client.post('/api/billing/subscribe/',data,format='json').status_code,400)
        terms=self.client.get('/api/billing/subscription-terms/',{'plan':'offers_3'}).data
        data.update(signer_name='Test Person',terms_version=terms['version'])
        self.assertEqual(self.client.post('/api/billing/subscribe/',data,format='json').status_code,202)
        a=SubscriptionAgreement.objects.get();self.assertEqual(a.text,terms['text'])
        original=a.sha256;data['signer_name']='Changed'
        self.client.post('/api/billing/subscribe/',data,format='json')
        a.refresh_from_db();self.assertEqual(a.signer_name,'Test Person');self.assertEqual(a.sha256,original)
        sub=a.subscription;sub.started_at=timezone.now();sub.save()
        self.assertEqual(self.client.post('/api/billing/cancel-subscription/').status_code,200)
        self.assertEqual(len(self.client.get('/api/billing/subscription/').data['agreements']),1)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get('/api/billing/subscription/').status_code,403)
