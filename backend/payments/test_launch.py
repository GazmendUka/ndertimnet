from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from io import StringIO
from threading import Barrier
from time import sleep
from unittest import skipUnless
from unittest.mock import patch
from uuid import uuid4

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection, connections
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase, APITransactionTestCase, APIClient
from accounts.models import User, Company, Customer
from jobrequests.models import JobRequest
from offers.models import Offer, OfferVersion
from payments.models import PlatformCharge, PlatformCheckout, OfferCredit
from payments.test_billing import BillingFixture


@override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID='', RAIACCEPT_SANDBOX_USERNAME='', RAIACCEPT_SANDBOX_PASSWORD='')
class UnconfiguredBankTests(BillingFixture, APITestCase):
    def test_unavailable_subscription_does_not_create_contract_or_debt(self):
        from payments.models import BillingSubscription, SubscriptionAgreement
        from payments.agreements import VERSION
        response = self.client.post('/api/billing/subscribe/', {
            'plan': 'standard', 'platform': 'web', 'accept_notice': True,
            'signer_name': 'Test Person', 'terms_version': VERSION,
        }, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertFalse(BillingSubscription.objects.exists())
        self.assertFalse(SubscriptionAgreement.objects.exists())
        self.assertFalse(PlatformCharge.objects.exists())
        self.assertFalse(self.client.get('/api/billing/catalog/').data['bank_payments_available'])

    def test_free_sending_remains_available_without_bank(self):
        self.company.free_offers_remaining = 25
        self.company.save()
        with self.captureOnCommitCallbacks(execute=False):
            response = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})
        self.assertEqual(response.status_code, 200, response.data)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 24)


@override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID='merchant', RAIACCEPT_MODE='sandbox',
    RAIACCEPT_SANDBOX_USERNAME='test', RAIACCEPT_SANDBOX_PASSWORD='test')
class LaunchJourneyTests(BillingFixture, APITestCase):
    def bank_pay(self, offer_id, total_fee):
        order='order-'+uuid4().hex
        tx='tx-'+uuid4().hex
        with patch('payments.billing_views.create_checkout',return_value={'order_id':order,'payment_url':'https://bank.test/checkout'}):
            r=self.client.post('/api/billing/offer-checkout/',{'offer':offer_id,'platform':'web'})
        self.assertEqual(r.status_code,202,r.data)
        self.assertEqual(Decimal(r.data['charge']['amount']),Decimal(total_fee))
        details={'merchant':{'merchantAccountId':'merchant'},'transaction':{'transactionId':tx,'transactionType':'PURCHASE','transactionAmount':total_fee,'transactionCurrency':'EUR','isProduction':False,'statusCode':'0000','status':'PAID'}}
        with patch('payments.billing_views.get_transaction_details',return_value=details):
            r=self.client.post('/api/billing/notify/',{'order':{'orderIdentification':order},'transaction':{'transactionId':tx}},format='json')
        self.assertEqual(r.status_code,200,r.data)

    def send(self, oid):
        with self.captureOnCommitCallbacks(execute=False):
            r=self.client.post(f'/api/offers/{oid}/sign/',{'personal_number':'1234'})
        self.assertEqual(r.status_code,200,r.data)

    @patch('jobrequests.views._send_new_job_review_notification_safely')
    def test_publish_free_and_paid_offers_accept_amend_complete(self, notifications):
        self.customer.first_name='Test';self.customer.last_name='Customer';self.customer.save()
        Customer.objects.create(user=self.customer,phone='+38344123456',address='Test street',consent_job_publish=True)
        self.client.force_authenticate(self.customer)
        draft=self.client.post('/api/jobrequests/drafts/',{'current_step':1},format='json')
        self.assertEqual(draft.status_code,201,draft.data)
        did=draft.data['id']
        r=self.client.patch(f'/api/jobrequests/drafts/{did}/',{'title':'Renovate a room','description':'Prepare and paint a full room','city':self.city.pk,'profession':self.profession.pk,'address':'Test street','current_step':6},format='json')
        self.assertEqual(r.status_code,200,r.data)
        r=self.client.post(f'/api/jobrequests/drafts/{did}/submit/')
        self.assertEqual(r.status_code,201,r.data)
        job=JobRequest.objects.get(pk=r.data['id'])
        self.assertEqual(job.publication_charge.amount,Decimal('0'))
        job.apply_moderation(JobRequest.MODERATION_APPROVED)
        self.client.force_authenticate(self.user)
        # One remaining intro offer; consume it on the fixture job first.
        self.company.free_offers_remaining=1;self.company.save()
        self.send(self.offer.pk)
        self.company.refresh_from_db();self.assertEqual(self.company.free_offers_remaining,0)
        opened=self.client.post('/api/payments/unlock-lead/',{'job_request':job.pk})
        self.assertEqual(opened.status_code,201,opened.data);oid=opened.data['offer_id']
        self.assertFalse(opened.data['lead_unlocked'])
        r=self.client.patch(f'/api/offers/{oid}/',{'price_amount':'1000','price_type':'fixed','currency':'EUR','includes_text':'Paint the room'},format='json')
        self.assertEqual(r.status_code,200,r.data)
        self.assertEqual(self.client.post(f'/api/offers/{oid}/sign/',{'personal_number':'1234'}).status_code,400)
        self.active_subscription()
        self.assertIsNone(self.client.get(f'/api/jobrequests/{job.pk}/').data['customer'])
        self.send(oid)
        self.assertEqual(self.client.get(f'/api/jobrequests/{job.pk}/').data['customer']['phone'],'+38344123456')
        r=self.client.post(f'/api/offers/{oid}/messages/',{'message':'Please call us to discuss the work.'})
        self.assertEqual(r.status_code,201,r.data)
        self.client.force_authenticate(self.customer)
        version=Offer.objects.get(pk=oid).current_version_id
        with self.captureOnCommitCallbacks(execute=False):
            r=self.client.post(f'/api/offers/{oid}/decision/',{'decision':'accept','version_id':version})
        self.assertEqual(r.status_code,200,r.data)
        job.refresh_from_db();self.assertFalse(job.is_completed)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.patch(f'/api/offers/{oid}/',{'price_amount':'1200'}).status_code,200)
        self.send(oid)
        offer=Offer.objects.get(pk=oid);self.assertEqual(offer.accepted_version_id,version)
        self.client.force_authenticate(self.customer)
        with self.captureOnCommitCallbacks(execute=False):
            r=self.client.post(f'/api/offers/{oid}/decision/',{'decision':'accept','version_id':offer.current_version_id})
        self.assertEqual(r.status_code,200,r.data)
        r=self.client.post(f'/api/jobrequests/{job.pk}/complete-work/',{'confirm':True},format='json')
        self.assertEqual(r.status_code,200,r.data);self.assertIsNotNone(r.data['completed_at'])
        self.assertEqual(sum(PlatformCharge.objects.filter(offer_id=oid,status='paid').values_list('amount',flat=True)),Decimal('0.00'))

    def test_overview_next_bill_and_quota_then_cancellation_end(self):
        sub=self.active_subscription()
        self.company.free_offers_remaining=3;self.company.save()
        overview=self.client.get('/api/billing/subscription/').data['overview']
        self.assertEqual(overview['monthly_offers_remaining'],10)
        self.assertEqual(overview['free_offers_remaining'],3)
        self.assertEqual(overview['next_payment_amount'],'29.00')
        self.assertIsNotNone(overview['next_payment_due_at'])
        self.client.post('/api/billing/cancel-subscription/')
        sub.refresh_from_db()
        overview=self.client.get('/api/billing/subscription/').data['overview']
        self.assertEqual(overview['state'],'ending');self.assertEqual(overview['ends_at'],sub.ends_at)

    def test_unpaid_period_blocks_monthly_quota_in_overview(self):
        sub=self.active_subscription()
        sub.started_at=timezone.now()-timedelta(days=40);sub.save()
        overview=self.client.get('/api/billing/subscription/').data['overview']
        self.assertEqual(overview['state'],'payment_due');self.assertEqual(overview['monthly_offers_remaining'],0)
        self.assertEqual(Decimal(overview['outstanding_amount']),Decimal('29.00'))

    @patch('payments.management.commands.run_billing_maintenance.call_command')
    def test_maintenance_dry_run_never_runs_external_actions(self,run):
        call_command('run_billing_maintenance','daily',stdout=StringIO())
        run.assert_not_called()
        with self.assertRaises(CommandError):
            call_command('run_billing_maintenance','daily',apply=True,stdout=StringIO())
        run.assert_not_called()


@skipUnless(connection.vendor=='postgresql','Requires PostgreSQL row locks, not SQLite')
@override_settings(RAIACCEPT_MERCHANT_ACCOUNT_ID='merchant', RAIACCEPT_MODE='sandbox',
    RAIACCEPT_SANDBOX_USERNAME='test', RAIACCEPT_SANDBOX_PASSWORD='test')
class BillingConcurrencyTests(BillingFixture, APITransactionTestCase):
    def race(self, jobs):
        barrier=Barrier(len(jobs))
        def task(entry):
            uid, action=entry
            connections.close_all()
            try:
                client=APIClient();client.force_authenticate(User.objects.get(pk=uid))
                barrier.wait(timeout=10)
                response=action(client)
                return response.status_code,response.data
            finally: connections.close_all()
        with ThreadPoolExecutor(max_workers=len(jobs)) as pool:
            futures=[pool.submit(task,j) for j in jobs]
            return [f.result(timeout=25) for f in futures]

    def competitor(self):
        user=User.objects.create_user(email='competitor@example.test',password='test',role='company',email_verified=True)
        company=Company.objects.create(user=user,company_name='Competitor',profile_step=4,description='Builder',phone='123456',website='https://example.test',city=self.city,free_offers_remaining=0)
        company.professions.add(self.profession)
        offer=Offer.objects.create(company=company,job_request=self.job)
        v=OfferVersion.objects.create(offer=offer,version_number=1,price_amount='1950',currency='EUR')
        offer.current_version=v;offer.save()
        return user,offer

    @staticmethod
    def bank(*args, **kwargs):
        sleep(.1)
        return {'order_id':'order-'+uuid4().hex,'payment_url':'https://bank.test/checkout'}

    @patch('payments.billing_views.create_checkout',side_effect=bank)
    def test_two_companies_without_subscription_never_start_offer_payment(self,bank):
        user,offer=self.competitor();self.job.max_offers=1;self.job.save()
        results=self.race([(self.user.pk,lambda c:c.post('/api/billing/offer-checkout/',{'offer':self.offer.pk,'platform':'web'})),(user.pk,lambda c:c.post('/api/billing/offer-checkout/',{'offer':offer.pk,'platform':'web'}))])
        self.assertEqual(sorted(r[0] for r in results),[409,409],results)
        self.assertEqual(PlatformCheckout.objects.count(),0);bank.assert_not_called()

    @patch('payments.billing_views.create_checkout',side_effect=bank)
    def test_double_click_never_creates_two_bank_attempts(self,bank):
        from payments.agreements import VERSION
        fn=lambda c:c.post('/api/billing/subscribe/',{'plan':'standard','platform':'web','accept_notice':True,'signer_name':'Test Person','terms_version':VERSION},format='json')
        results=self.race([(self.user.pk,fn),(self.user.pk,fn)])
        self.assertTrue(all(r[0] in (202,409) for r in results),results)
        self.assertEqual(PlatformCheckout.objects.count(),1);self.assertEqual(bank.call_count,1)

    @patch('offers.views.schedule_push_notification')
    def test_last_free_offer_cannot_be_spent_twice(self,push):
        job=JobRequest.objects.create(customer=self.customer,city=self.city,title='Second job')
        offer=Offer.objects.create(company=self.company,job_request=job)
        version=OfferVersion.objects.create(offer=offer,version_number=1,price_amount='1000')
        offer.current_version=version;offer.save()
        self.company.free_offers_remaining=1;self.company.save()
        results=self.race([(self.user.pk,lambda c:c.post(f'/api/offers/{self.offer.pk}/sign/',{'personal_number':'1234'})),(self.user.pk,lambda c:c.post(f'/api/offers/{offer.pk}/sign/',{'personal_number':'1234'}))])
        self.assertEqual(sorted(r[0] for r in results),[200,400],results)
        self.company.refresh_from_db();self.assertEqual(self.company.free_offers_remaining,0)
        self.assertEqual(PlatformCharge.objects.filter(status='paid').count(),1)

    @patch('offers.views.schedule_push_notification')
    def test_last_monthly_offer_cannot_be_spent_twice(self, push):
        sub = self.active_subscription()
        sub.periods.update(offers_used=9)
        job = JobRequest.objects.create(customer=self.customer, city=self.city, title='Second monthly job')
        offer = Offer.objects.create(company=self.company, job_request=job)
        version = OfferVersion.objects.create(offer=offer, version_number=1, price_amount='1000')
        offer.current_version = version
        offer.save()
        results = self.race([(self.user.pk, lambda c: c.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})), (self.user.pk, lambda c: c.post(f'/api/offers/{offer.pk}/sign/', {'personal_number': '1234'}))])
        self.assertEqual(sorted(r[0] for r in results), [200, 400], results)
        self.assertEqual(sub.periods.get(number=0).offers_used, 10)
        self.assertEqual(PlatformCharge.objects.filter(kind='offer_fee', status='paid').count(), 1)

    @patch('payments.billing_views.get_transaction_details')
    def test_duplicate_callbacks_credit_only_once(self,details):
        charge=self.paid_offer_charge();charge.status='pending';charge.save()
        PlatformCheckout.objects.create(charge=charge,amount='19.95',order_id='order1')
        self.job.is_active=False;self.job.save()
        details.return_value={'merchant':{'merchantAccountId':'merchant'},'transaction':{'transactionId':'tx1','transactionType':'PURCHASE','transactionAmount':'19.95','transactionCurrency':'EUR','isProduction':False,'statusCode':'0000','status':'PAID'}}
        fn=lambda c:c.post('/api/billing/notify/',{'order':{'orderIdentification':'order1'},'transaction':{'transactionId':'tx1'}},format='json')
        results=self.race([(self.user.pk,fn),(self.user.pk,fn)])
        self.assertEqual([r[0] for r in results],[200,200],results)
        self.assertEqual(OfferCredit.objects.count(),1)

    @override_settings(BILLING_JOBS_ENABLED=True)
    @patch('payments.management.commands.run_billing_maintenance.call_command')
    def test_daily_tasks_dispatch_in_order(self,run):
        call_command('run_billing_maintenance','daily',apply=True,stdout=StringIO())
        self.assertEqual([c.args[0] for c in run.call_args_list],['prepare_billing_periods','follow_up_inactive_requests','purge_expired_chats'])


class ReminderTransportTests(APITestCase):
    @patch.dict('os.environ',{'SENDGRID_API_KEY':'test-only'})
    @patch('core.email_backend.SendGridAPIClient')
    def test_reminder_transport_accepts_only_successful_provider_response(self,client):
        from django.core.mail import EmailMessage
        from core.email_backend import SendGridBackend
        email=EmailMessage('Reminder','Open your offers','sender@example.test',['recipient@example.test'])
        client.return_value.send.return_value.status_code=202
        self.assertEqual(SendGridBackend().send_messages([email]),1)
        client.return_value.send.return_value.status_code=500
        with self.assertRaises(RuntimeError):SendGridBackend().send_messages([email])
        self.assertEqual(SendGridBackend(fail_silently=True).send_messages([email]),0)
