from decimal import Decimal
from io import StringIO
from unittest.mock import patch
from django.test import override_settings
from django.utils import timezone
from django.core.management import call_command
from django.contrib.auth.models import Permission
from rest_framework.test import APITestCase
from accounts.models import User, Customer
from offers.models import Offer, OfferMessage, ChatReviewAccess
from offers.contact_policy import contains_contact
from payments.models import PlatformCharge, PlatformCheckout
from payments.billing import add_months, settle_charge
from payments.test_billing import BillingFixture


@override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID="merchant", RAIACCEPT_SANDBOX_USERNAME="test", RAIACCEPT_SANDBOX_PASSWORD="test", RAIACCEPT_MODE="sandbox")
class RevisionFeeTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        self.version.price_amount = Decimal('100'); self.version.save()
        self.base = PlatformCharge.objects.create(payer=self.user, company=self.company, offer=self.offer,
            kind='offer_fee', regular_amount='2.95', amount='2.95', quoted_price='100', status='paid')
        self.assertEqual(self.send().status_code, 200)

    def send(self):
        with self.captureOnCommitCallbacks(execute=False):
            return self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})

    def revise(self, price):
        r = self.client.patch(f'/api/offers/{self.offer.pk}/', {'price_amount': str(price)})
        self.assertEqual(r.status_code, 200, r.data)
        return self.client.get('/api/billing/offer-quote/', {'offer': self.offer.pk}).data

    @patch('payments.billing_views.create_checkout', return_value={'order_id': 'raise-order', 'payment_url': 'https://bank.test/checkout'})
    def test_price_raise_has_no_fee_and_keeps_original_receipt(self, bank):
        state = self.revise(500)
        self.assertFalse(state['adjustment'])
        self.assertEqual(state['fee'], '0.00')
        self.assertEqual(self.send().status_code, 200)
        self.base.refresh_from_db()
        self.assertEqual(self.base.amount, Decimal('2.95'))
        self.assertEqual(self.base.quoted_price, Decimal('100'))
        self.assertFalse(PlatformCheckout.objects.exists())
        bank.assert_not_called()

    def test_reducing_and_reraising_price_does_not_charge_same_fee_twice(self):
        state = self.revise(50)
        self.assertTrue(state['paid'])
        self.assertEqual(self.send().status_code, 200)
        state = self.revise(150)
        self.assertTrue(state['paid'])
        self.assertEqual(self.send().status_code, 200)
        self.assertEqual(PlatformCharge.objects.filter(offer=self.offer).count(), 1)

    def test_maximum_fee_applies_to_total_not_each_revision(self):
        self.base.amount = Decimal('19.95'); self.base.save(update_fields=['amount'])
        state = self.revise(100000)
        self.assertTrue(state['paid'])
        self.assertEqual(self.send().status_code, 200)

    def test_historical_paid_revision_does_not_spend_free_allowance(self):
        self.company.free_offers_remaining = 25
        self.company.save()
        state = self.revise(500)
        self.assertFalse(state['introductory'])
        self.assertEqual(self.send().status_code, 200)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 25)

    def test_unstarted_historical_adjustment_cannot_be_charged(self):
        self.revise(500)
        pending = PlatformCharge.objects.create(payer=self.user, company=self.company, offer=self.offer, kind='offer_adjustment', amount='3.00', regular_amount='3.00', quoted_price='500')
        self.revise(1000)
        r = self.client.post(f'/api/billing/{pending.pk}/checkout/', {'platform': 'web'})
        self.assertEqual(r.status_code, 410)
        pending.refresh_from_db()
        self.assertEqual(pending.amount, Decimal('3.00'))
        self.assertEqual(self.send().status_code, 200)


class ContactAndRetentionTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        Customer.objects.create(user=self.customer, phone='+38344123456', address='Private street')
        self.company.website = 'https://business.test'
        self.company.free_offers_remaining = 25
        self.company.save()
        with self.captureOnCommitCallbacks(execute=False):
            r = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number':'1234'})
        self.assertEqual(r.status_code, 200, r.data)

    def accept(self):
        self.client.force_authenticate(self.customer)
        with self.captureOnCommitCallbacks(execute=False):
            r = self.client.post(f'/api/offers/{self.offer.pk}/decision/', {'decision':'accept'})
        self.assertEqual(r.status_code, 200, r.data)

    def test_contacts_open_after_send_but_agreement_pdf_requires_acceptance(self):
        r = self.client.get(f'/api/offers/{self.offer.pk}/')
        self.assertTrue(r.data['chat_available'])
        self.assertTrue(r.data['contact_details_available'])
        self.assertEqual(r.data['job_request']['customer']['phone'], '+38344123456')
        self.client.force_authenticate(self.customer)
        r = self.client.get(f'/api/offers/{self.offer.pk}/')
        self.assertEqual(r.data['company']['phone'], '123456')
        public = self.client.get(f'/api/accounts/companies/{self.company.pk}/public/')
        self.assertEqual(public.data['website'], 'https://business.test')
        self.assertEqual(self.client.get(f'/api/offers/{self.offer.pk}/pdf/').status_code, 403)
        self.accept()
        r = self.client.get(f'/api/offers/{self.offer.pk}/')
        self.assertTrue(r.data['contact_details_available'])
        self.assertEqual(r.data['company']['phone'], '123456')
        job = self.client.get(f'/api/jobrequests/{self.job.pk}/')
        self.assertEqual(job.data['winner']['company']['phone'], '123456')
        self.client.force_authenticate(self.user)
        r = self.client.get(f'/api/offers/{self.offer.pk}/')
        self.assertEqual(r.data['job_request']['customer']['phone'], '+38344123456')
        self.assertEqual(self.client.get(f'/api/offers/{self.offer.pk}/pdf/').status_code, 200)

    def test_phone_email_prices_and_dates_allowed_for_both_parties_after_send(self):
        for user in (self.user, self.customer):
            self.client.force_authenticate(user)
            for message in ('Ring +383 44 123 456', '044-123-456', 'info@example.com', 'info [at] example [dot] com',
                            'info＠example.com', '044\u200b123456', 'https://wa.me/38344123456',
                            'zero four four one two three four five six'):
                with self.subTest(message=message):
                    r = self.client.post(f'/api/offers/{self.offer.pk}/messages/', {'message':message})
                    self.assertEqual(r.status_code, 201, r.data)
            for message in ('Çmimi 1950 €', 'Start 2026-10-12', 'Total 1000000 EUR'):
                with self.captureOnCommitCallbacks(execute=False):
                    self.assertEqual(self.client.post(f'/api/offers/{self.offer.pk}/messages/', {'message':message}).status_code, 201)
        self.assertEqual(OfferMessage.objects.count(), 22)
        self.accept()
        with self.captureOnCommitCallbacks(execute=False):
            self.assertEqual(self.client.post(f'/api/offers/{self.offer.pk}/messages/', {'message':'Ring +383 44 123 456'}).status_code, 201)

    def test_contact_messages_visible_after_send_and_remain_stored(self):
        message = OfferMessage.objects.create(offer=self.offer, sender_type='company', sender_company=self.company, message='Ring 044123456')
        r = self.client.get(f'/api/offers/{self.offer.pk}/messages/')
        self.assertIn('044123456', str(r.data))
        message.refresh_from_db(); self.assertIn('044123456', message.message)

    def test_sent_offer_may_contain_contact_details(self):
        self.client.patch(f'/api/offers/{self.offer.pk}/', {'presentation_text':'Ring +38344123456'})
        r = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number':'1234'})
        self.assertEqual(r.status_code, 200)

    def test_closed_chat_retention_and_case_hold(self):
        message = OfferMessage.objects.create(offer=self.offer, sender_type='company', sender_company=self.company, message='A recorded agreement')
        OfferMessage.objects.filter(pk=message.pk).update(created_at=add_months(timezone.now(), -7))
        self.job.is_active = False; self.job.save()
        call_command('purge_expired_chats', stdout=StringIO())
        self.assertTrue(OfferMessage.objects.filter(pk=message.pk).exists())
        self.offer.chat_retention_hold = True; self.offer.save()
        call_command('purge_expired_chats', apply=True, stdout=StringIO())
        self.assertTrue(OfferMessage.objects.filter(pk=message.pk).exists())
        self.offer.chat_retention_hold = False; self.offer.save()
        call_command('purge_expired_chats', apply=True, stdout=StringIO())
        self.assertFalse(OfferMessage.objects.filter(pk=message.pk).exists())

    def test_active_or_recent_chat_is_not_purged(self):
        msg = OfferMessage.objects.create(offer=self.offer, sender_type='company', sender_company=self.company, message='Still working')
        OfferMessage.objects.filter(pk=msg.pk).update(created_at=add_months(timezone.now(), -7))
        call_command('purge_expired_chats', apply=True, stdout=StringIO())
        self.assertTrue(OfferMessage.objects.exists())
        self.job.is_active=False; self.job.save()
        OfferMessage.objects.create(offer=self.offer, sender_type='company', sender_company=self.company, message='New message')
        call_command('purge_expired_chats', apply=True, stdout=StringIO())
        self.assertEqual(OfferMessage.objects.count(), 2)

    @override_settings(STORAGES={"default": {"BACKEND": "django.core.files.storage.FileSystemStorage"}, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}})
    def test_admin_chat_access_requires_separate_permission_and_is_logged(self):
        staff=User.objects.create_user(email='reviewer@example.test', password='test', is_staff=True)
        self.client.force_authenticate(None)
        self.client.force_login(staff)
        url='/admin/offers/offermessage/'
        self.assertEqual(self.client.get(url).status_code,403)
        staff.user_permissions.add(Permission.objects.get(codename='review_chat'))
        self.assertEqual(self.client.get(url).status_code,200)
        self.assertTrue(ChatReviewAccess.objects.filter(reviewer=staff, action='list').exists())
