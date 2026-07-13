from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.test import APITestCase, APIRequestFactory

from accounts.models import Company, Customer
from locations.models import City

from .models import JobRequest, JobRequestDraft, JobRequestModerationEvent
from .views import JobRequestViewSet


User = get_user_model()


class JobRequestModerationTests(APITestCase):
    def setUp(self):
        self.customer_user = User.objects.create_user(
            email="customer-moderation@example.com",
            password="test-pass",
            role="customer",
            email_verified=True,
            first_name="Test",
            last_name="Customer",
        )
        self.customer = Customer.objects.create(
            user=self.customer_user,
            phone="12345678",
            address="Test address 1",
        )
        self.company_user = User.objects.create_user(
            email="company-moderation@example.com",
            password="test-pass",
            role="company",
            email_verified=True,
        )
        self.company = Company.objects.create(
            user=self.company_user,
            company_name="Moderation Company",
            profile_step=4,
            is_active=True,
        )
        self.city = City.objects.create(
            name="Prishtinë Moderation",
            slug="prishtine-moderation",
            country="XK",
        )

    def submit_draft(self):
        draft = JobRequestDraft.objects.create(
            customer=self.customer_user,
            title="Bathroom renovation",
            description="A complete bathroom renovation is needed.",
            city=self.city,
            address="Test address 1",
            current_step=5,
        )
        self.client.force_authenticate(self.customer_user)
        response = self.client.post(f"/api/jobrequests/drafts/{draft.id}/submit/")
        self.assertEqual(response.status_code, 201)
        return JobRequest.objects.get(pk=response.data["id"])

    def test_new_job_is_pending_inactive_and_has_no_expiration(self):
        job = self.submit_draft()

        self.assertEqual(job.moderation_status, JobRequest.MODERATION_PENDING)
        self.assertFalse(job.is_active)
        self.assertIsNone(job.expires_at)
        self.assertIsNotNone(job.submitted_at)
        self.assertTrue(
            JobRequestModerationEvent.objects.filter(
                job_request=job,
                status=JobRequest.MODERATION_PENDING,
            ).exists()
        )

    def test_pending_job_is_hidden_from_company_then_visible_after_approval(self):
        job = self.submit_draft()

        request = Request(APIRequestFactory().get("/api/jobrequests/"))
        request.user = self.company_user
        view = JobRequestViewSet()
        view.request = request
        hidden_ids = list(view.get_queryset().values_list("id", flat=True))
        self.assertNotIn(job.id, hidden_ids)

        moderator = User.objects.create_superuser(
            email="moderator@example.com",
            password="test-pass",
        )
        job.apply_moderation(JobRequest.MODERATION_APPROVED, moderator, "Approved")
        job.refresh_from_db()

        self.assertTrue(job.is_active)
        self.assertIsNotNone(job.published_at)
        self.assertGreater(job.expires_at, timezone.now())

        visible_ids = list(view.get_queryset().values_list("id", flat=True))
        self.assertIn(job.id, visible_ids)

    def test_requested_changes_can_be_edited_and_are_resubmitted(self):
        job = self.submit_draft()
        job.apply_moderation(
            JobRequest.MODERATION_CHANGES_REQUESTED,
            note="Please clarify the scope.",
        )

        self.client.force_authenticate(self.customer_user)
        response = self.client.patch(
            f"/api/jobrequests/{job.id}/",
            {"description": "The scope now includes demolition, plumbing and tiling."},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        job.refresh_from_db()
        self.assertEqual(job.moderation_status, JobRequest.MODERATION_PENDING)
        self.assertEqual(job.moderation_note, "")
        self.assertFalse(job.is_active)
        self.assertIsNone(job.expires_at)

    def test_pending_job_cannot_be_unlocked_through_payment_api(self):
        job = self.submit_draft()
        self.client.force_authenticate(self.company_user)

        response = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": job.id},
            format="json",
        )

        self.assertEqual(response.status_code, 404)
