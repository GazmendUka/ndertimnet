from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Company, Customer
from jobrequests.models import JobRequest
from locations.models import City

from .models import Offer, OfferMessage, OfferStatus, OfferVersion


User = get_user_model()


class OfferReviewApiTests(APITestCase):
    def setUp(self):
        self.customer_user = User.objects.create_user(
            email="customer@example.com",
            password="test-pass",
            role="customer",
        )
        Customer.objects.create(user=self.customer_user)

        self.company_user = User.objects.create_user(
            email="company@example.com",
            password="test-pass",
            role="company",
        )
        self.company = Company.objects.create(
            user=self.company_user,
            company_name="Test Company",
        )
        self.city = City.objects.create(name="Prishtinë", slug="prishtine-test", country="XK")
        self.job = JobRequest.objects.create(
            customer=self.customer_user,
            title="Kitchen renovation",
            description="Renovate the kitchen",
            city=self.city,
        )
        self.offer = Offer.objects.create(company=self.company, job_request=self.job)
        self.version = OfferVersion.objects.create(
            offer=self.offer,
            version_number=1,
            price_amount="1000.00",
            is_signed=True,
            created_by=self.company_user,
        )
        self.offer.current_version = self.version
        self.offer.status = OfferStatus.ACCEPTED
        self.offer.save()
        self.review_url = f"/api/offers/{self.offer.id}/review/"
        self.messages_url = f"/api/offers/{self.offer.id}/messages/"

    def test_customer_can_review_accepted_offer_once(self):
        self.client.force_authenticate(self.customer_user)

        response = self.client.post(
            self.review_url,
            {
                "rating": 5,
                "review_text": "Excellent work and clear communication.",
                "recommended": True,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["rating"], 5)
        self.assertTrue(response.data["recommended"])
        self.assertTrue(self.offer.review)

        duplicate = self.client.post(
            self.review_url,
            {
                "rating": 4,
                "review_text": "Trying to submit a second review.",
                "recommended": False,
            },
            format="multipart",
        )
        self.assertEqual(duplicate.status_code, 409)

    def test_review_locks_new_messages_for_both_parties_but_keeps_history(self):
        OfferMessage.objects.create(
            offer=self.offer,
            sender_type="customer",
            sender_customer=self.customer_user.customer_profile,
            message="Existing message",
        )
        self.client.force_authenticate(self.customer_user)
        self.client.post(
            self.review_url,
            {
                "rating": 5,
                "review_text": "The completed work looks very good.",
                "recommended": True,
            },
            format="multipart",
        )

        customer_post = self.client.post(self.messages_url, {"message": "New message"})
        self.assertEqual(customer_post.status_code, 403)

        history = self.client.get(self.messages_url)
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.data), 1)

        self.client.force_authenticate(self.company_user)
        company_post = self.client.post(self.messages_url, {"message": "Company message"})
        self.assertEqual(company_post.status_code, 403)

    def test_company_cannot_create_customer_review(self):
        self.client.force_authenticate(self.company_user)
        response = self.client.post(
            self.review_url,
            {
                "rating": 5,
                "review_text": "A company cannot review itself.",
                "recommended": True,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 403)
