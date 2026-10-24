from datetime import timedelta
from io import StringIO
from unittest.mock import patch
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User, Company, Customer, UserBlock
from jobrequests.models import JobRequest
from locations.models import City
from leads.models import LeadMatch, LeadMessage
from .models import Offer, OfferVersion, OfferMessage, ChatReport, ChatReviewAccess


class ChatSafetyTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.customer = User.objects.create_user(email='safety-customer@example.test', role='customer', email_verified=True)
        Customer.objects.create(user=self.customer)
        self.owner = User.objects.create_user(email='safety-company@example.test', role='company', email_verified=True)
        self.company = Company.objects.create(user=self.owner, company_name='Demo')
        city = City.objects.create(name='Demo', slug='safety-demo', country='XK')
        self.job = JobRequest.objects.create(customer=self.customer, title='Demo job', description='Demo job description', city=city)
        self.offer = self.make_offer(self.job)
        self.message = OfferMessage.objects.create(offer=self.offer, sender_company=self.company, sender_type='company', message='Demo message for moderation')
        self.base = f'/api/offers/{self.offer.pk}/'
        self.client.force_authenticate(self.customer)

    def make_offer(self, job):
        offer = Offer.objects.create(company=self.company, job_request=job)
        version = OfferVersion.objects.create(offer=offer, version_number=1, price_amount='1000', is_signed=True, created_by=self.owner)
        offer.current_version = version
        offer.status = 'accepted'
        offer.save()
        return offer

    def block(self, value=True):
        return self.client.post(self.base+'chat-block/', {'blocked': value}, format='json')

    def test_block_stops_both_directions_and_other_conversations_preserves_history(self):
        other_job = JobRequest.objects.create(customer=self.customer, title='Second job', city=self.job.city)
        second = self.make_offer(other_job)
        self.assertEqual(self.block().status_code, 200)
        self.assertEqual(self.block().status_code, 200)
        self.assertEqual(UserBlock.objects.count(), 1)
        with patch('offers.views.schedule_push_notification') as push:
            for user in (self.customer, self.owner):
                self.client.force_authenticate(user)
                for offer in (self.offer, second):
                    response = self.client.post(f'/api/offers/{offer.pk}/messages/', {'message': 'Must not be sent'}, format='json')
                    self.assertEqual(response.status_code, 403, response.data)
                    self.assertEqual(str(response.data['code']), 'chat_blocked')
            push.assert_not_called()
        self.assertEqual(OfferMessage.objects.count(), 1)
        self.assertEqual(len(self.client.get(self.base+'messages/').data), 1)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.status, 'accepted')

    def test_only_own_block_can_be_removed(self):
        self.block()
        self.client.force_authenticate(self.owner)
        self.assertTrue(self.block(False).data['blocked'])
        self.block()
        self.client.force_authenticate(self.customer)
        self.assertTrue(self.block(False).data['blocked'])
        self.assertFalse(self.client.get(self.base+'chat-safety/').data['blocked_by_me'])
        self.client.force_authenticate(self.owner)
        self.assertFalse(self.block(False).data['blocked'])
        with patch('offers.views.schedule_push_notification'):
            self.assertEqual(self.client.post(self.base+'messages/', {'message': 'Allowed again'}).status_code, 201)

    def test_report_and_block_are_saved_together_and_duplicate_is_idempotent(self):
        body = {'message_id': self.message.pk, 'reason': 'scam', 'details': 'Demo concern', 'block_user': True, 'reported_user': self.customer.pk}
        first = self.client.post(self.base+'chat-reports/', body, format='json')
        second = self.client.post(self.base+'chat-reports/', body, format='json')
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertTrue(first.data['chat_state']['blocked_by_me'])
        self.assertEqual(ChatReport.objects.count(), 1)
        report = ChatReport.objects.get()
        self.assertEqual(report.reporter, self.customer)
        self.assertEqual(report.reported_user, self.owner)
        with patch('offers.chat_safety.UserBlock.objects.get_or_create', side_effect=RuntimeError('test failure')):
            with self.assertRaises(RuntimeError):
                self.client.post(self.base+'chat-reports/', {'reason': 'harassment', 'block_user': True}, format='json')
        self.assertEqual(ChatReport.objects.count(), 1)

    def test_report_cannot_reference_own_or_unrelated_message_and_validates_details(self):
        own = OfferMessage.objects.create(offer=self.offer, sender_customer=self.customer.customer_profile, sender_type='customer', message='Own')
        for body in ({'message_id': own.pk, 'reason': 'scam'}, {'message_id': 999999, 'reason': 'scam'}, {'reason': 'invalid'}, {'reason': 'other', 'details': 'short'}, {'reason': 'scam', 'details': 'x'*1001}):
            self.assertEqual(self.client.post(self.base+'chat-reports/', body, format='json').status_code, 400)
        self.assertFalse(ChatReport.objects.exists())

    def test_third_party_cannot_read_block_or_report(self):
        outsider = User.objects.create_user(email='outsider@example.test', role='customer')
        Customer.objects.create(user=outsider)
        self.client.force_authenticate(outsider)
        self.assertEqual(self.client.get(self.base+'chat-safety/').status_code, 404)
        self.assertEqual(self.block().status_code, 404)
        self.assertEqual(self.client.post(self.base+'chat-reports/', {'reason': 'scam'}).status_code, 404)
        self.assertFalse(UserBlock.objects.exists())

    def test_block_also_enforced_on_legacy_message_route(self):
        lead = LeadMatch.objects.create(company=self.company, job_request=self.job)
        self.block()
        response = self.client.post('/api/leads/leadmessages/', {'lead': lead.pk, 'sender_type': 'customer', 'message': 'Blocked legacy send'}, format='json')
        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(LeadMessage.objects.exists())

    def test_report_limit(self):
        for _ in range(20):
            self.assertIn(self.client.post(self.base+'chat-reports/', {'reason': 'scam'}).status_code, (200, 201))
        self.assertEqual(self.client.post(self.base+'chat-reports/', {'reason': 'scam'}).status_code, 429)

    def test_company_can_report_customer_after_review_closed_the_composer(self):
        from .models import OfferReview
        message = OfferMessage.objects.create(offer=self.offer, sender_customer=self.customer.customer_profile, sender_type='customer', message='Demo customer message')
        OfferReview.objects.create(offer=self.offer, company=self.company, customer=self.customer, rating=5, review_text='A completed project')
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.base+'chat-reports/', {'reason': 'harassment', 'message_id': message.pk}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(ChatReport.objects.get().reported_user, self.customer)
        self.assertEqual(self.block().status_code, 200)

    def test_unsent_offer_cannot_be_used_to_block_or_report_a_customer(self):
        OfferVersion.objects.filter(offer=self.offer).update(is_signed=False)
        self.client.force_authenticate(self.owner)
        self.assertFalse(self.client.get(self.base+'chat-safety/').data['can_report'])
        self.assertEqual(self.block().status_code, 403)
        self.assertEqual(self.client.post(self.base+'chat-reports/', {'reason': 'scam'}).status_code, 403)

    def test_moderation_permissions_audit_and_hidden_message(self):
        self.client.post(self.base+'chat-reports/', {'reason': 'scam', 'message_id': self.message.pk}, format='json')
        report = ChatReport.objects.get()
        staff = User.objects.create_user(email='moderator@example.test', password='test', is_staff=True)
        self.client.force_authenticate(None)
        self.client.force_login(staff)
        url = '/admin/offers/chatreport/'
        self.assertEqual(self.client.get(url).status_code, 403)
        staff.user_permissions.add(Permission.objects.get(codename='review_chat'))
        self.assertEqual(self.client.get(url).status_code, 200)
        response = self.client.post(url, {'action': 'hide_reported_messages', '_selected_action': report.pk})
        self.message.refresh_from_db()
        self.assertFalse(self.message.is_hidden)
        staff.user_permissions.add(Permission.objects.get(codename='change_chatreport'))
        response = self.client.post(url, {'action': 'hide_reported_messages', '_selected_action': report.pk})
        self.assertEqual(response.status_code, 302)
        self.message.refresh_from_db(); report.refresh_from_db()
        self.assertTrue(self.message.is_hidden)
        self.assertEqual(self.message.message, 'Demo message for moderation')
        self.assertEqual(report.status, 'reviewed')
        self.assertEqual(report.reviewed_by, staff)
        self.assertTrue(ChatReviewAccess.objects.filter(reviewer=staff).exists())
        self.client.force_authenticate(self.customer)
        history = self.client.get(self.base+'messages/').data
        self.assertEqual(history[0]['message'], 'Ky mesazh është fshehur nga moderatori.')
        self.assertTrue(history[0]['is_hidden'])

    def test_open_report_preserves_evidence_during_retention_cleanup(self):
        OfferMessage.objects.filter(pk=self.message.pk).update(created_at=timezone.now()-timedelta(days=240))
        Offer.objects.filter(pk=self.offer.pk).update(status='rejected')
        report = ChatReport.objects.create(offer=self.offer, reporter=self.customer, reported_user=self.owner, message=self.message, reason='scam')
        call_command('purge_expired_chats', apply=True, stdout=StringIO())
        self.assertTrue(OfferMessage.objects.filter(pk=self.message.pk).exists())
        report.status = 'dismissed'; report.save()
        call_command('purge_expired_chats', apply=True, stdout=StringIO())
        self.assertFalse(OfferMessage.objects.filter(pk=self.message.pk).exists())

    def test_admin_cannot_reopen_report_when_another_is_already_pending(self):
        from .admin import ChatReportForm
        previous = ChatReport.objects.create(offer=self.offer, reporter=self.customer, reported_user=self.owner, reason='scam', message=self.message, status='reviewed')
        ChatReport.objects.create(offer=self.offer, reporter=self.customer, reported_user=self.owner, reason='scam', message=self.message)
        form = ChatReportForm(data={'status': 'pending', 'admin_note': ''}, instance=previous)
        self.assertFalse(form.is_valid())
        self.assertIn('status', form.errors)


from concurrent.futures import ThreadPoolExecutor
from threading import Event
from django.db import close_old_connections, transaction
from rest_framework.test import APIClient, APITransactionTestCase
from accounts.chat_safety import lock_chat_users


class ChatBlockConcurrencyTests(APITransactionTestCase):
    make_offer = ChatSafetyTests.make_offer

    def setUp(self):
        ChatSafetyTests.setUp(self)

    def test_send_waiting_on_block_transaction_is_rejected_after_block_commits(self):
        started = Event()

        def send():
            close_old_connections()
            try:
                client = APIClient(); client.force_authenticate(self.owner)
                started.set()
                return client.post(self.base+'messages/', {'message': 'Concurrent message'}, format='json').status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                lock_chat_users(self.owner.pk, self.customer.pk)
                UserBlock.objects.create(blocker=self.customer, blocked_user=self.owner)
                future = pool.submit(send)
                self.assertTrue(started.wait(timeout=3))
                self.assertFalse(future.done())
            self.assertEqual(future.result(timeout=5), 403)
        self.assertEqual(OfferMessage.objects.count(), 1)

