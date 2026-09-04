import tempfile
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APITestCase

from accounts.models import Company, Customer, User
from accounts.utils.email_verification import generate_email_verification_token
from jobrequests.models import JobRequest
from locations.models import City
from offers.models import Offer, OfferMessage, OfferReview, OfferStatus, OfferVersion
from payments.models import LeadAccess, Payment, PaymentStatus
from taxonomy.models import Industry, Profession


class FullMarketplaceJourneyTests(APITestCase):
    """Critical API journeys used by the Android, iOS and web clients."""

    password = "Journey-pass-2026"

    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        self.media_override = override_settings(
            MEDIA_ROOT=self.media_directory.name,
            STORAGES={
                "default": {
                    "BACKEND": "django.core.files.storage.FileSystemStorage",
                },
                "staticfiles": {
                    "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
                },
            },
        )
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)

        self.city = City.objects.create(
            name="Prishtina Journey",
            slug="prishtina-journey",
            country="XK",
        )
        self.industry = Industry.objects.create(
            name="Construction Journey",
            slug="construction-journey",
        )
        self.profession = Profession.objects.create(
            industry=self.industry,
            name="Renovation Journey",
            slug="renovation-journey",
        )

    def authenticate_through_login(self, email):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": email, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        access_token = response.data["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        return response.data["data"]["user"]

    def verify_registered_user(self, email):
        user = User.objects.get(email=email)
        token = generate_email_verification_token(user)
        with patch("accounts.views.send_welcome_email"):
            response = self.client.post(
                "/api/accounts/verify-email/",
                {"token": token},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        return user

    def create_ready_company(self, email="journey-helper-company@example.com"):
        company_user = User.objects.create_user(
            email=email,
            password=self.password,
            role="company",
            email_verified=True,
        )
        company = Company.objects.create(
            user=company_user,
            company_name="Journey Helper SH.p.k",
            phone="+38344123456",
            description="Experienced company for complete renovation projects.",
            free_leads_remaining=0,
        )
        company.cities.add(self.city)
        company.professions.add(self.profession)
        company.save()
        return company_user, company

    @patch("accounts.views.send_password_reset_email")
    def test_account_recovery_and_deactivation_routes(self, send_password_reset_email):
        email = "journey-account-recovery@example.com"
        user = User.objects.create_user(
            email=email,
            password=self.password,
            role="customer",
            email_verified=True,
        )

        forgot = self.client.post(
            "/api/accounts/password/forgot/",
            {"email": email},
            format="json",
        )
        self.assertEqual(forgot.status_code, 200, forgot.data)
        send_password_reset_email.assert_called_once()

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        new_password = "Journey-new-pass-2026"
        reset = self.client.post(
            "/api/accounts/password/reset/",
            {"uid": uid, "token": token, "password": new_password},
            format="json",
        )
        self.assertEqual(reset.status_code, 200, reset.data)

        login = self.client.post(
            "/api/accounts/login/",
            {"email": email, "password": new_password},
            format="json",
        )
        self.assertEqual(login.status_code, 200, login.data)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access']}"
        )

        deleted = self.client.post(
            "/api/accounts/account/delete/",
            {"password": new_password},
            format="json",
        )
        self.assertEqual(deleted.status_code, 200, deleted.data)
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertFalse(user.email_verified)

    @patch("accounts.views.send_verification_email")
    def test_customer_complete_journey(self, send_verification_email):
        email = "journey-customer@example.com"

        registration = self.client.post(
            "/api/accounts/register/customer/",
            {"email": email, "password": self.password},
            format="json",
        )
        self.assertEqual(registration.status_code, 200, registration.data)
        send_verification_email.assert_called_once()

        customer_user = self.verify_registered_user(email)
        self.authenticate_through_login(email)

        profile = self.client.patch(
            "/api/accounts/profile/customer/",
            {
                "first_name": "Arta",
                "last_name": "Krasniqi",
                "phone": "+38344111222",
                "address": "Rruga e Testit 12",
                "postal_code": "10000",
                "city_id": self.city.id,
            },
            format="json",
        )
        self.assertEqual(profile.status_code, 200, profile.data)
        self.assertEqual(profile.data["data"]["first_name"], "Arta")

        consent = self.client.post(
            "/api/accounts/customer-consent/",
            {"consent": True},
            format="json",
        )
        self.assertEqual(consent.status_code, 200, consent.data)

        draft = self.client.post(
            "/api/jobrequests/drafts/",
            {"current_step": 1},
            format="json",
        )
        self.assertEqual(draft.status_code, 201, draft.data)
        draft_id = draft.data["id"]

        draft_update = self.client.patch(
            f"/api/jobrequests/drafts/{draft_id}/",
            {
                "title": "Renovate the family kitchen",
                "description": "We need a complete kitchen renovation with new cabinets and flooring.",
                "budget": "8500.00",
                "city": self.city.id,
                "profession": self.profession.id,
                "address": "Rruga e Projektit 7",
                "postal_code": "10000",
                "current_step": 6,
            },
            format="json",
        )
        self.assertEqual(draft_update.status_code, 200, draft_update.data)

        submitted = self.client.post(
            f"/api/jobrequests/drafts/{draft_id}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submitted.status_code, 201, submitted.data)
        job = JobRequest.objects.get(pk=submitted.data["id"])
        self.assertEqual(job.moderation_status, JobRequest.MODERATION_PENDING)
        self.assertFalse(job.is_active)

        job.apply_moderation(JobRequest.MODERATION_APPROVED)
        job.refresh_from_db()
        self.assertTrue(job.is_active)

        company_user, company = self.create_ready_company()
        offer = Offer.objects.create(
            company=company,
            job_request=job,
            lead_unlocked=True,
        )
        version = OfferVersion.objects.create(
            offer=offer,
            version_number=1,
            presentation_text="We can complete the full renovation.",
            duration_text="Three weeks",
            price_amount=Decimal("7900.00"),
            is_signed=True,
            created_by=company_user,
        )
        offer.current_version = version
        offer.status = OfferStatus.SIGNED
        offer.save(update_fields=["current_version", "status"])
        OfferMessage.objects.create(
            offer=offer,
            sender_type="company",
            sender_company=company,
            message="We are available to start next month.",
        )

        available_offers = self.client.get(f"/api/offers/?job_request={job.id}")
        self.assertEqual(available_offers.status_code, 200, available_offers.data)
        available_offer_items = available_offers.data.get("results", available_offers.data)
        self.assertEqual(len(available_offer_items), 1)

        reply = self.client.post(
            f"/api/offers/{offer.id}/messages/",
            {"message": "Thank you, the proposal looks good."},
            format="json",
        )
        self.assertEqual(reply.status_code, 201, reply.data)

        decision = self.client.post(
            f"/api/offers/{offer.id}/decision/",
            {"decision": "accept"},
            format="json",
        )
        self.assertEqual(decision.status_code, 200, decision.data)
        self.assertEqual(decision.data["status"], OfferStatus.ACCEPTED)

        review = self.client.post(
            f"/api/offers/{offer.id}/review/",
            {
                "rating": 5,
                "review_text": "Excellent work and very clear communication.",
                "recommended": True,
            },
            format="multipart",
        )
        self.assertEqual(review.status_code, 201, review.data)

        job.refresh_from_db()
        self.assertTrue(job.is_completed)
        self.assertFalse(job.is_active)
        self.assertEqual(job.winner_offer_id, offer.id)
        self.assertTrue(OfferReview.objects.filter(offer=offer).exists())
        self.assertEqual(OfferMessage.objects.filter(offer=offer).count(), 2)
        self.assertTrue(Customer.objects.get(user=customer_user).consent_job_publish)

    @patch("accounts.views.send_verification_email")
    @patch("payments.views.get_transaction_details")
    @patch("payments.views.create_checkout")
    def test_company_complete_journey(
        self,
        create_checkout,
        get_transaction_details,
        send_verification_email,
    ):
        customer_user = User.objects.create_user(
            email="journey-job-owner@example.com",
            password=self.password,
            role="customer",
            email_verified=True,
            first_name="Luan",
            last_name="Berisha",
        )
        Customer.objects.create(
            user=customer_user,
            phone="+38344999888",
            address="Rruga e Klientit 8",
            city=self.city,
        )
        job = JobRequest.objects.create(
            customer=customer_user,
            title="Bathroom renovation",
            description="Complete bathroom renovation including plumbing and tiles.",
            city=self.city,
            profession=self.profession,
            address="Rruga e Klientit 8",
            moderation_status=JobRequest.MODERATION_APPROVED,
            is_active=True,
        )

        email = "journey-company@example.com"
        registration = self.client.post(
            "/api/accounts/register/company/",
            {
                "email": email,
                "password": self.password,
                "company_name": "G&G Journey SH.p.k",
                "phone": "+38344101010",
            },
            format="json",
        )
        self.assertEqual(registration.status_code, 200, registration.data)
        send_verification_email.assert_called_once()

        company_user = self.verify_registered_user(email)
        self.authenticate_through_login(email)

        registration_document = SimpleUploadedFile(
            "business-registration.pdf",
            b"%PDF-1.4 test registration document",
            content_type="application/pdf",
        )
        profile = self.client.patch(
            "/api/accounts/profile/company/",
            {
                "org_number": "811234567",
                "phone": "+38344101010",
                "website": "https://example.com",
                "address": "Prishtina Business Park",
                "description": "Professional renovation company serving customers across Prishtina.",
                "cities": [self.city.id],
                "professions": [self.profession.id],
                "registration_document": registration_document,
                "default_offer_presentation": "Reliable renovation from planning to completion.",
            },
            format="multipart",
        )
        self.assertEqual(profile.status_code, 200, profile.data)
        self.assertTrue(profile.data["data"]["can_access_marketplace"])
        self.assertEqual(profile.data["data"]["profile_step"], 4)

        company = Company.objects.get(user=company_user)
        company.free_leads_remaining = 0
        company.save(update_fields=["free_leads_remaining"])

        marketplace = self.client.get("/api/jobrequests/")
        self.assertEqual(marketplace.status_code, 200, marketplace.data)
        marketplace_items = marketplace.data.get("results", marketplace.data)
        self.assertEqual(len(marketplace_items), 1)
        self.assertEqual(marketplace_items[0]["id"], job.id)

        create_checkout.return_value = {
            "order_id": "journey_rai_order_123",
            "session_id": "journey_rai_session_123",
            "payment_url": "https://checkout.raiaccept.test/journey-session",
        }
        checkout = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": job.id},
            format="json",
        )
        self.assertEqual(checkout.status_code, 202, checkout.data)
        self.assertTrue(checkout.data["requires_payment"])
        self.assertEqual(checkout.data["payment_amount"], "4.95")

        get_transaction_details.return_value = {
            "transaction": {
                "transactionId": "journey_tx_123",
                "transactionAmount": 4.95,
                "transactionCurrency": "EUR",
                "isProduction": False,
                "transactionType": "PURCHASE",
                "status": "SUCCESS",
                "statusCode": "0000",
            }
        }
        payment = Payment.objects.get(company=company, offer__job_request=job)
        notification = self.client.post(
            "/api/payments/raiaccept/notify/",
            {
                "order": {
                    "orderIdentification": "journey_rai_order_123",
                    "invoice": {"merchantOrderReference": f"payment_{payment.id}"},
                },
                "transaction": {"transactionId": "journey_tx_123"},
            },
            format="json",
        )
        self.assertEqual(notification.status_code, 200, notification.data)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.PAID)
        self.assertTrue(LeadAccess.objects.filter(company=company, job_request=job).exists())

        existing_offer = self.client.get(f"/api/offers/by-job/{job.id}/")
        self.assertEqual(existing_offer.status_code, 200, existing_offer.data)
        offer_id = existing_offer.data["id"]

        offer_update = self.client.patch(
            f"/api/offers/{offer_id}/",
            {
                "presentation_text": "We will manage the complete bathroom renovation.",
                "can_start_from": "2026-10-01",
                "duration_text": "Four weeks",
                "price_type": "fixed",
                "price_amount": "6200.00",
                "currency": "EUR",
                "includes_text": "Labour, plumbing and tile installation",
                "excludes_text": "Customer-selected fixtures",
                "payment_terms": "30% start, 70% completion",
            },
            format="json",
        )
        self.assertEqual(offer_update.status_code, 200, offer_update.data)

        signed = self.client.post(
            f"/api/offers/{offer_id}/sign/",
            {"personal_number": "01019012345"},
            format="json",
        )
        self.assertEqual(signed.status_code, 200, signed.data)

        company_message = self.client.post(
            f"/api/offers/{offer_id}/messages/",
            {"message": "The signed offer is ready for your review."},
            format="json",
        )
        self.assertEqual(company_message.status_code, 201, company_message.data)

        self.client.force_authenticate(customer_user)
        customer_reply = self.client.post(
            f"/api/offers/{offer_id}/messages/",
            {"message": "The terms are clear. I accept the offer."},
            format="json",
        )
        self.assertEqual(customer_reply.status_code, 201, customer_reply.data)
        accepted = self.client.post(
            f"/api/offers/{offer_id}/decision/",
            {"decision": "accept"},
            format="json",
        )
        self.assertEqual(accepted.status_code, 200, accepted.data)

        self.client.force_authenticate(company_user)
        company_offers = self.client.get("/api/offers/mine/")
        self.assertEqual(company_offers.status_code, 200, company_offers.data)
        self.assertEqual(company_offers.data[0]["status"], OfferStatus.ACCEPTED)

        offer = Offer.objects.get(pk=offer_id)
        self.assertEqual(offer.status, OfferStatus.ACCEPTED)
        self.assertTrue(offer.current_version.is_signed)
        self.assertEqual(offer.current_version.price_amount, Decimal("6200.00"))
        self.assertEqual(OfferMessage.objects.filter(offer=offer).count(), 2)
