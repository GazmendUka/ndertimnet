from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch

from django.core.cache import cache
from django.db import DatabaseError, close_old_connections
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from rest_framework.test import APIClient

from .contact_limits import reserve_contact_attempt
from .models import ContactSubmissionGuard


class ContactQuotaTests(TestCase):
    def test_limit_survives_cache_reset_and_new_request_clients(self):
        with patch('main.contact.EmailMessage.send', return_value=1):
            statuses = []
            for n in range(6):
                cache.clear()
                response = APIClient().post('/api/contact/', {
                    'name': 'Test Person', 'email': 'visitor@example.com',
                    'message': 'A synthetic contact test.',
                }, format='json', REMOTE_ADDR='192.0.2.10',
                    HTTP_X_FORWARDED_FOR=f'198.51.100.{n}',
                    HTTP_CF_CONNECTING_IP=f'203.0.113.{n}')
                statuses.append(response.status_code)
            self.assertEqual(statuses, [200] * 5 + [429])
            self.assertGreaterEqual(int(response['Retry-After']), 1)

    def test_rotating_email_addresses_hits_global_burst_limit(self):
        for n in range(5):
            self.assertIsNone(reserve_contact_attempt(f'visitor{n}@example.com'))
        self.assertIsNotNone(reserve_contact_attempt('different@example.com'))
        self.assertEqual(len(ContactSubmissionGuard.objects.get().attempts), 5)

    @patch('main.contact_limits.time.time')
    def test_email_normalization_and_hourly_limit(self, clock):
        for n in range(5):
            clock.return_value = 1700000000 + n * 61
            self.assertIsNone(reserve_contact_attempt(' Visitor@EXAMPLE.com '))
        clock.return_value = 1700000305
        self.assertEqual(reserve_contact_attempt('visitor@example.com'), 3295)
        self.assertIsNone(reserve_contact_attempt('other@example.com'))

    @patch('main.contact_limits.time.time', return_value=1700000000)
    def test_global_hourly_limit_applies_across_identities(self, clock):
        ContactSubmissionGuard.objects.create(attempts=[
            {'at': clock.return_value - 120, 'identity': str(n)} for n in range(20)
        ])
        self.assertEqual(reserve_contact_attempt('new@example.com'), 3480)

    @patch('main.contact_limits.time.time', return_value=1700000000)
    def test_global_daily_limit_applies_after_hourly_window(self, clock):
        ContactSubmissionGuard.objects.create(attempts=[
            {'at': clock.return_value - 4000, 'identity': str(n)} for n in range(100)
        ])
        self.assertEqual(reserve_contact_attempt('new@example.com'), 82400)

    @patch('main.contact_limits.time.time', return_value=1700000000)
    def test_expired_attempts_are_pruned_and_new_attempt_allowed(self, clock):
        ContactSubmissionGuard.objects.create(attempts=[
            {'at': clock.return_value - 86400, 'identity': str(n)} for n in range(100)
        ])
        self.assertIsNone(reserve_contact_attempt('new@example.com'))
        self.assertEqual(len(ContactSubmissionGuard.objects.get().attempts), 1)

    @patch('main.contact_limits.time.time')
    def test_limit_reopens_at_window_boundary(self, clock):
        clock.return_value = 1700000000
        for _ in range(5):
            self.assertIsNone(reserve_contact_attempt('visitor@example.com'))
        self.assertIsNotNone(reserve_contact_attempt('visitor@example.com'))
        clock.return_value += 3600
        self.assertIsNone(reserve_contact_attempt('visitor@example.com'))

    def test_state_contains_no_raw_email_or_message(self):
        reserve_contact_attempt('visitor@example.com')
        attempt = ContactSubmissionGuard.objects.get().attempts[0]
        self.assertEqual(set(attempt), {'at', 'identity'})
        self.assertEqual(len(attempt['identity']), 64)
        self.assertNotIn('visitor', str(attempt))
        self.assertNotIn('@', str(attempt))

    @patch('main.contact.EmailMessage.send')
    @patch('main.contact.reserve_contact_attempt', side_effect=DatabaseError('private data'))
    def test_database_failure_blocks_delivery_without_sensitive_error(self, reserve, send):
        with self.assertLogs('main.contact', level='WARNING') as logs:
            response = APIClient().post('/api/contact/', {
                'name': 'Test Person', 'email': 'visitor@example.com',
                'message': 'A synthetic contact test.',
            }, format='json')
        self.assertEqual(response.status_code, 503)
        send.assert_not_called()
        self.assertNotIn('private data', str(response.data) + str(logs.output))

    @patch('main.contact.EmailMessage.send', side_effect=RuntimeError('provider unavailable'))
    def test_delivery_failures_still_consume_quota(self, send):
        for _ in range(5):
            response = APIClient().post('/api/contact/', {
                'name': 'Test Person', 'email': 'visitor@example.com',
                'message': 'A synthetic contact test.',
            }, format='json')
            self.assertEqual(response.status_code, 503)
        self.assertIsNotNone(reserve_contact_attempt('visitor@example.com'))
        self.assertEqual(send.call_count, 5)


class ContactQuotaConcurrencyTests(TransactionTestCase):
    @skipUnlessDBFeature('has_select_for_update')
    def test_parallel_workers_cannot_overrun_quota_on_first_request(self):
        barrier = Barrier(8)

        def reserve(n):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return reserve_contact_attempt(f'worker{n}@example.com')
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(reserve, range(8)))
        self.assertEqual(results.count(None), 5)
        self.assertEqual(ContactSubmissionGuard.objects.count(), 1)
        self.assertEqual(len(ContactSubmissionGuard.objects.get().attempts), 5)
