from datetime import timedelta
from io import StringIO
from unittest.mock import patch
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from payments.test_billing import BillingFixture
from payments.models import PlatformCheckout, OfferCredit, BillingSubscription
from payments.billing import ensure_periods
from payments.reconciliation import reconcile_checkout
from payments.credits import compensate_closed_offer, compensate_closed_jobs
from offers.models import OfferMessage
from offers.services import accept_offer


@override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID='merchant', RAIACCEPT_MODE='sandbox')
class HardeningTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        self.charge = self.paid_offer_charge()

    def send_accept(self):
        with self.captureOnCommitCallbacks(execute=False):
            r = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number':'1234'})
            self.assertEqual(r.status_code,200,r.data)
            accept_offer(offer_id=self.offer.pk, customer=self.customer, version_id=self.version.pk)
        self.job.refresh_from_db()

    def old_message(self):
        msg = OfferMessage.objects.create(offer=self.offer, sender_type='company', sender_company=self.company, message='Agreement details')
        OfferMessage.objects.filter(pk=msg.pk).update(created_at=timezone.now()-timedelta(days=250))
        return msg

    def pending(self):
        self.charge.status='pending'; self.charge.save()
        return PlatformCheckout.objects.create(charge=self.charge, amount=self.charge.amount, order_id='order1')

    def details(self, **changes):
        return {'merchant': {'merchantAccountId':'merchant'}, 'transaction': {
            'transactionId':'tx1','transactionType':'PURCHASE','transactionAmount':'19.95',
            'transactionCurrency':'EUR','isProduction':False,'statusCode':'0000','status':'PAID', **changes}}

    def test_acceptance_does_not_finish_work_or_purge_ongoing_chat(self):
        self.send_accept()
        self.assertEqual(self.job.status,'in_progress');self.assertFalse(self.job.is_completed)
        self.assertIsNone(self.job.completed_at)
        msg=self.old_message()
        call_command('purge_expired_chats',apply=True,stdout=StringIO())
        self.assertTrue(OfferMessage.objects.filter(pk=msg.pk).exists())

    def test_only_owner_can_confirm_completion_and_retry_is_idempotent(self):
        self.send_accept()
        url=f'/api/jobrequests/{self.job.pk}/complete-work/'
        self.assertIn(self.client.post(url,{'confirm':True},format='json').status_code,(403,404))
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(url,{},format='json').status_code,400)
        self.assertEqual(self.client.post(url,{'confirm':True},format='json').status_code,200)
        self.job.refresh_from_db(); stamp=self.job.completed_at
        self.assertTrue(self.job.is_completed);self.assertEqual(self.job.status,'completed')
        self.assertEqual(self.client.post(url,{'confirm':True},format='json').status_code,200)
        self.job.refresh_from_db();self.assertEqual(self.job.completed_at,stamp)

    def test_completion_starts_retention_grace_even_for_old_messages(self):
        self.send_accept();msg=self.old_message()
        self.job.completed_at=timezone.now();self.job.save()
        call_command('purge_expired_chats',apply=True,stdout=StringIO())
        self.assertTrue(OfferMessage.objects.filter(pk=msg.pk).exists())
        self.job.completed_at=timezone.now()-timedelta(days=200);self.job.save()
        call_command('purge_expired_chats',apply=True,stdout=StringIO())
        self.assertFalse(OfferMessage.objects.filter(pk=msg.pk).exists())

    def test_cannot_complete_without_accepted_offer(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(f'/api/jobrequests/{self.job.pk}/complete-work/',{'confirm':True},format='json').status_code,400)

    def test_verified_payment_on_closed_job_grants_only_one_credit(self):
        attempt=self.pending();self.job.is_active=False;self.job.save()
        with patch('payments.billing_views.get_transaction_details',return_value=self.details()):
            for _ in range(2):
                response=self.client.post('/api/billing/notify/',{'order':{'orderIdentification':'order1'},'transaction':{'transactionId':'tx1'}},format='json')
                self.assertEqual(response.status_code,200,response.data)
        self.assertEqual(OfferCredit.objects.count(),1)
        credit=OfferCredit.objects.get();self.assertEqual(credit.reason,'job_closed_before_send');self.assertIsNone(credit.issued_by)
        self.assertIsNone(credit.redeemed_offer)
        self.version.refresh_from_db();self.assertFalse(self.version.is_signed)

    def test_paid_then_deleted_job_gets_credit_at_closure(self):
        self.client.force_authenticate(self.customer)
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.delete(f'/api/jobrequests/{self.job.pk}/').status_code,204)
        self.assertEqual(OfferCredit.objects.count(),1)

    def test_pending_or_already_sent_offers_never_receive_closure_credit(self):
        self.pending();self.job.is_active=False;self.job.save()
        self.assertIsNone(compensate_closed_offer(self.offer.pk))
        PlatformCheckout.objects.all().delete()
        self.charge.status='paid';self.charge.save()
        self.version.is_signed=True;self.version.save()
        self.assertIsNone(compensate_closed_offer(self.offer.pk));self.assertFalse(OfferCredit.objects.exists())

    def test_closed_offer_credit_releases_reserved_slot_and_prevents_sending(self):
        from payments.offer_slots import occupied_offers,require_offer_slot
        from rest_framework.exceptions import ValidationError
        self.assertEqual(occupied_offers(self.job).count(),1)
        self.job.is_active=False;self.job.save()
        self.assertEqual(compensate_closed_jobs(),1);self.assertEqual(compensate_closed_jobs(),0)
        self.assertEqual(occupied_offers(self.job).count(),0)
        self.offer.refresh_from_db()
        with self.assertRaises(ValidationError):require_offer_slot(self.offer,self.job)

    @patch('payments.reconciliation.get_transaction_details')
    @patch('payments.reconciliation.get_order_transactions')
    def test_missing_callback_reconciles_verified_bank_success(self,transactions,details):
        attempt=self.pending()
        transactions.return_value=[{'transactionId':'tx1','transactionType':'PURCHASE'}]
        details.return_value=self.details()
        self.assertEqual(reconcile_checkout(attempt.pk),'Verified')
        attempt.refresh_from_db();self.charge.refresh_from_db()
        self.assertEqual(attempt.status,'paid');self.assertEqual(self.charge.status,'paid')
        self.assertEqual(reconcile_checkout(attempt.pk),'Already resolved');self.assertEqual(details.call_count,1)

    @patch('payments.reconciliation.get_order_details')
    @patch('payments.reconciliation.get_transaction_details')
    @patch('payments.reconciliation.get_order_transactions')
    def test_failure_needs_terminal_order_before_releasing_reservation(self,transactions,details,order):
        attempt=self.pending()
        transactions.return_value=[{'transactionId':'tx1','transactionType':'PURCHASE'}]
        details.return_value=self.details(status='FAILED',statusCode='1000')
        order.return_value={'orderIdentification':'order1','status':'PENDING'}
        reconcile_checkout(attempt.pk);attempt.refresh_from_db();self.assertEqual(attempt.status,'pending')
        order.return_value={'orderIdentification':'order1','status':'FAILED'}
        reconcile_checkout(attempt.pk);attempt.refresh_from_db();self.assertEqual(attempt.status,'failed')

    @patch('payments.reconciliation.get_transaction_details')
    @patch('payments.reconciliation.get_order_transactions')
    def test_wrong_amount_never_marks_paid_or_credits(self,transactions,details):
        attempt=self.pending();self.job.is_active=False;self.job.save()
        transactions.return_value=[{'transactionId':'tx1','transactionType':'PURCHASE'}]
        details.return_value=self.details(transactionAmount='0.01')
        reconcile_checkout(attempt.pk);attempt.refresh_from_db()
        self.assertEqual(attempt.status,'pending');self.assertFalse(OfferCredit.objects.exists())
        self.assertIn('verification failed',attempt.reconciliation_note)

    @patch('payments.reconciliation.get_order_transactions')
    def test_missing_order_is_flagged_not_released(self,transactions):
        attempt=self.pending();attempt.order_id=None;attempt.save()
        reconcile_checkout(attempt.pk);attempt.refresh_from_db()
        self.assertEqual(attempt.status,'pending');self.assertIn('ID missing',attempt.reconciliation_note)
        transactions.assert_not_called()

    @patch('payments.reconciliation.get_order_transactions')
    def test_reconciliation_dry_run_makes_no_bank_calls_or_credits(self,transactions):
        attempt=self.pending()
        PlatformCheckout.objects.filter(pk=attempt.pk).update(created_at=timezone.now()-timedelta(hours=1))
        call_command('reconcile_payments',stdout=StringIO())
        transactions.assert_not_called();attempt.refresh_from_db();self.assertIsNone(attempt.last_checked_at)

    def test_old_subscription_debt_remains_payable_with_new_contract(self):
        sub=BillingSubscription.objects.create(company=self.company,plan_code='offers_3',monthly_price='39.95',monthly_offers=3,
            started_at=timezone.now()-timedelta(days=120),ends_at=timezone.now()-timedelta(days=20))
        ensure_periods(sub)
        BillingSubscription.objects.create(company=self.company,plan_code='offers_5',monthly_price='54.95',monthly_offers=5)
        data=self.client.get('/api/billing/history/').data
        debt=[c for c in data if c['subscription_id']==sub.pk]
        self.assertTrue(debt);self.assertTrue(all(c['payable'] for c in debt))
        self.assertTrue(all(c['period_starts_at'] for c in debt))

    def test_canceled_unstarted_contract_has_no_payable_debt(self):
        sub=BillingSubscription.objects.create(company=self.company,plan_code='offers_3',monthly_price='39.95',monthly_offers=3,ends_at=timezone.now())
        ensure_periods(sub)
        debt=[c for c in self.client.get('/api/billing/history/').data if c['subscription_id']==sub.pk]
        self.assertFalse(debt[0]['payable'])

    def test_accepting_competitor_credits_paid_unsent_offer(self):
        from accounts.models import User, Company
        from offers.models import Offer, OfferVersion
        user=User.objects.create_user(email='other-company@example.test',password='test',role='company')
        company=Company.objects.create(user=user,company_name='Other')
        winner=Offer.objects.create(company=company,job_request=self.job)
        version=OfferVersion.objects.create(offer=winner,version_number=1,price_amount='1000',currency='EUR',is_signed=True)
        winner.current_version=version;winner.status='signed';winner.save()
        with self.captureOnCommitCallbacks(execute=True):
            accept_offer(offer_id=winner.pk,customer=self.customer,version_id=version.pk)
        self.assertEqual(OfferCredit.objects.get().source_offer_id,self.offer.pk)

    @patch('payments.reconciliation.get_transaction_details')
    @patch('payments.reconciliation.get_order_transactions')
    def test_multiple_paid_transactions_are_flagged_for_review(self,transactions,details):
        attempt=self.pending()
        transactions.return_value=[{'transactionId':tid,'transactionType':'PURCHASE'} for tid in ('tx1','tx2')]
        details.side_effect=[self.details(),self.details(transactionId='tx2')]
        reconcile_checkout(attempt.pk);attempt.refresh_from_db()
        self.assertEqual(attempt.status,'pending');self.assertIn('multiple successful',attempt.reconciliation_note)

    @patch('payments.reconciliation.get_order_transactions')
    def test_empty_bank_response_does_not_release_reserved_place(self,transactions):
        attempt=self.pending();transactions.return_value=[]
        reconcile_checkout(attempt.pk);attempt.refresh_from_db()
        self.assertEqual(attempt.status,'pending');self.assertIn('no purchase',attempt.reconciliation_note)

    @patch('payments.reconciliation.get_order_details')
    @patch('payments.billing_views.get_transaction_details')
    def test_failed_callback_cannot_release_checkout_that_can_still_succeed(self,details,order):
        attempt=self.pending();details.return_value=self.details(status='FAILED')
        order.return_value={'orderIdentification':'order1','status':'PENDING'}
        response=self.client.post('/api/billing/notify/',{'order':{'orderIdentification':'order1'},'transaction':{'transactionId':'tx1'}},format='json')
        self.assertEqual(response.status_code,200);self.assertEqual(response.data['detail'],'Pending')
        attempt.refresh_from_db();self.assertEqual(attempt.status,'pending')
