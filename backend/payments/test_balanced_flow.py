from datetime import timedelta
from decimal import Decimal
from io import StringIO
from unittest.mock import patch
from django.core.management import call_command
from django.core.exceptions import PermissionDenied, ValidationError
from django.contrib.auth.models import Permission
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User, Customer
from jobrequests.models import JobRequest
from offers.models import Offer, OfferVersion, OfferMessage
from payments.models import OfferCredit, PlatformCharge
from payments.billing import settle_charge
from payments.credits import issue_credit
from payments.test_billing import BillingFixture


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class BalancedFlowTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        Customer.objects.create(user=self.customer, phone='+38344123456')
        self.version.price_amount = Decimal('1000'); self.version.save()
        self.base = PlatformCharge.objects.create(payer=self.user, company=self.company, offer=self.offer,
            kind='offer_fee', regular_amount='10.95', amount='10.95', quoted_price='1000', status='paid')

    def send(self, offer=None):
        self.client.force_authenticate(self.user)
        with self.captureOnCommitCallbacks(execute=False):
            return self.client.post(f'/api/offers/{(offer or self.offer).pk}/sign/', {'personal_number':'1234'})

    def decide(self, version, decision='accept'):
        self.client.force_authenticate(self.customer)
        with self.captureOnCommitCallbacks(execute=False):
            return self.client.post(f'/api/offers/{self.offer.pk}/decision/', {'decision':decision, 'version_id':version.pk})

    def revise(self, total, **fields):
        self.client.force_authenticate(self.user)
        r = self.client.patch(f'/api/offers/{self.offer.pk}/', {'price_amount':str(total), **fields})
        self.assertEqual(r.status_code,200,r.data)
        self.offer.refresh_from_db()
        return self.client.get('/api/billing/offer-quote/', {'offer':self.offer.pk}).data

    def test_revisions_never_charge_extra_preserving_historical_fee(self):
        self.assertEqual(self.send().status_code, 200)
        for total in ('1050', '1100', '20000', '900'):
            state = self.revise(total)
            self.assertTrue(state['paid'])
            self.assertFalse(state['adjustment'])
            self.assertEqual(state['fee'], '0.00')
            self.assertEqual(self.send().status_code, 200)
        self.assertEqual(PlatformCharge.objects.filter(offer=self.offer).count(), 1)
        self.base.refresh_from_db()
        self.assertEqual(self.base.amount, Decimal('10.95'))

    def test_accepted_revision_hides_draft_preserves_agreement_and_needs_exact_customer_decision(self):
        self.assertEqual(self.send().status_code,200)
        self.assertEqual(self.decide(self.version).status_code,200)
        self.revise('1050', includes_text='Private new draft scope')
        new=self.offer.current_version
        self.client.force_authenticate(self.customer)
        r=self.client.get(f'/api/offers/{self.offer.pk}/')
        self.assertEqual(r.data['accepted_version']['id'],self.version.pk)
        self.assertEqual(r.data['current_version']['id'],self.version.pk)
        self.assertNotIn('Private new draft scope',str(r.data))
        history=self.client.get(f'/api/offers/{self.offer.pk}/versions/').data
        self.assertEqual(len(history),1)
        self.assertEqual(self.decide(new).status_code,400)
        self.assertEqual(self.send().status_code,200)
        self.client.force_authenticate(self.customer)
        r=self.client.get(f'/api/offers/{self.offer.pk}/')
        self.assertTrue(r.data['pending_amendment']);self.assertEqual(r.data['current_version']['id'],new.pk)
        self.assertEqual(r.data['accepted_version']['price_amount'],'1000.00')
        with patch('offers.views.build_offer_contract_pdf', return_value=b'%PDF-test') as pdf:
            self.assertEqual(self.client.get(f'/api/offers/{self.offer.pk}/pdf/').status_code,200)
            self.assertEqual(pdf.call_args.args[0].accepted_version_id,self.version.pk)
        self.assertEqual(self.decide(new).status_code,200)
        self.assertEqual(self.decide(new).status_code,200)
        self.offer.refresh_from_db();self.job.refresh_from_db()
        self.assertEqual(self.offer.accepted_version_id,new.pk);self.assertEqual(self.job.winner_price,Decimal('1050'))
        self.assertEqual(self.version.price_amount,Decimal('1000'))
        self.revise('1070',includes_text='Declined change');pending=self.offer.current_version
        self.assertEqual(self.send().status_code,200)
        self.assertEqual(self.decide(pending,'reject').status_code,200)
        self.offer.refresh_from_db();self.assertEqual(self.offer.status,'accepted');self.assertEqual(self.offer.accepted_version_id,new.pk)
        self.assertEqual(self.decide(pending).status_code,400)

    def test_amendment_requires_send_and_customer_acceptance_without_extra_fee(self):
        self.assertEqual(self.send().status_code, 200)
        self.assertEqual(self.decide(self.version).status_code, 200)
        self.revise('1500')
        new = self.offer.current_version
        self.assertEqual(self.decide(new).status_code, 400)
        self.assertEqual(self.send().status_code, 200)
        self.assertEqual(self.decide(new, 'reject').status_code, 200)
        self.assertEqual(PlatformCharge.objects.filter(offer=self.offer).count(), 1)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.accepted_version_id, self.version.pk)

    def test_activity_requires_customer_open_or_reply_not_company_view(self):
        self.assertEqual(self.send().status_code,200)
        self.client.get(f'/api/offers/{self.offer.pk}/')
        self.offer.refresh_from_db();self.assertIsNone(self.offer.customer_opened_at)
        self.old_unread_job()
        out=StringIO();call_command('follow_up_inactive_requests',stdout=out)
        self.job.refresh_from_db();self.assertIsNone(self.job.inactive_marked_at)
        with self.captureOnCommitCallbacks(execute=False):
            call_command('follow_up_inactive_requests',apply=True,stdout=StringIO())
        from django.core import mail
        self.assertEqual(len(mail.outbox),1)
        call_command('follow_up_inactive_requests',apply=True,stdout=StringIO())
        self.assertEqual(len(mail.outbox),1)
        self.job.refresh_from_db();self.assertIsNotNone(self.job.inactive_marked_at)
        self.assertFalse(OfferCredit.objects.exists())
        self.client.force_authenticate(self.customer)
        self.client.get(f'/api/offers/{self.offer.pk}/')
        self.job.refresh_from_db();self.offer.refresh_from_db()
        self.assertIsNone(self.job.inactive_marked_at);self.assertIsNotNone(self.offer.customer_opened_at)
        call_command('follow_up_inactive_requests',apply=True,stdout=StringIO())
        self.job.refresh_from_db();self.assertIsNone(self.job.inactive_marked_at)

    def old_unread_job(self):
        old=timezone.now()-timedelta(days=15)
        OfferVersion.objects.filter(pk=self.version.pk).update(signed_at=old)
        JobRequest.objects.filter(pk=self.job.pk).update(activity_tracking_started_at=old)

    def test_reply_to_any_company_prevents_global_inactivity(self):
        self.assertEqual(self.send().status_code,200);self.old_unread_job()
        OfferMessage.objects.create(offer=self.offer,sender_type='customer',sender_customer=self.customer.customer_profile,message='Please call me')
        call_command('follow_up_inactive_requests',apply=True,stdout=StringIO())
        self.job.refresh_from_db();self.assertIsNone(self.job.inactive_marked_at);self.assertIsNone(self.job.inactivity_reminded_at)

    def test_new_tracking_does_not_retroactively_mark_old_requests(self):
        self.assertEqual(self.send().status_code,200)
        OfferVersion.objects.filter(pk=self.version.pk).update(signed_at=timezone.now()-timedelta(days=100))
        call_command('follow_up_inactive_requests',apply=True,stdout=StringIO())
        self.job.refresh_from_db();self.assertIsNone(self.job.inactive_marked_at)

    def test_credit_is_permissioned_single_use_and_precedes_introductory_and_subscription_quota(self):
        self.assertEqual(self.send().status_code,200)
        with self.assertRaises(PermissionDenied):
            issue_credit(offer=self.offer,reason='false_request',evidence='Confirmed duplicate from case 42',actor=self.user)
        staff=User.objects.create_user(email='support@example.test',password='test',is_staff=True)
        staff.user_permissions.add(Permission.objects.get(codename='issue_offer_credit'))
        with self.assertRaises(ValidationError):
            issue_credit(offer=self.offer,reason='customer_silent',evidence='No answer from customer',actor=staff)
        credit=issue_credit(offer=self.offer,reason='false_request',evidence='Confirmed false request in case 42',actor=staff)
        with self.assertRaises(ValidationError):
            issue_credit(offer=self.offer,reason='duplicate',evidence='Same case again',actor=staff)
        job=JobRequest.objects.create(customer=self.customer,title='Other',description='New work',city=self.city,profession=self.profession)
        offer=Offer.objects.create(company=self.company,job_request=job)
        v=OfferVersion.objects.create(offer=offer,version_number=1,price_amount='1950');offer.current_version=v;offer.save()
        self.company.free_offers_remaining=25;self.company.save()
        self.active_subscription()
        self.client.force_authenticate(self.user)
        state=self.client.get('/api/billing/offer-quote/',{'offer':offer.pk}).data
        self.assertTrue(state['credit_available']);self.assertFalse(state['introductory'])
        with patch('offers.views.OfferSignSerializer.save',side_effect=__import__('rest_framework.exceptions',fromlist=['ValidationError']).ValidationError('Bad signature')):
            self.assertEqual(self.send(offer).status_code,400)
        credit.refresh_from_db();self.assertIsNone(credit.redeemed_offer_id)
        self.assertEqual(self.send(offer).status_code,200)
        credit.refresh_from_db();self.company.refresh_from_db()
        self.assertEqual(credit.redeemed_offer_id,offer.pk);self.assertEqual(self.company.free_offers_remaining,25)
        self.assertEqual(self.send(offer).status_code,400)
        self.assertEqual(self.client.get('/api/billing/credits/').data[0]['redeemed_offer_id'],offer.pk)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get('/api/billing/credits/').status_code,403)

    def test_seven_day_reminder_does_not_mark_inactive_early(self):
        self.assertEqual(self.send().status_code,200)
        old=timezone.now()-timedelta(days=8)
        OfferVersion.objects.filter(pk=self.version.pk).update(signed_at=old)
        JobRequest.objects.filter(pk=self.job.pk).update(activity_tracking_started_at=old)
        with self.captureOnCommitCallbacks(execute=False):
            call_command('follow_up_inactive_requests',apply=True,stdout=StringIO())
        self.job.refresh_from_db()
        self.assertIsNotNone(self.job.inactivity_reminded_at);self.assertIsNone(self.job.inactive_marked_at)

    def test_accepted_version_backfill_preserves_existing_agreement(self):
        import importlib
        from django.apps import apps
        self.assertEqual(self.send().status_code,200);self.assertEqual(self.decide(self.version).status_code,200)
        Offer.objects.filter(pk=self.offer.pk).update(accepted_version=None)
        migration=importlib.import_module('offers.migrations.0011_offer_accepted_version_offer_customer_opened_at_and_more')
        migration.preserve_accepted_versions(apps,None)
        self.offer.refresh_from_db();self.version.refresh_from_db()
        self.assertEqual(self.offer.accepted_version_id,self.version.pk)
        self.assertEqual(self.version.price_amount,Decimal('1000'))
        self.assertIsNotNone(self.version.customer_accepted_at)
