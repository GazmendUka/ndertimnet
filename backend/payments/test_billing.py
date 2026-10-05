from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from unittest.mock import patch
from django.test import override_settings
from django.db import transaction
from rest_framework.test import APITestCase
from rest_framework.exceptions import ValidationError
from accounts.models import User, Company
from jobrequests.models import JobRequest
from offers.models import Offer, OfferVersion
from locations.models import City
from taxonomy.models import Profession
from payments.models import PlatformCharge, PlatformCheckout, BillingSubscription, PaymentStatus
from payments.billing import (add_months, create_publication_charge, ensure_periods,
                              authorize_offer_send, settle_charge, available_period)


class BillingFixture:
    def setUp(self):
        self.user = User.objects.create_user(email='company@example.test', password='test', role='company', email_verified=True)
        self.company = Company.objects.create(user=self.user, company_name='Test', profile_step=4,
                       description='Builder', phone='123456', website='https://example.test', free_leads_remaining=25, free_offers_remaining=0)
        self.city = City.objects.create(name='Prishtina', slug='prishtina', country='XK')
        self.profession = Profession.objects.create(name='Build', slug='build')
        self.company.city = self.city
        self.company.save()
        self.company.professions.add(self.profession)
        self.customer = User.objects.create_user(email='customer@example.test', password='test', role='customer', email_verified=True)
        self.job = JobRequest.objects.create(customer=self.customer, title='Build', description='Build a room', city=self.city, profession=self.profession)
        self.offer = Offer.objects.create(company=self.company, job_request=self.job, lead_unlocked=True)
        self.version = OfferVersion.objects.create(offer=self.offer, version_number=1, price_amount=Decimal('1950'), currency='EUR', created_by=self.user)
        self.offer.current_version = self.version
        self.offer.save()
        self.client.force_authenticate(self.user)

    def paid_offer_charge(self):
        return PlatformCharge.objects.create(payer=self.user, company=self.company, offer=self.offer,
            kind='offer_fee', regular_amount='19.95', amount='19.95', quoted_price='1950', status='paid')

    def active_subscription(self):
        sub = BillingSubscription.objects.create(company=self.company, plan_code='standard', monthly_price='29.00', monthly_offers=10)
        period = ensure_periods(sub)
        settle_charge(period.charge)
        sub.refresh_from_db()
        return sub



@override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID="merchant", RAIACCEPT_SANDBOX_USERNAME="test", RAIACCEPT_SANDBOX_PASSWORD="test", RAIACCEPT_MODE="sandbox")
class PlatformBillingTests(BillingFixture, APITestCase):
    def test_send_requires_payment_and_does_not_sign(self):
        r = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data['code'], 'subscription_quota_required')
        self.version.refresh_from_db()
        self.assertFalse(self.version.is_signed)

    def test_paid_offer_can_be_sent(self):
        charge = self.paid_offer_charge()
        with self.captureOnCommitCallbacks(execute=False):
            r = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})
        self.assertEqual(r.status_code, 200, r.data)
        self.version.refresh_from_db()
        self.assertTrue(self.version.is_signed)
        charge.refresh_from_db()
        self.assertIsNotNone(charge.fulfilled_at)

    def test_subscription_consumed_once(self):
        sub = self.active_subscription()
        with transaction.atomic():
            authorize_offer_send(self.offer, self.user)
            authorize_offer_send(self.offer, self.user)
        self.assertEqual(sub.periods.get(number=0).offers_used, 1)
        self.assertEqual(PlatformCharge.objects.get(offer=self.offer).amount, Decimal('0'))

    def test_quota_exhaustion_requires_renewal(self):
        sub = self.active_subscription()
        sub.periods.update(offers_used=10)
        self.assertIsNone(available_period(self.company))
        r = self.client.get('/api/billing/offer-quote/', {'offer': self.offer.pk})
        self.assertFalse(r.data['included'])
        self.assertEqual(r.data['fee'], '0.00')
        self.assertTrue(r.data['subscription_required'])

    def test_no_quota_rollover_and_unpaid_renewal_blocks_quota(self):
        sub = self.active_subscription()
        future = add_months(sub.started_at, 1)
        with patch('payments.billing.timezone.now', return_value=future):
            period = ensure_periods(sub)
            self.assertEqual(period.number, 1)
            self.assertEqual(period.offers_used, 0)
            self.assertIsNone(available_period(self.company))
            settle_charge(period.charge)
            self.assertIsNotNone(available_period(self.company))

    def test_cancel_ends_at_current_month_without_notice(self):
        sub = self.active_subscription()
        r = self.client.post('/api/billing/cancel-subscription/')
        self.assertEqual(r.status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.ends_at, add_months(sub.started_at, 1))
        first_end = sub.ends_at
        self.client.post('/api/billing/cancel-subscription/')
        sub.refresh_from_db()
        self.assertEqual(first_end, sub.ends_at)
        ensure_periods(sub, sub.ends_at)
        self.assertEqual(sub.periods.count(), 1)

    def test_calendar_anchor(self):
        jan = datetime(2028, 1, 31, tzinfo=dt_timezone.utc)
        self.assertEqual(add_months(jan, 1).day, 29)
        self.assertEqual(add_months(jan, 2).day, 31)

    def test_listing_introductory_charge_idempotent(self):
        a = create_publication_charge(self.job)
        b = create_publication_charge(self.job)
        self.assertEqual(a.pk, b.pk)
        self.assertEqual(a.amount, Decimal('0'))
        self.assertEqual(a.discount_amount, Decimal('3.95'))
        self.assertEqual(a.status, 'paid')

    @override_settings(LISTING_INTRODUCTORY_FREE=False)
    def test_unpaid_listing_cannot_be_published(self):
        from django.core.exceptions import ValidationError
        c = create_publication_charge(self.job)
        with self.assertRaises(ValidationError):
            self.job.apply_moderation('approved')
        settle_charge(c)
        self.job.apply_moderation('approved')
        self.assertTrue(self.job.is_active)

    def test_native_checkout_blocked(self):
        for platform in ('android', 'ios', None):
            r = self.client.post('/api/billing/subscribe/', {'plan': 'standard', 'platform': platform}, format='json')
            self.assertEqual(r.status_code, 400)
            self.assertEqual(r.data['code'], 'store_billing_required')
        self.assertFalse(PlatformCheckout.objects.exists())

    def test_customer_cannot_edit_or_sign_company_offer(self):
        self.client.force_authenticate(self.customer)
        r = self.client.patch(f'/api/offers/{self.offer.pk}/', {'price_amount': '1'})
        self.assertIn(r.status_code, (403, 404))

    def test_cannot_bypass_payment_by_patching_is_signed(self):
        r = self.client.patch(f'/api/offers/{self.offer.pk}/', {'is_signed': True, 'status': 'signed'})
        self.assertEqual(r.status_code, 200)
        self.version.refresh_from_db()
        self.assertFalse(self.version.is_signed)

    def test_paid_price_cannot_change_before_signing(self):
        self.paid_offer_charge()
        r = self.client.patch(f'/api/offers/{self.offer.pk}/', {'price_amount': '20000'})
        self.assertEqual(r.status_code, 409)

    def test_old_work_payment_is_retired(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post('/api/payments/pay-job/', {'offer': self.offer.pk})
        self.assertEqual(r.status_code, 410)

    def test_opening_draft_does_not_spend_old_free_leads(self):
        r = self.client.post('/api/payments/unlock-lead/', {'job_request': self.job.pk})
        self.assertEqual(r.status_code, 200)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_leads_remaining, 25)

    @patch('payments.billing_views.create_checkout', return_value={'order_id': 'order1', 'payment_url': 'https://bank.test/checkout'})
    def test_checkout_is_reused(self, create):
        from payments.agreements import VERSION
        body = {'plan': 'standard', 'platform': 'web', 'signer_name': 'Test Person', 'accept_notice': True, 'terms_version': VERSION}
        a = self.client.post('/api/billing/subscribe/', body, format='json')
        b = self.client.post('/api/billing/subscribe/', body, format='json')
        self.assertEqual(a.status_code, 202, a.data)
        self.assertEqual(a.data['payment_url'], b.data['payment_url'])
        self.assertEqual(create.call_count, 1)
        self.assertEqual(PlatformCheckout.objects.count(), 1)

    @override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID='merchant', RAIACCEPT_MODE='sandbox')
    @patch('payments.billing_views.get_transaction_details')
    def test_webhook_requires_verified_transaction_and_is_idempotent(self, verify):
        charge = self.paid_offer_charge()
        charge.status = 'pending'; charge.save()
        PlatformCheckout.objects.create(charge=charge, amount='19.95', order_id='order1')
        verify.return_value = {'merchant': {'merchantAccountId': 'merchant'}, 'transaction': {
            'transactionId': 'tx1', 'transactionType': 'PURCHASE', 'transactionAmount': '19.95',
            'transactionCurrency': 'EUR', 'isProduction': False, 'statusCode': '0000', 'status': 'PAID'}}
        payload = {'order': {'orderIdentification': 'order1'}, 'transaction': {'transactionId': 'tx1'}}
        self.client.force_authenticate(None)
        for _ in range(2):
            self.assertEqual(self.client.post('/api/billing/notify/', payload, format='json').status_code, 200)
        charge.refresh_from_db(); self.assertEqual(charge.status, 'paid')
        charge2 = PlatformCharge.objects.create(payer=self.customer, job_request=self.job, kind='listing', regular_amount='19.95', amount='19.95')
        PlatformCheckout.objects.create(charge=charge2, amount='19.95', order_id='order2')
        payload['order']['orderIdentification'] = 'order2'
        self.assertEqual(self.client.post('/api/billing/notify/', payload, format='json').status_code, 409)
        charge2.refresh_from_db(); self.assertEqual(charge2.status, 'pending')

    @override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID='')
    def test_missing_merchant_configuration_does_not_create_bank_attempt(self):
        from payments.agreements import VERSION
        r = self.client.post('/api/billing/subscribe/', {'plan': 'standard', 'platform': 'web', 'signer_name': 'Test Person', 'accept_notice': True, 'terms_version': VERSION}, format='json')
        self.assertEqual(r.status_code, 503)
        self.assertEqual(PlatformCheckout.objects.count(), 0)

    def test_new_billing_history_and_checkout_are_private(self):
        charge = self.paid_offer_charge()
        self.client.force_authenticate(self.customer)
        r = self.client.get('/api/billing/history/')
        self.assertEqual(r.data, [])
        r = self.client.post(f'/api/billing/{charge.pk}/checkout/', {'platform': 'web'})
        self.assertEqual(r.status_code, 404)

    @patch('payments.billing_views.get_transaction_details')
    def test_webhook_rejects_bad_amount_currency_environment_and_merchant(self, verify):
        charge = self.paid_offer_charge()
        charge.status = 'pending'; charge.save()
        PlatformCheckout.objects.create(charge=charge, amount='19.95', order_id='order1')
        base = {'transactionId': 'tx1', 'transactionType': 'PURCHASE', 'transactionAmount': '19.95',
                'transactionCurrency': 'EUR', 'isProduction': False, 'statusCode': '0000', 'status': 'PAID'}
        payload = {'order': {'orderIdentification': 'order1'}, 'transaction': {'transactionId': 'tx1'}}
        for key, value in [('transactionAmount', '0.95'), ('transactionCurrency', 'USD'),
                           ('isProduction', True), ('statusCode', '1234'), ('transactionId', 'other')]:
            with self.subTest(key=key):
                verify.return_value = {'merchant': {'merchantAccountId': 'merchant'}, 'transaction': {**base, key: value}}
                self.assertEqual(self.client.post('/api/billing/notify/', payload, format='json').status_code, 409)
                charge.refresh_from_db(); self.assertEqual(charge.status, 'pending')
        verify.return_value = {'merchant': {'merchantAccountId': 'other'}, 'transaction': base}
        self.assertEqual(self.client.post('/api/billing/notify/', payload, format='json').status_code, 409)

    @patch('payments.billing_views.create_checkout')
    def test_uncertain_checkout_is_not_repeated(self, create):
        from payments.services.raiaccept import RaiAcceptError
        from payments.agreements import VERSION
        create.side_effect = RaiAcceptError('timeout')
        body = {'plan': 'standard', 'platform': 'web', 'signer_name': 'Test Person', 'accept_notice': True, 'terms_version': VERSION}
        self.assertEqual(self.client.post('/api/billing/subscribe/', body, format='json').status_code, 502)
        self.assertEqual(self.client.post('/api/billing/subscribe/', body, format='json').status_code, 409)
        self.assertEqual(create.call_count, 1)

    @patch('payments.billing_views.create_checkout', return_value={'order_id': 'sub-order', 'payment_url': 'https://bank.test/sub'})
    def test_subscription_purchase_requires_consent_and_uses_server_price(self, create):
        r = self.client.post('/api/billing/subscribe/', {'plan': 'standard', 'platform': 'web'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/billing/subscribe/', {'plan': 'standard', 'platform': 'web', 'accept_notice': True, 'signer_name': 'Test Person', 'terms_version': '2026-10-05-standard-pro-v1', 'amount': '0.01'}, format='json')
        self.assertEqual(r.status_code, 202, r.data)
        self.assertEqual(r.data['charge']['amount'], '29.00')
        self.assertIsNone(BillingSubscription.objects.get().started_at)

    def test_failed_signing_does_not_consume_subscription(self):
        sub = self.active_subscription()
        # Already signed: serializer rejects; the surrounding transaction rolls back quota.
        self.version.is_signed = True; self.version.save()
        charge = PlatformCharge.objects.create(payer=self.user, company=self.company, offer=self.offer,
            kind='offer_fee', regular_amount='19.95', amount='19.95', quoted_price='1950')
        r = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(sub.periods.get(number=0).offers_used, 0)
        charge.refresh_from_db(); self.assertEqual(charge.status, 'pending')


class GatewayOrderRecordingTests(APITestCase):
    @patch('payments.services.raiaccept.retrieve_access_token', return_value='test-token')
    @patch('payments.services.raiaccept._post_json')
    def test_order_is_recorded_before_checkout_session(self, post, token):
        from payments.services.raiaccept import create_checkout, RaiAcceptError
        recorded = []
        def gateway(url, payload, headers=None):
            if url.endswith('/checkout'):
                self.assertEqual(recorded, ['bank-order'])
                raise RaiAcceptError('checkout response unavailable')
            return {'orderIdentification': 'bank-order'}
        post.side_effect = gateway
        with self.assertRaises(RaiAcceptError):
            create_checkout({}, on_order_created=recorded.append)
        self.assertEqual(recorded, ['bank-order'])


class IntroductoryOfferAccessTests(BillingFixture, APITestCase):
    # Reuse fixtures only, not the paid-flow test cases.
    def setUp(self):
        super().setUp()
        from accounts.models import Customer
        Customer.objects.create(user=self.customer, phone="+38344987654", address="Private customer address")
        self.company.free_offers_remaining = 25
        self.company.save(update_fields=["free_offers_remaining"])
        self.job.address = "Private job address"
        self.job.postal_code = "10000"
        self.job.save()

    def send(self):
        with self.captureOnCommitCallbacks(execute=False):
            return self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})

    def test_free_send_unlocks_contacts_and_spends_once(self):
        before = self.client.get(f'/api/jobrequests/{self.job.pk}/')
        self.assertIsNone(before.data['customer'])
        self.assertIsNone(before.data['address'])
        self.assertFalse(before.data['lead_unlocked'])
        self.assertEqual(before.data['offers_left'], 25)
        quote = self.client.get('/api/billing/offer-quote/', {'offer': self.offer.pk})
        self.assertTrue(quote.data['introductory'])
        self.assertEqual(self.send().status_code, 200)
        self.assertEqual(self.send().status_code, 400)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 24)
        self.assertEqual(self.company.free_leads_remaining, 25)
        charge = PlatformCharge.objects.get(offer=self.offer)
        self.assertEqual(charge.amount, Decimal('0'))
        self.assertIsNotNone(charge.fulfilled_at)
        after = self.client.get(f'/api/jobrequests/{self.job.pk}/')
        self.assertEqual(after.data['customer']['phone'], '+38344987654')
        self.assertEqual(after.data['address'], 'Private job address')
        self.assertTrue(after.data['lead_unlocked'])
        chat = self.client.post(f'/api/offers/{self.offer.pk}/messages/', {'message': 'Hello'})
        self.assertEqual(chat.status_code, 201, chat.data)

    def test_native_introductory_offer_needs_no_checkout(self):
        for platform in ('web', 'ios', 'android'):
            r = self.client.post('/api/billing/offer-checkout/', {'offer': self.offer.pk, 'platform': platform})
            self.assertEqual(r.status_code, 200, r.data)
            self.assertTrue(r.data['ready_to_sign'])
        self.assertFalse(PlatformCheckout.objects.exists())
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 25)

    def test_old_unlock_flags_do_not_expose_customer_or_chat_or_pdf(self):
        from leads.models import LeadMatch, LeadMessage
        match = LeadMatch.objects.create(company=self.company, job_request=self.job,
                                        can_chat=True, customer_info_unlocked=True)
        LeadMessage.objects.create(lead=match, sender_type='customer',
            sender_customer=self.customer.customer_profile, message='My phone is private')
        opened = self.client.post('/api/payments/unlock-lead/', {'job_request': self.job.pk})
        self.assertFalse(opened.data['lead_unlocked'])
        for path in (f'/api/offers/{self.offer.pk}/', f'/api/offers/by-job/{self.job.pk}/'):
            r = self.client.get(path)
            self.assertEqual(r.status_code, 200, r.data)
            self.assertIsNone(r.data['job_request']['customer'])
            self.assertIsNone(r.data['job_request']['address'])
            self.assertTrue(r.data['chat_locked'])
        for method, path, body in (
            ('get', f'/api/offers/{self.offer.pk}/messages/', {}),
            ('post', f'/api/offers/{self.offer.pk}/messages/', {'message': 'Bypass'}),
            ('post', f'/api/offers/{self.offer.pk}/messages/read/', {}),
            ('get', f'/api/offers/{self.offer.pk}/pdf/', {}),
            ('get', f'/api/jobrequests/{self.job.pk}/audit/', {}),
        ):
            r = getattr(self.client, method)(path, body)
            self.assertEqual(r.status_code, 403, (path, getattr(r, 'data', None)))
        self.assertEqual(self.client.get(f'/api/leads/leadmatches/{match.pk}/').status_code, 404)
        r = self.client.get('/api/leads/leadmessages/', {'lead': match.pk})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['rezultatet'], [])
        r = self.client.post('/api/leads/leadmessages/', {'lead': match.pk, 'message': 'Bypass', 'sender_type': 'company'})
        self.assertEqual(r.status_code, 400, r.data)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 25)

    def test_customer_cannot_read_draft_through_job(self):
        self.client.force_authenticate(self.customer)
        r = self.client.get(f'/api/jobrequests/{self.job.pk}/')
        self.assertEqual(r.data['offers'], [])
        r = self.client.get(f'/api/offers/{self.offer.pk}/')
        self.assertEqual(r.status_code, 404)

    def test_twenty_sixth_offer_requires_payment(self):
        for i in range(25):
            job = JobRequest.objects.create(customer=self.customer, title=f'Job {i}', city=self.city)
            offer = Offer.objects.create(company=self.company, job_request=job)
            version = OfferVersion.objects.create(offer=offer, version_number=1, price_amount=Decimal('1950'))
            offer.current_version = version; offer.save()
            with transaction.atomic():
                authorize_offer_send(offer, self.user)
                authorize_offer_send(offer, self.user)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 0)
        r = self.send()
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data['code'], 'subscription_quota_required')
        self.assertFalse(self.client.get(f'/api/jobrequests/{self.job.pk}/').data['lead_unlocked'])

    def test_failed_sign_rolls_back_free_offer(self):
        with patch('offers.views.OfferSignSerializer.save', side_effect=ValidationError('Invalid signature')):
            self.assertEqual(self.send().status_code, 400)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 25)
        self.assertFalse(PlatformCharge.objects.filter(offer=self.offer).exists())

    def test_free_offer_precedes_subscription_and_revisions_do_not_spend_twice(self):
        sub = self.active_subscription()
        self.assertEqual(self.send().status_code, 200)
        self.assertEqual(sub.periods.get(number=0).offers_used, 0)
        self.client.patch(f'/api/offers/{self.offer.pk}/', {'presentation_text': 'Updated presentation'})
        self.assertTrue(self.client.get(f'/api/jobrequests/{self.job.pk}/').data['lead_unlocked'])
        self.assertEqual(self.send().status_code, 200)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 24)

    def test_pending_bank_transaction_prevents_double_consumption(self):
        charge = self.paid_offer_charge()
        charge.status = 'pending'; charge.save()
        PlatformCheckout.objects.create(charge=charge, amount='19.95', order_id='pending-order')
        quote = self.client.get('/api/billing/offer-quote/', {'offer': self.offer.pk})
        self.assertFalse(quote.data['introductory'])
        self.assertEqual(self.send().data['code'], 'payment_pending')
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 25)

    def test_paid_bank_charge_alone_does_not_unlock_contacts(self):
        self.paid_offer_charge()
        r = self.client.get(f'/api/jobrequests/{self.job.pk}/')
        self.assertIsNone(r.data['customer'])
        self.assertEqual(self.send().status_code, 200)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 25)

    def test_company_cannot_set_its_free_allowance(self):
        r = self.client.patch('/api/accounts/profile/company/', {'free_offers_remaining': 999}, format='multipart')
        self.assertEqual(r.status_code, 200, r.data)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 25)
