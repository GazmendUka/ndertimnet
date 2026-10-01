"""Local fixtures only. Providers are mocked; no real notifications or payments."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from io import BytesIO
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4
import tempfile

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.urls import reverse
from django.db import connection, connections, transaction
from django.test import override_settings, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APITestCase, APITransactionTestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from accounts.models import User, Company, Customer, PortfolioProject, AccountDeletionRequest
from accounts.serializers import PublicCompanySerializer
from accounts.services.deletion import request_deletion, process_deletion
from accounts.utils.email_verification import generate_email_verification_token
from jobrequests.models import JobRequest, JobRequestDraft
from locations.models import City
from taxonomy.models import Profession
from offers.models import Offer, OfferVersion
from pushnotifications.models import NotificationEvent, NotificationDevice, NotificationPreference
from pushnotifications.services import schedule_push_notification
from pushnotifications.queue import process_one
from main.marketplace_metrics import marketplace_metrics


class Fixtures:
    def setUp(self):
        super().setUp()
        self.customer = User.objects.create_user(email="customer@example.test", password="local-test", role="customer", email_verified=True, first_name="Test", last_name="Customer")
        Customer.objects.create(user=self.customer, phone="000000", address="Test address")
        self.user = User.objects.create_user(email="company@example.test", password="local-test", role="company", email_verified=True)
        self.city = City.objects.create(name="Test city", slug="test-city", country="XK")
        self.profession = Profession.objects.create(name="Renovation", slug="test-renovation")
        self.company = Company.objects.create(user=self.user, company_name="Test Company", phone="000000", description="Experienced renovation team for local projects.", city=self.city, profile_step=4)
        self.company.professions.add(self.profession)
        self.company.cities.add(self.city)
        self.job = JobRequest.objects.create(customer=self.customer, city=self.city, profession=self.profession, title="Local test project", description="A renovation project for automated tests.", published_at=timezone.now()-timedelta(hours=4))

    def offer(self):
        offer = Offer.objects.create(company=self.company, job_request=self.job)
        version = OfferVersion.objects.create(offer=offer, version_number=1, price_amount="1000", is_signed=True, signed_at=timezone.now()-timedelta(hours=2), created_by=self.user)
        offer.current_version = version
        offer.status = "signed"
        offer.save()
        return offer


class GuestAndFilterTests(Fixtures, APITestCase):
    def payload(self):
        return dict(client_draft_id=str(uuid4()), title="New test project", description="A sufficiently detailed renovation description.", city=self.city.pk, profession=self.profession.pk)

    def test_guest_import_is_private_idempotent_and_does_not_publish(self):
        payload = self.payload()
        url = "/api/jobrequests/drafts/import-guest/"
        self.assertEqual(self.client.post(url, payload).status_code, 401)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(url, payload).status_code, 403)
        self.client.force_authenticate(self.customer)
        first = self.client.post(url, payload)
        self.assertEqual(first.status_code, 201, first.data)
        again = self.client.post(url, payload)
        self.assertEqual(again.status_code, 200, again.data)
        self.assertEqual(first.data["id"], again.data["id"])
        self.assertEqual(JobRequestDraft.objects.count(), 1)
        self.assertEqual(JobRequest.objects.count(), 1)
        other = User.objects.create_user(email="other@example.test", role="customer")
        self.client.force_authenticate(other)
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotEqual(response.data["id"], first.data["id"])
        self.assertEqual(self.client.get(f'/api/jobrequests/drafts/{first.data["id"]}/').status_code, 404)

    def test_edited_guest_retry_preserves_original_and_requires_explicit_copy(self):
        self.client.force_authenticate(self.customer)
        url = "/api/jobrequests/drafts/import-guest/"
        payload = self.payload()
        first = self.client.post(url, payload)
        other_city = City.objects.create(name="Other", slug="other-guest", country="XK")
        other_profession = Profession.objects.create(name="Other service", slug="other-guest")
        for field, value in [("title", "Updated project title"), ("description", "Changed description after losing a network response."), ("city", other_city.pk), ("profession", other_profession.pk)]:
            with self.subTest(field=field):
                response = self.client.post(url, {**payload, field: value})
                self.assertEqual(response.status_code, 409, response.data)
                self.assertEqual(response.data["code"], "guest_draft_conflict")
                self.assertEqual(response.data["draft"], first.data)
                self.assertEqual(JobRequestDraft.objects.count(), 1)
        original = JobRequestDraft.objects.get()
        self.assertEqual(original.description, payload["description"])
        edited = {**payload, "description": "New description explicitly saved as a separate draft.", "client_draft_id": str(uuid4())}
        copied = self.client.post(url, edited)
        self.assertEqual(copied.status_code, 201, copied.data)
        self.assertNotEqual(copied.data["id"], original.pk)
        self.assertEqual(self.client.post(url, edited).status_code, 200)
        self.assertEqual(JobRequestDraft.objects.count(), 2)
        self.assertEqual(JobRequest.objects.count(), 1)

    def test_guest_retry_does_not_overwrite_advanced_server_draft(self):
        self.client.force_authenticate(self.customer)
        payload = self.payload()
        url = "/api/jobrequests/drafts/import-guest/"
        self.client.post(url, payload)
        draft = JobRequestDraft.objects.get()
        draft.description = "Updated on the server from another browser tab."
        draft.current_step = 3
        draft.address = "Test address entered in later step"
        draft.save()
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, 409, response.data)
        draft.refresh_from_db()
        self.assertEqual(draft.description, "Updated on the server from another browser tab.")
        self.assertEqual(draft.current_step, 3)
        self.assertEqual(draft.address, "Test address entered in later step")

    def test_guest_retry_normalizes_whitespace_and_preserves_submitted_job(self):
        self.client.force_authenticate(self.customer)
        payload = self.payload()
        url = "/api/jobrequests/drafts/import-guest/"
        self.client.post(url, payload)
        normalized = {**payload, "title": f'  {payload["title"]}  ', "description": f' {payload["description"]} '}
        self.assertEqual(self.client.post(url, normalized).status_code, 200)
        draft = JobRequestDraft.objects.get()
        draft.is_submitted = True
        draft.submitted_job = self.job
        draft.save()
        retry = self.client.post(url, payload)
        self.assertEqual(retry.status_code, 200, retry.data)
        self.assertEqual(retry.data["submitted_job"], self.job.pk)
        changed = self.client.post(url, {**payload, "description": "New local description for an already submitted draft."})
        self.assertEqual(changed.status_code, 409, changed.data)
        self.assertEqual(changed.data["draft"]["submitted_job"], self.job.pk)
        self.job.refresh_from_db()
        self.assertEqual(self.job.description, "A renovation project for automated tests.")
        self.assertEqual(JobRequestDraft.objects.count(), 1)

    def test_invalid_guest_import_never_saves(self):
        self.client.force_authenticate(self.customer)
        for field, value in [("client_draft_id", "bad"), ("city", 99999), ("title", "x"), ("description", "x"), ("description", "x"*10001)]:
            payload = self.payload(); payload[field] = value
            self.assertEqual(self.client.post("/api/jobrequests/drafts/import-guest/", payload).status_code, 400)
        self.profession.is_active = False; self.profession.save()
        self.assertEqual(self.client.post("/api/jobrequests/drafts/import-guest/", self.payload()).status_code, 400)
        self.assertFalse(JobRequestDraft.objects.exists())

    def test_filters_before_pagination_preserve_visibility(self):
        other_city = City.objects.create(name="Other", slug="other-test", country="XK")
        JobRequest.objects.create(customer=self.customer, city=other_city, profession=self.profession, title="Wrong city")
        hidden = JobRequest.objects.create(customer=self.customer, city=self.city, profession=self.profession, title="Pending", moderation_status="pending")
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/jobrequests/", {"recommended": "1"})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.job.pk)
        self.assertEqual(self.client.get(f"/api/jobrequests/{hidden.pk}/").status_code, 404)
        self.assertEqual(self.client.get("/api/jobrequests/", {"city": "bad"}).status_code, 400)
        response = self.client.get("/api/jobrequests/", {"city": other_city.pk})
        self.assertEqual(response.data["count"], 1)
        self.company.professions.set([Profession.objects.create(name="Different", slug="different-test")])
        self.assertEqual(self.client.get("/api/jobrequests/?recommended=1").data["count"], 0)


class PortfolioTests(Fixtures, APITestCase):
    def setUp(self):
        super().setUp()
        self.media = tempfile.TemporaryDirectory(); self.addCleanup(self.media.cleanup)
        settings = override_settings(MEDIA_ROOT=self.media.name, STORAGES={"default": {"BACKEND": "django.core.files.storage.FileSystemStorage"}})
        settings.enable(); self.addCleanup(settings.disable)
        self.client.force_authenticate(self.user)

    def upload(self):
        raw = BytesIO(); Image.new("RGB", (50, 40), "red").save(raw, "PNG")
        return {"title": "Reference project", "description": "Completed renovation.", "image": SimpleUploadedFile("photo.png", raw.getvalue(), content_type="image/png"), "approved": "true"}

    def test_image_is_reencoded_and_owner_cannot_approve(self):
        response = self.client.post("/api/accounts/portfolio/", self.upload(), format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        item = PortfolioProject.objects.get()
        self.assertFalse(item.approved)
        self.assertTrue(item.image.name.endswith(".jpg"))
        self.assertEqual(PublicCompanySerializer(self.company).data["portfolio"], [])
        item.approved = True; item.save()
        self.assertEqual(len(PublicCompanySerializer(self.company).data["portfolio"]), 1)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.delete(f"/api/accounts/portfolio/{item.pk}/").status_code, 404)
        self.assertEqual(self.client.get("/api/accounts/portfolio/").data, [])
        self.client.force_authenticate(self.user)
        storage, name = item.image.storage, item.image.name
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.delete(f"/api/accounts/portfolio/{item.pk}/").status_code, 204)
        self.assertFalse(storage.exists(name))

    def test_bad_image_and_unverified_company_rejected(self):
        data = self.upload(); data["image"] = SimpleUploadedFile("x.png", b"not an image", content_type="image/png")
        self.assertEqual(self.client.post("/api/accounts/portfolio/", data).status_code, 400)
        self.user.email_verified = False; self.user.save()
        self.assertEqual(self.client.post("/api/accounts/portfolio/", self.upload()).status_code, 403)
        self.assertFalse(PortfolioProject.objects.exists())

    def test_portfolio_file_deletion_retries_after_storage_failure(self):
        from accounts.models import AccountFileErasure
        from io import StringIO
        self.client.post("/api/accounts/portfolio/", self.upload(), format="multipart")
        item = PortfolioProject.objects.get()
        name = item.image.name
        with patch("accounts.services.deletion.default_storage.delete", side_effect=OSError("offline")):
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(self.client.delete(f"/api/accounts/portfolio/{item.pk}/").status_code, 204)
        self.assertFalse(PortfolioProject.objects.exists())
        task = AccountFileErasure.objects.get()
        self.assertIsNone(task.completed_at)
        with patch("accounts.services.deletion.default_storage.delete") as erase:
            call_command("process_account_deletions", stdout=StringIO())
            erase.assert_called_once_with(name)
        task.refresh_from_db()
        self.assertIsNotNone(task.completed_at)
        self.assertEqual(task.name, "")


class DeletionTests(Fixtures, APITestCase):
    def test_password_required_and_all_tokens_revoked_then_actual_erasure(self):
        self.client.force_authenticate(self.customer)
        url = "/api/accounts/account/delete/"
        self.assertEqual(self.client.post(url, {"password": "wrong"}).status_code, 400)
        self.assertFalse(AccountDeletionRequest.objects.exists())
        tokens = [RefreshToken.for_user(self.customer), RefreshToken.for_user(self.customer)]
        response = self.client.post(url, {"password": "local-test"})
        self.assertEqual(response.status_code, 202, response.data)
        for token in tokens:
            self.assertTrue(BlacklistedToken.objects.filter(token__jti=token["jti"]).exists())
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_active)
        self.client.force_authenticate(None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens[0].access_token}")
        self.assertEqual(self.client.get("/api/accounts/me/").status_code, 401)
        request = AccountDeletionRequest.objects.get()
        process_deletion(request.pk)
        self.assertFalse(User.objects.filter(pk=self.customer.pk).exists())
        self.assertFalse(JobRequest.objects.filter(pk=self.job.pk).exists())
        request.refresh_from_db(); self.assertEqual(request.status, "completed")
        process_deletion(request.pk)  # safe repeat

    @patch("accounts.views.send_verification_email")
    def test_deleted_account_cannot_be_reactivated(self, mail):
        token = generate_email_verification_token(self.customer)
        request_deletion(self.customer)
        self.assertEqual(self.client.post("/api/accounts/verify-email/", {"token": token}).status_code, 400)
        self.client.post("/api/accounts/register/customer/", {"email": self.customer.email, "password": "new-test-password"})
        mail.assert_not_called()
        self.customer.refresh_from_db(); self.assertFalse(self.customer.is_active)

    def test_business_records_go_to_review_not_cascade(self):
        offer = self.offer()
        request = request_deletion(self.user)
        process_deletion(request.pk)
        request.refresh_from_db()
        self.assertEqual(request.status, "needs_review")
        self.assertTrue(Offer.objects.filter(pk=offer.pk).exists())
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_failed_storage_cleanup_is_persisted_and_retried(self):
        self.company.logo = "company/test-only.png"; self.company.save()
        request = request_deletion(self.user)
        with patch("accounts.services.deletion.default_storage.delete", side_effect=OSError("offline")):
            process_deletion(request.pk)
        request.refresh_from_db(); self.assertEqual(request.status, "erasing_files")
        self.assertEqual(request.files.filter(completed_at__isnull=True).count(), 1)
        with patch("accounts.services.deletion.default_storage.delete") as erase:
            process_deletion(request.pk)
            erase.assert_called_once_with("company/test-only.png")
        request.refresh_from_db(); self.assertEqual(request.status, "completed")

    def test_legacy_business_records_also_require_review(self):
        from leads.models import LeadMatch
        match = LeadMatch.objects.create(company=self.company, job_request=self.job)
        request = request_deletion(self.customer)
        process_deletion(request.pk)
        request.refresh_from_db()
        self.assertEqual(request.status, "needs_review")
        self.assertTrue(LeadMatch.objects.filter(pk=match.pk).exists())


@override_settings(PUSH_NOTIFICATIONS_ENABLED=True, FIREBASE_PROJECT_ID="test-only")
class NotificationQueueTests(Fixtures, APITestCase):
    def event(self):
        return schedule_push_notification(user=self.user, category="offer_updates", title="Test", body="Test", event_key="stable-key")[0]

    def device(self, name):
        return NotificationDevice.objects.create(user=self.user, token="test-token-"+name, platform="android")

    def test_event_deduplicates_and_rolls_back_with_business_operation(self):
        self.assertEqual(self.event().pk, self.event().pk)
        try:
            with transaction.atomic():
                schedule_push_notification(user=self.user, category="offer_updates", title="x", body="x", event_key="rolled-back")
                raise ValueError()
        except ValueError:
            pass
        self.assertEqual(NotificationEvent.objects.count(), 1)

    @patch("pushnotifications.queue.send_push_notification", return_value=1)
    def test_retry_only_failed_device_and_stop_after_success(self, send):
        self.device("a"); self.device("b"); event = self.event()
        self.assertTrue(process_one())
        send.side_effect = OSError("offline")
        self.assertTrue(process_one())
        self.assertEqual(event.deliveries.filter(status="sent").count(), 1)
        self.assertFalse(process_one())
        NotificationEvent.objects.filter(pk=event.pk).update(next_attempt_at=timezone.now())
        send.side_effect = None
        self.assertTrue(process_one()); self.assertFalse(process_one())
        self.assertEqual(event.deliveries.filter(status="sent").count(), 2)
        self.assertEqual(send.call_count, 3)

    @patch("pushnotifications.queue.send_push_notification")
    def test_opt_out_cancels_queued_delivery_and_registration_does_not_reenable(self, send):
        self.device("a"); self.event()
        NotificationPreference.objects.create(user=self.user, push_enabled=False)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post("/api/notifications/devices/register/", {"token": "x"*100, "platform": "android", "device_id": "other-device"}).status_code, 201)
        self.assertFalse(NotificationPreference.objects.get(user=self.user).push_enabled)
        self.assertTrue(process_one()); send.assert_not_called()
        self.assertIsNotNone(NotificationEvent.objects.get().finished_at)

    @patch("pushnotifications.queue.send_push_notification", side_effect=OSError("offline"))
    def test_retry_limit_is_bounded(self, send):
        self.device("a"); event = self.event()
        for _ in range(8):
            NotificationEvent.objects.filter(pk=event.pk).update(next_attempt_at=timezone.now())
            self.assertTrue(process_one())
        self.assertFalse(process_one())
        self.assertEqual(event.deliveries.get().status, "failed")

    def test_opted_out_events_are_not_stored_for_later_enable(self):
        pref = NotificationPreference.objects.create(user=self.user, push_enabled=False)
        self.assertIsNone(schedule_push_notification(user=self.user, category="offer_updates", title="Test", body="Test"))
        pref.push_enabled = True; pref.offer_updates = False; pref.save()
        self.assertIsNone(schedule_push_notification(user=self.user, category="offer_updates", title="Test", body="Test"))
        self.assertFalse(NotificationEvent.objects.exists())

    @override_settings(PUSH_NOTIFICATIONS_ENABLED=False)
    @patch("pushnotifications.queue.send_push_notification")
    def test_disabled_provider_still_expires_old_events_without_sending(self, send):
        from io import StringIO
        event = self.event()
        NotificationEvent.objects.filter(pk=event.pk).update(created_at=timezone.now()-timedelta(days=8))
        event.deliveries.create(device=self.device("old"))
        call_command("process_notifications", stdout=StringIO())
        event.refresh_from_db()
        self.assertIsNotNone(event.finished_at)
        self.assertEqual(event.deliveries.get().status, "failed")
        send.assert_not_called()


class MetricsTests(Fixtures, APITestCase):
    def test_admin_report_renders_and_rejects_non_superuser(self):
        url = reverse("admin:jobrequests_marketplace_metrics")
        self.customer.is_staff = True; self.customer.save()
        self.client.force_login(self.customer)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/marketplace/metrics/").status_code, 403)
        self.customer.is_superuser = True; self.customer.save()
        response = self.client.get(url, {"days": "90"})
        self.assertContains(response, "Marknadsplatsens statistik")
        self.assertContains(response, "Underlag saknas")
        self.assertContains(response, "90 dagarna")

    def test_staff_only_precise_first_offer_timing_and_no_customer_data(self):
        self.offer()
        report = marketplace_metrics()
        self.assertEqual(report["jobs_with_offer"], 1)
        self.assertEqual(report["mean_hours_to_first_offer"], 2)
        self.assertIsNone(report["draft_submission_percent"])
        self.assertNotIn(self.customer.email, str(report))
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/marketplace/metrics/").status_code, 403)
        self.customer.is_staff = True; self.customer.is_superuser = True; self.customer.save()
        self.assertEqual(self.client.get("/api/marketplace/metrics/?days=7").status_code, 200)
        self.assertEqual(self.client.get("/api/marketplace/metrics/?days=0").status_code, 400)


@skipUnlessDBFeature("has_select_for_update")
class ConcurrencyTests(Fixtures, APITransactionTestCase):
    def race(self, function):
        gate = Barrier(2)
        def run(index):
            connections.close_all()
            try:
                gate.wait(timeout=10)
                return function(index)
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(run, i) for i in range(2)]
            return [future.result(timeout=30) for future in futures]

    def test_two_acceptance_routes_one_decision_notification(self):
        offer = self.offer()
        def action(i):
            client = APIClient(); client.force_authenticate(User.objects.get(pk=self.customer.pk))
            if i:
                response = client.post(f"/api/jobrequests/{self.job.pk}/accept-offer/", {"offer_id": offer.pk, "version_id": offer.current_version_id})
            else:
                response = client.post(f"/api/offers/{offer.pk}/decision/", {"decision": "accept", "version_id": offer.current_version_id})
            return response.status_code, response.data
        results = self.race(action)
        self.assertEqual([r[0] for r in results], [200, 200], results)
        self.assertEqual(NotificationEvent.objects.filter(key__contains=":decision:").count(), 1)

    @override_settings(PUSH_NOTIFICATIONS_ENABLED=True, FIREBASE_PROJECT_ID="test-only")
    @patch("pushnotifications.queue.send_push_notification", return_value=1)
    def test_two_workers_do_not_deliver_same_event_concurrently(self, send):
        NotificationDevice.objects.create(user=self.user, token="test-device", platform="android")
        schedule_push_notification(user=self.user, category="offer_updates", title="Test", body="Test", event_key="concurrent")
        self.race(lambda _: process_one())
        self.assertEqual(send.call_count, 1)

    def test_simultaneous_guest_imports_create_one_draft(self):
        payload = dict(client_draft_id=str(uuid4()), title="Test draft", description="Detailed draft for concurrency tests.", city=self.city.pk, profession=self.profession.pk)
        def action(_):
            client = APIClient(); client.force_authenticate(User.objects.get(pk=self.customer.pk))
            return client.post("/api/jobrequests/drafts/import-guest/", payload).status_code
        self.assertEqual(sorted(self.race(action)), [200, 201])
        self.assertEqual(JobRequestDraft.objects.count(), 1)

    def test_simultaneous_different_guest_imports_preserve_winner_and_report_conflict(self):
        payload = dict(client_draft_id=str(uuid4()), title="Test draft", city=self.city.pk, profession=self.profession.pk)
        descriptions = ["First detailed version of the local draft.", "Second detailed version of the local draft."]
        def action(index):
            client = APIClient(); client.force_authenticate(User.objects.get(pk=self.customer.pk))
            response = client.post("/api/jobrequests/drafts/import-guest/", {**payload, "description": descriptions[index]})
            return response.status_code, response.data
        results = self.race(action)
        self.assertEqual(sorted(result[0] for result in results), [201, 409], results)
        draft = JobRequestDraft.objects.get()
        winner = next(index for index, result in enumerate(results) if result[0] == 201)
        self.assertEqual(draft.description, descriptions[winner])
        self.assertEqual(results[1-winner][1]["draft"]["id"], draft.pk)
        self.assertEqual(results[1-winner][1]["code"], "guest_draft_conflict")
