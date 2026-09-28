from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Company
from locations.models import City
from offers.models import Offer
from .models import JobRequest


class JobListingTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.customer = User.objects.create_user(email="listing@example.com", role="customer", email_verified=True)
        self.other = User.objects.create_user(email="other-listing@example.com", role="customer", email_verified=True)
        self.company_user = User.objects.create_user(email="company-listing@example.com", role="company", email_verified=True)
        self.company = Company.objects.create(user=self.company_user, company_name="Test company", is_active=True)
        self.city = City.objects.create(name="Listing test", slug="listing-test", country="XK")
        self.client.force_authenticate(self.customer)

    def job(self, **kwargs):
        values = dict(customer=self.customer, city=self.city, title="Test project", description="Test description")
        values.update(kwargs)
        return JobRequest.objects.create(**values)

    def test_all_pages_are_accessible_and_order_is_stable(self):
        jobs = [self.job() for _ in range(23)]
        self.job(customer=self.other)
        self.job(is_deleted=True)
        JobRequest.objects.all().update(created_at=timezone.now())
        ids = []
        for page, size in [(1, 10), (2, 10), (3, 3)]:
            response = self.client.get(f"/api/jobrequests/?mine=1&page={page}")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["count"], 23)
            self.assertEqual(len(response.data["results"]), size)
            ids.extend(row["id"] for row in response.data["results"])
        self.assertEqual(ids, [job.pk for job in reversed(jobs)])
        self.assertIsNone(response.data["next"])
        self.assertEqual(self.client.get("/api/jobrequests/?page=4").status_code, 404)

    def test_summary_counts_all_jobs_and_separates_lifecycle_from_moderation(self):
        for _ in range(12):
            self.job()
        self.job(status="in_progress", is_active=False)
        self.job(status="completed", is_completed=True, is_active=False)
        self.job(status="cancelled", is_active=False)
        self.job(is_active=False)
        for state in ("pending", "changes_requested", "rejected", "blocked"):
            self.job(moderation_status=state, is_active=False)
        self.job(customer=self.other)
        self.job(is_deleted=True)
        response = self.client.get("/api/jobrequests/summary/?customer=" + str(self.other.pk))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["stats"], dict(total=20, active=12, in_progress=1, completed=1, unpublished=4, closed=2))
        latest = response.data["latest_jobs"]
        self.assertEqual(len(latest), 5)
        expected = list(JobRequest.objects.filter(customer=self.customer, is_deleted=False).order_by("-created_at", "-pk").values_list("id", flat=True)[:5])
        self.assertEqual([row["id"] for row in latest], expected)
        for field in ("status", "is_completed", "created_at"):
            self.assertIn(field, latest[0])

    def test_empty_summary(self):
        response = self.client.get("/api/jobrequests/summary/")
        self.assertEqual(response.data["stats"]["total"], 0)
        self.assertEqual(response.data["latest_jobs"], [])

    def test_summary_requires_verified_customer(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get("/api/jobrequests/summary/").status_code, (401, 403))
        self.customer.email_verified = False
        self.customer.save()
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/jobrequests/summary/").status_code, 403)
        self.client.force_authenticate(self.company_user)
        with patch.object(Company, "can_access_marketplace", return_value=True):
            self.assertEqual(self.client.get("/api/jobrequests/summary/").status_code, 403)

    def test_company_filter_is_applied_before_pagination_without_changing_default_list(self):
        available = [self.job() for _ in range(13)]
        for _ in range(11):
            Offer.objects.create(company=self.company, job_request=self.job())
        self.job(moderation_status="pending", is_active=False)
        self.job(is_deleted=True)
        self.client.force_authenticate(self.company_user)
        with patch.object(Company, "can_access_marketplace", return_value=True):
            default = self.client.get("/api/jobrequests/")
            self.assertEqual(default.data["count"], 24)
            first = self.client.get("/api/jobrequests/?without_my_offer=1")
            second = self.client.get("/api/jobrequests/?without_my_offer=1&page=2")
        self.assertEqual(first.data["count"], 13)
        self.assertEqual(len(first.data["results"]), 10)
        self.assertEqual(len(second.data["results"]), 3)
        self.assertEqual({row["id"] for row in first.data["results"] + second.data["results"]}, {job.pk for job in available})

    def test_company_access_guard_still_applies(self):
        self.client.force_authenticate(self.company_user)
        self.assertEqual(self.client.get("/api/jobrequests/?without_my_offer=1").status_code, 403)
