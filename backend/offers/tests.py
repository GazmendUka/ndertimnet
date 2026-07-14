from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Company, Customer
from jobrequests.models import JobRequest, JobRequestAudit
from leads.models import ArchivedJob
from locations.models import City
from payments.models import LeadAccess

from .models import (
    Offer,
    OfferChatUnlock,
    OfferMessage,
    OfferReview,
    OfferStatus,
    OfferVersion,
    UnlockType,
)


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

    def test_public_company_profile_includes_rating_summary(self):
        OfferReview.objects.create(
            offer=self.offer,
            company=self.company,
            customer=self.customer_user,
            rating=5,
            review_text="Excellent work and clear communication.",
            recommended=True,
        )

        self.client.force_authenticate(self.customer_user)
        response = self.client.get(f"/api/accounts/companies/{self.company.id}/public/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rating_summary"]["average"], 5.0)
        self.assertEqual(response.data["rating_summary"]["count"], 1)
        self.assertEqual(response.data["rating_summary"]["recommended_percentage"], 100)

    def test_hidden_reviews_are_excluded_from_public_results(self):
        review = OfferReview.objects.create(
            offer=self.offer,
            company=self.company,
            customer=self.customer_user,
            rating=2,
            review_text="This review is hidden by moderation.",
            recommended=False,
            moderation_status=OfferReview.ModerationStatus.HIDDEN,
        )

        self.client.force_authenticate(self.customer_user)
        response = self.client.get(f"/api/accounts/companies/{self.company.id}/reviews/")
        profile = self.client.get(f"/api/accounts/companies/{self.company.id}/public/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(profile.data["rating_summary"]["count"], 0)
        self.assertEqual(review.moderation_status, OfferReview.ModerationStatus.HIDDEN)

    def test_public_review_anonymizes_customer_last_name(self):
        self.customer_user.first_name = "Anna"
        self.customer_user.last_name = "Andersson"
        self.customer_user.save(update_fields=["first_name", "last_name"])
        OfferReview.objects.create(
            offer=self.offer,
            company=self.company,
            customer=self.customer_user,
            rating=4,
            review_text="Good work and a professional result.",
            recommended=True,
        )

        self.client.force_authenticate(self.customer_user)
        response = self.client.get(f"/api/accounts/companies/{self.company.id}/reviews/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["customer_name"], "Anna A.")

    def test_company_profile_requires_offer_relationship(self):
        stranger = User.objects.create_user(
            email="stranger@example.com",
            password="test-pass",
            role="customer",
        )
        Customer.objects.create(user=stranger)

        unauthenticated = self.client.get(
            f"/api/accounts/companies/{self.company.id}/public/"
        )
        self.assertEqual(unauthenticated.status_code, 401)

        self.client.force_authenticate(stranger)
        forbidden_profile = self.client.get(
            f"/api/accounts/companies/{self.company.id}/public/"
        )
        forbidden_reviews = self.client.get(
            f"/api/accounts/companies/{self.company.id}/reviews/"
        )

        self.assertEqual(forbidden_profile.status_code, 403)
        self.assertEqual(forbidden_reviews.status_code, 403)

    def test_company_can_view_its_own_profile(self):
        self.client.force_authenticate(self.company_user)
        response = self.client.get(
            f"/api/accounts/companies/{self.company.id}/public/"
        )
        self.assertEqual(response.status_code, 200)

    def test_new_offer_uses_company_default_presentation(self):
        self.company_user.email_verified = True
        self.company_user.save(update_fields=["email_verified"])
        self.company.phone = "+38344111222"
        self.company.website = "https://example.com"
        self.company.default_offer_presentation = "Our standard company introduction."
        self.company.save(update_fields=["phone", "website", "default_offer_presentation"])
        second_job = JobRequest.objects.create(
            customer=self.customer_user,
            title="Bathroom renovation",
            description="Renovate the bathroom",
            city=self.city,
        )
        LeadAccess.objects.create(company=self.company, job_request=second_job)
        self.client.force_authenticate(self.company_user)

        response = self.client.post(
            "/api/offers/",
            {"job_request": second_job.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["current_version"]["presentation_text"],
            "Our standard company introduction.",
        )


class OfferAcceptanceFlowTests(APITestCase):
    def setUp(self):
        self.customer_user = User.objects.create_user(
            email="acceptance-customer@example.com",
            password="test-pass",
            role="customer",
            email_verified=True,
        )
        Customer.objects.create(user=self.customer_user)
        self.city = City.objects.create(
            name="Prishtinë Acceptance",
            slug="prishtine-acceptance",
            country="XK",
        )
        self.job = JobRequest.objects.create(
            customer=self.customer_user,
            title="Roof renovation",
            description="Replace the complete roof.",
            budget="2500.00",
            city=self.city,
            is_active=True,
        )

        self.winner_user = User.objects.create_user(
            email="winner@example.com", password="test-pass", role="company"
        )
        self.winner_company = Company.objects.create(
            user=self.winner_user, company_name="Winner Company"
        )
        self.loser_user = User.objects.create_user(
            email="loser@example.com", password="test-pass", role="company"
        )
        self.loser_company = Company.objects.create(
            user=self.loser_user, company_name="Other Company"
        )

        self.winning_offer = self._create_signed_offer(self.winner_company, self.winner_user, "2200.00")
        self.other_offer = self._create_signed_offer(self.loser_company, self.loser_user, "2300.00")

    def _create_signed_offer(self, company, user, price):
        offer = Offer.objects.create(company=company, job_request=self.job)
        version = OfferVersion.objects.create(
            offer=offer,
            version_number=1,
            price_amount=price,
            is_signed=True,
            created_by=user,
        )
        offer.current_version = version
        offer.status = OfferStatus.SIGNED
        offer.save()
        return offer

    def test_offer_decision_accepts_winner_and_removes_job_from_other_company(self):
        self.client.force_authenticate(self.customer_user)
        response = self.client.post(
            f"/api/offers/{self.winning_offer.id}/decision/",
            {"decision": "accept"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], OfferStatus.ACCEPTED)

        self.job.refresh_from_db()
        self.winning_offer.refresh_from_db()
        self.other_offer.refresh_from_db()
        self.assertFalse(self.job.is_active)
        self.assertTrue(self.job.is_completed)
        self.assertEqual(self.job.status, "completed")
        self.assertEqual(self.job.winner_offer_id, self.winning_offer.id)
        self.assertEqual(self.job.winner_company_id, self.winner_company.id)
        self.assertEqual(self.winning_offer.status, OfferStatus.ACCEPTED)
        self.assertEqual(self.other_offer.status, OfferStatus.REJECTED)
        self.assertTrue(self.winning_offer.lead_unlocked)
        self.assertTrue(
            OfferChatUnlock.objects.filter(
                offer=self.winning_offer,
                unlock_type=UnlockType.AFTER_ACCEPT,
            ).exists()
        )

        self.client.force_authenticate(self.loser_user)
        losing_offer_response = self.client.get(f"/api/offers/{self.other_offer.id}/")
        self.assertEqual(losing_offer_response.status_code, 404)

        self.client.force_authenticate(self.winner_user)
        winning_offer_response = self.client.get(f"/api/offers/{self.winning_offer.id}/")
        self.assertEqual(winning_offer_response.status_code, 200)

    def test_acceptance_retry_is_idempotent(self):
        self.client.force_authenticate(self.customer_user)
        url = f"/api/offers/{self.winning_offer.id}/decision/"
        first = self.client.post(url, {"decision": "accept"}, format="json")
        second = self.client.post(url, {"decision": "accept"}, format="json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(ArchivedJob.objects.filter(company=self.winner_company).count(), 1)
        self.assertEqual(
            JobRequestAudit.objects.filter(
                job_request=self.job,
                action="offer_accepted",
            ).count(),
            1,
        )

    def test_job_request_accept_route_uses_the_same_closing_flow(self):
        self.client.force_authenticate(self.customer_user)
        response = self.client.post(
            f"/api/jobrequests/{self.job.id}/accept-offer/",
            {"offer_id": self.winning_offer.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.job.refresh_from_db()
        self.other_offer.refresh_from_db()
        self.assertFalse(self.job.is_active)
        self.assertTrue(self.job.is_completed)
        self.assertEqual(self.job.winner_offer_id, self.winning_offer.id)
        self.assertEqual(self.other_offer.status, OfferStatus.REJECTED)
