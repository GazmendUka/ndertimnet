from datetime import datetime, timezone as utc
from decimal import Decimal
from unittest.mock import patch
from django.db import transaction
from django.test import override_settings
from rest_framework.test import APITestCase
from payments.test_billing import BillingFixture
from payments.models import BillingSubscription, PlatformCharge, PlatformCheckout, SubscriptionPlanChange
from payments.billing import ensure_periods, settle_charge, subscription_overview
from payments.pricing import get_subscription_plan
from payments.agreements import VERSION


@override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID='merchant', RAIACCEPT_SANDBOX_USERNAME='test', RAIACCEPT_SANDBOX_PASSWORD='test')
class SubscriptionPricingTests(BillingFixture, APITestCase):
    def sub(self, code='standard', start=None):
        plan = get_subscription_plan(code)
        sub = BillingSubscription.objects.create(company=self.company, plan_code=code, monthly_price=plan.price_at(), monthly_offers=plan.offers_per_month, terms_version=VERSION)
        period = ensure_periods(sub)
        if start:
            with patch('payments.billing.timezone.now', return_value=start):
                settle_charge(period.charge)
            sub.refresh_from_db()
        return sub

    def send(self):
        return self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})

    def test_catalog_prices_and_stockholm_midnight(self):
        before = datetime(2026, 12, 31, 22, 59, tzinfo=utc.utc)
        after = datetime(2026, 12, 31, 23, 0, tzinfo=utc.utc)
        for code, intro, regular in [('standard', '29.00', '49.00'), ('pro', '59.00', '79.00')]:
            plan = get_subscription_plan(code)
            self.assertEqual(plan.price_at(before), Decimal(intro))
            self.assertEqual(plan.price_at(after), Decimal(regular))
        data = self.client.get('/api/billing/catalog/').data
        self.assertEqual([p['offers'] for p in data['plans']], [10, 30])
        self.assertEqual(data['notice_months'], 0)
        self.assertFalse(data['offer']['per_offer_payment'])

    def test_no_subscription_cannot_send_or_pay_per_offer(self):
        self.assertEqual(self.send().data['code'], 'subscription_quota_required')
        self.assertEqual(self.client.post('/api/billing/offer-checkout/', {'offer': self.offer.pk, 'platform': 'web'}).status_code, 409)
        self.assertFalse(PlatformCheckout.objects.exists())

    def test_direct_old_charge_cannot_start_new_payment(self):
        charge = PlatformCharge.objects.create(payer=self.user, company=self.company, offer=self.offer, kind='offer_fee', amount='19.95', regular_amount='19.95')
        result = self.client.post(f'/api/billing/{charge.pk}/checkout/', {'platform': 'web'})
        self.assertEqual(result.status_code, 410)
        self.assertFalse(PlatformCheckout.objects.exists())

    def test_first_payment_consumes_quota_once_revisions_included(self):
        sub = self.sub(start=datetime(2026, 10, 5, tzinfo=utc.utc))
        self.assertEqual(self.send().status_code, 200)
        self.assertEqual(self.send().status_code, 400)
        self.assertEqual(self.client.patch(f'/api/offers/{self.offer.pk}/', {'price_amount': '5000'}, format='json').status_code, 200)
        self.assertEqual(self.send().status_code, 200)
        period = sub.periods.get(number=0)
        self.assertEqual(period.offers_used, 1)
        self.assertEqual(period.monthly_offers, 10)
        self.assertEqual(PlatformCharge.objects.get(offer=self.offer).amount, 0)

    def test_full_quota_blocks_send_without_bank_attempt(self):
        sub = self.sub(start=datetime(2026, 10, 5, tzinfo=utc.utc))
        sub.periods.update(offers_used=10)
        self.assertEqual(self.send().data['code'], 'subscription_quota_required')
        self.assertFalse(PlatformCheckout.objects.exists())

    def test_renewal_switches_prices_preserving_paid_period(self):
        start = datetime(2026, 12, 15, 12, tzinfo=utc.utc)
        with patch('payments.billing.timezone.now', return_value=start):
            sub = self.sub(start=start)
        first = sub.periods.get(number=0).charge
        self.assertEqual(first.amount, Decimal('29.00'))
        ensure_periods(sub, datetime(2027, 1, 15, 12, tzinfo=utc.utc))
        self.assertEqual(sub.periods.get(number=1).charge.amount, Decimal('49.00'))
        first.refresh_from_db()
        self.assertEqual(first.amount, Decimal('29.00'))
        self.assertEqual(first.status, 'paid')

    def test_cancel_stops_at_current_boundary(self):
        sub = self.sub(start=datetime(2026, 10, 1, tzinfo=utc.utc))
        response = self.client.post('/api/billing/cancel-subscription/')
        self.assertEqual(response.status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.ends_at, datetime(2026, 11, 1, tzinfo=utc.utc))
        ensure_periods(sub, datetime(2027, 2, 1, tzinfo=utc.utc))
        self.assertEqual(sub.periods.count(), 1)

    def test_plan_change_deferred_with_consent_and_period_snapshots(self):
        sub = self.sub(start=datetime(2026, 10, 1, tzinfo=utc.utc))
        body = {'plan': 'pro', 'signer_name': 'Test Person', 'terms_version': VERSION, 'accept_notice': True}
        self.assertEqual(self.client.post('/api/billing/change-plan/', {**body, 'accept_notice': False}).status_code, 400)
        self.assertEqual(self.client.post('/api/billing/change-plan/', body, format='json').status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.plan_code, 'standard')
        self.assertEqual(sub.pending_plan_code, 'pro')
        self.assertEqual(SubscriptionPlanChange.objects.count(), 1)
        self.assertEqual(self.client.post('/api/billing/change-plan/', body, format='json').status_code, 200)
        self.assertEqual(SubscriptionPlanChange.objects.count(), 1)
        with patch('payments.billing.timezone.now', return_value=datetime(2026, 11, 1, tzinfo=utc.utc)):
            ensure_periods(sub)
        self.assertEqual(sub.plan_code, 'pro')
        self.assertEqual(sub.periods.get(number=0).monthly_offers, 10)
        self.assertEqual(sub.periods.get(number=1).monthly_offers, 30)
        self.assertEqual(sub.periods.get(number=1).charge.amount, Decimal('59.00'))

    def test_archived_paid_offer_revisions_no_new_fee(self):
        self.paid_offer_charge()
        self.version.price_amount = Decimal('9000')
        self.version.save()
        quote = self.client.get('/api/billing/offer-quote/', {'offer': self.offer.pk}).data
        self.assertTrue(quote['paid'])
        self.assertFalse(quote['adjustment'])
        self.assertEqual(self.send().status_code, 200)

    def test_pending_historical_payment_blocks_free_double_send(self):
        charge = PlatformCharge.objects.create(payer=self.user, company=self.company, offer=self.offer, kind='offer_fee', amount='19.95', regular_amount='19.95')
        PlatformCheckout.objects.create(charge=charge, amount=charge.amount)
        self.company.free_offers_remaining = 2
        self.company.save()
        self.assertEqual(self.send().data['code'], 'payment_pending')
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 2)

    @patch('payments.billing_views.create_checkout', return_value={'order_id': 'new-order', 'payment_url': 'https://bank.test/checkout'})
    def test_subscribe_uses_server_price_and_new_terms(self, bank):
        result = self.client.post('/api/billing/subscribe/', {'plan': 'pro', 'signer_name': 'Test Person', 'terms_version': VERSION, 'accept_notice': True, 'platform': 'web', 'amount': '0.01'}, format='json')
        self.assertEqual(result.status_code, 202)
        self.assertEqual(result.data['charge']['amount'], '59.00')
        self.assertIn('Pa afat detyrues', BillingSubscription.objects.get().agreement.text)

    def test_migration_preserves_paid_history_and_increases_future_quota(self):
        from importlib import import_module
        from django.apps import apps
        from django.db import connection
        from payments.models import BillingPeriod, SubscriptionAgreement
        sub = BillingSubscription.objects.create(company=self.company, plan_code='offers_3', monthly_price='39.95', monthly_offers=3, started_at=datetime(2026, 10, 1, tzinfo=utc.utc))
        period = BillingPeriod.objects.create(subscription=sub, number=0, starts_at=sub.started_at, ends_at=datetime(2026, 11, 1, tzinfo=utc.utc), offers_used=2)
        charge = PlatformCharge.objects.create(payer=self.user, company=self.company, period=period, kind='subscription', amount='39.95', regular_amount='39.95', status='paid')
        agreement = SubscriptionAgreement.objects.create(subscription=sub, signed_by=self.user, signer_name='Previous Person', company_name='Test', text='Original signed contract', version='old', sha256='oldhash')
        migration = import_module('payments.migrations.0012_standard_pro')
        migration.migrate_plans(apps, connection.schema_editor())
        sub.refresh_from_db(); period.refresh_from_db(); charge.refresh_from_db(); agreement.refresh_from_db()
        self.assertEqual(sub.plan_code, 'standard')
        self.assertEqual(sub.monthly_offers, 10)
        self.assertEqual(period.monthly_offers, 3)
        self.assertEqual(period.offers_used, 2)
        self.assertEqual(charge.amount, Decimal('39.95'))
        self.assertEqual(agreement.text, 'Original signed contract')
        ensure_periods(sub, datetime(2026, 11, 1, tzinfo=utc.utc))
        new = sub.periods.get(number=1)
        self.assertEqual(new.monthly_offers, 10)
        self.assertEqual(new.charge.amount, Decimal('29.00'))

    def test_new_companies_receive_no_automatic_trial(self):
        from accounts.models import Company, User
        user = User.objects.create_user(email='new@example.test', role='company')
        company = Company.objects.create(user=user, company_name='New')
        self.assertEqual(company.free_offers_remaining, 0)

    @patch('payments.billing_views.create_checkout', return_value={'order_id': 'boundary-order', 'payment_url': 'https://bank.test/checkout'})
    def test_unstarted_checkout_reprices_after_introductory_deadline(self, bank):
        before = datetime(2026, 12, 31, 12, tzinfo=utc.utc)
        after = datetime(2027, 1, 1, 12, tzinfo=utc.utc)
        with patch('payments.billing.timezone.now', return_value=before):
            sub = self.sub()
        charge = sub.periods.get().charge
        self.assertEqual(charge.amount, Decimal('29.00'))
        with patch('payments.billing_views.timezone.now', return_value=after):
            result = self.client.post(f'/api/billing/{charge.pk}/checkout/', {'platform': 'web'}, format='json')
        self.assertEqual(result.status_code, 202)
        self.assertEqual(result.data['charge']['amount'], '49.00')
