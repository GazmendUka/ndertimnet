from rest_framework.test import APITestCase

from accounts.models import Company, Customer, User
from jobrequests.models import JobRequest
from offers.models import Offer
from payments.test_billing import BillingFixture


class MarketplaceJourneyRegressionTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        Customer.objects.create(user=self.customer, city=self.city, phone='000000')
        self.company.website = ''
        self.company.free_offers_remaining = 25
        self.company.save()
        self.company.professions.add(self.profession)
        self.other_user = User.objects.create_user(
            email='other-company@example.test', role='company', email_verified=True
        )
        self.other_company = Company.objects.create(
            user=self.other_user, company_name='Other company', phone='000000',
            description='Fictitious company', city=self.city,
        )
        self.other_company.professions.add(self.profession)

    def accept(self):
        with self.captureOnCommitCallbacks(execute=False):
            sent = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '0000'})
            self.assertEqual(sent.status_code, 200, sent.data)
            self.client.force_authenticate(self.customer)
            accepted = self.client.post(f'/api/offers/{self.offer.pk}/decision/', {
                'decision': 'accept', 'version_id': self.version.pk,
            })
        self.assertEqual(accepted.status_code, 200, accepted.data)
        self.client.force_authenticate(self.user)

    def test_ready_company_without_website_can_sign_and_save_default_text(self):
        profile = self.client.get('/api/accounts/profile/company/').data['data']
        self.assertTrue(profile['can_access_marketplace'])
        self.assertGreaterEqual(profile['profile_step'], 2)
        updated = self.client.patch('/api/accounts/profile/company/', {
            'default_offer_presentation': 'Presentation for future offers.',
        }, format='multipart')
        self.assertEqual(updated.status_code, 200, updated.data)
        self.company.refresh_from_db()
        self.assertEqual(self.company.default_offer_presentation, 'Presentation for future offers.')
        self.accept()
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 24)

    def test_winner_can_read_in_progress_and_completed_job_but_not_marketplace_list(self):
        self.accept()
        for completed in [False, True]:
            with self.subTest(completed=completed):
                if completed:
                    self.client.force_authenticate(self.customer)
                    response = self.client.post(f'/api/jobrequests/{self.job.pk}/complete-work/', {'confirm': True}, format='json')
                    self.assertEqual(response.status_code, 200, response.data)
                    self.client.force_authenticate(self.user)
                response = self.client.get(f'/api/jobrequests/{self.job.pk}/')
                self.assertEqual(response.status_code, 200, response.data)
                self.assertTrue(response.data['lead_unlocked'])
                self.assertEqual(response.data['is_completed'], completed)
                self.assertEqual(self.client.get('/api/jobrequests/').data['count'], 0)
                self.assertEqual(self.client.patch(f'/api/jobrequests/{self.job.pk}/', {'title': 'Not allowed'}).status_code, 403)

    def test_loser_and_unrelated_company_cannot_read_winner_history(self):
        Offer.objects.create(company=self.other_company, job_request=self.job)
        self.accept()
        for completed in [False, True]:
            JobRequest.objects.filter(pk=self.job.pk).update(is_completed=completed)
            self.client.force_authenticate(self.other_user)
            self.assertEqual(self.client.get(f'/api/jobrequests/{self.job.pk}/').status_code, 404)
            self.assertEqual(self.client.get('/api/jobrequests/').data['count'], 0)
        Offer.objects.filter(company=self.other_company).delete()
        self.assertEqual(self.client.get(f'/api/jobrequests/{self.job.pk}/').status_code, 404)

    def test_history_does_not_bypass_moderation_deletion_or_account_status(self):
        self.accept()
        for state in ['pending', 'changes_requested', 'rejected', 'blocked']:
            JobRequest.objects.filter(pk=self.job.pk).update(moderation_status=state)
            self.assertEqual(self.client.get(f'/api/jobrequests/{self.job.pk}/').status_code, 404)
        JobRequest.objects.filter(pk=self.job.pk).update(moderation_status='approved', is_deleted=True)
        self.assertEqual(self.client.get(f'/api/jobrequests/{self.job.pk}/').status_code, 404)
        JobRequest.objects.filter(pk=self.job.pk).update(is_deleted=False)
        Company.objects.filter(pk=self.company.pk).update(is_active=False)
        self.user.refresh_from_db()
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(f'/api/jobrequests/{self.job.pk}/').status_code, 403)

    def test_closed_job_without_winner_does_not_grant_history_access(self):
        JobRequest.objects.filter(pk=self.job.pk).update(is_active=False)
        self.assertEqual(self.client.get(f'/api/jobrequests/{self.job.pk}/').status_code, 404)
