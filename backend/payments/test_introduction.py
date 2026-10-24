from unittest.mock import patch
from rest_framework.test import APITestCase
from jobrequests.models import JobRequest
from offers.models import Offer, OfferVersion
from payments.models import PlatformCharge, BillingSubscription
from .test_billing import BillingFixture


class FreeIntroductionQuotaTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        self.company.free_offers_remaining = 20
        self.company.introductory_offers_granted = 20
        self.company.save()

    def new_offer(self, number):
        job = JobRequest.objects.create(customer=self.customer, city=self.city, profession=self.profession, title=f'Demo project {number}', description='Demo description')
        offer = Offer.objects.create(company=self.company, job_request=job, lead_unlocked=True)
        version = OfferVersion.objects.create(offer=offer, version_number=1, price_amount='1000', created_by=self.user)
        offer.current_version = version; offer.save()
        return offer

    @patch('offers.views.schedule_push_notification')
    def test_twenty_distinct_sent_offers_then_stop_without_paid_enrollment(self, push):
        for number in range(20):
            offer = self.offer if number == 0 else self.new_offer(number)
            self.company.refresh_from_db()
            self.assertEqual(self.company.free_offers_remaining, 20-number)
            response = self.client.post(f'/api/offers/{offer.pk}/sign/', {'personal_number': '1234'})
            self.assertEqual(response.status_code, 200, response.data)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 0)
        blocked = self.new_offer(21)
        response = self.client.post(f'/api/offers/{blocked.pk}/sign/', {'personal_number': '1234'})
        self.assertEqual(response.status_code, 400, response.data)
        blocked.current_version.refresh_from_db()
        self.assertFalse(blocked.current_version.is_signed)
        self.assertFalse(BillingSubscription.objects.exists())
        self.assertEqual(PlatformCharge.objects.filter(amount=0, status='paid').count(), 20)

    @patch('offers.views.schedule_push_notification')
    def test_draft_and_revision_do_not_consume_extra_quota(self, push):
        self.client.get(f'/api/offers/{self.offer.pk}/')
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 20)
        first = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})
        self.assertEqual(first.status_code, 200, first.data)
        revision = OfferVersion.objects.create(offer=self.offer, version_number=2, price_amount='1500', created_by=self.user)
        self.offer.current_version = revision; self.offer.save()
        again = self.client.post(f'/api/offers/{self.offer.pk}/sign/', {'personal_number': '1234'})
        self.assertEqual(again.status_code, 200, again.data)
        self.company.refresh_from_db()
        self.assertEqual(self.company.free_offers_remaining, 19)
        self.assertEqual(PlatformCharge.objects.count(), 1)
        overview = self.client.get('/api/billing/subscription/').data['overview']
        self.assertEqual(overview['introductory_offers_granted'], 20)
        self.assertEqual(overview['free_offers_remaining'], 19)
