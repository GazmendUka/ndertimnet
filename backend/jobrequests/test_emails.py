import os
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse

from .emails import send_job_approval_preview_email, send_job_moderation_email
from .models import JobRequest


@override_settings(
    DEFAULT_FROM_EMAIL="no-reply@ndertimnet.com",
    FRONTEND_URL="https://ndertimnet.com",
)
class JobModerationEmailTests(SimpleTestCase):
    @patch.dict(os.environ, {"SENDGRID_API_KEY": "test-key"})
    @patch("jobrequests.emails.SendGridAPIClient")
    @patch("jobrequests.emails.Mail")
    def test_customer_approval_preview_uses_real_template_with_test_subject(
        self,
        mail_class,
        sendgrid_client_class,
    ):
        sendgrid_client_class.return_value.send.return_value.status_code = 202

        result = send_job_approval_preview_email(
            "admin@example.com",
            first_name="Arta",
        )

        self.assertEqual(result, 202)
        mail_kwargs = mail_class.call_args.kwargs
        self.assertEqual(mail_kwargs["to_emails"], "admin@example.com")
        self.assertEqual(
            mail_kwargs["subject"],
            "[TEST] Kërkesa juaj u miratua dhe u publikua – Ndërtimnet",
        )
        self.assertIn("Përshëndetje Arta", mail_kwargs["html_content"])
        self.assertIn("Platforma jonë është e re", mail_kwargs["html_content"])
        self.assertIn(
            "https://ndertimnet.com/customer/jobrequests",
            mail_kwargs["html_content"],
        )

    @patch.dict(
        os.environ,
        {
            "SENDGRID_API_KEY": "test-key",
            "JOB_REVIEW_NOTIFICATION_EMAILS": "info@ndertimnet.com",
            "BACKEND_BASE_URL": "https://api.ndertimnet.com",
        },
    )
    @patch("jobrequests.emails.SendGridAPIClient")
    @patch("jobrequests.emails.Mail")
    def test_new_job_notification_contains_minimal_review_details(
        self,
        mail_class,
        sendgrid_client_class,
    ):
        from .emails import send_new_job_review_notification

        job = SimpleNamespace(
            id=42,
            title="Renovimi i banjës",
        )
        sendgrid_client_class.return_value.send.return_value.status_code = 202

        result = send_new_job_review_notification(job)

        self.assertEqual(result, 202)
        mail_kwargs = mail_class.call_args.kwargs
        self.assertEqual(mail_kwargs["to_emails"], ["info@ndertimnet.com"])
        self.assertEqual(
            mail_kwargs["subject"],
            "Ny offertförfrågan #42 att granska – Ndërtimnet",
        )
        self.assertIn("Renovimi i banjës", mail_kwargs["html_content"])
        self.assertIn(
            "https://api.ndertimnet.com/admin/jobrequests/jobrequest/42/change/",
            mail_kwargs["html_content"],
        )
        self.assertNotIn("customer@example.com", mail_kwargs["html_content"])
        sendgrid_client_class.assert_called_once_with("test-key")
        sendgrid_client_class.return_value.send.assert_called_once_with(
            mail_class.return_value
        )

    @patch.dict(os.environ, {"SENDGRID_API_KEY": "test-key"})
    @patch("jobrequests.emails.SendGridAPIClient")
    @patch("jobrequests.emails.Mail")
    def test_approved_email_thanks_customer_and_explains_platform_growth(
        self,
        mail_class,
        sendgrid_client_class,
    ):
        job = SimpleNamespace(
            id=42,
            title="Renovimi i banjës",
            moderation_status="approved",
            moderation_note="",
            customer=SimpleNamespace(
                email="customer@example.com",
                first_name="Arta",
            ),
        )
        sendgrid_client_class.return_value.send.return_value.status_code = 202

        result = send_job_moderation_email(job)

        self.assertEqual(result, 202)
        mail_kwargs = mail_class.call_args.kwargs
        self.assertEqual(mail_kwargs["to_emails"], "customer@example.com")
        self.assertEqual(
            mail_kwargs["subject"],
            "Kërkesa juaj u miratua dhe u publikua – Ndërtimnet",
        )
        self.assertIn("Faleminderit që dërguat kërkesën tuaj", mail_kwargs["html_content"])
        self.assertIn("tani është publikuar në platformën tonë", mail_kwargs["html_content"])
        self.assertIn("Platforma jonë është e re", mail_kwargs["html_content"])
        self.assertIn("Numri i kompanive rritet çdo javë", mail_kwargs["html_content"])
        self.assertIn(
            "https://ndertimnet.com/customer/jobrequests/42",
            mail_kwargs["html_content"],
        )
        sendgrid_client_class.assert_called_once_with("test-key")
        sendgrid_client_class.return_value.send.assert_called_once_with(
            mail_class.return_value
        )


@override_settings(
    FRONTEND_URL="https://ndertimnet.com",
    STORAGES={
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    },
)
class JobRequestAdminEmailPreviewTests(TestCase):
    def setUp(self):
        self.admin_user = get_user_model().objects.create_superuser(
            email="admin-preview@example.com",
            password="test-pass",
            first_name="Admin",
        )
        self.client.force_login(self.admin_user)
        self.preview_url = reverse(
            "admin:jobrequests_jobrequest_send_customer_email_preview"
        )

    def test_preview_page_is_available_without_creating_job_request(self):
        response = self.client.get(self.preview_url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "admin-preview@example.com")
        self.assertEqual(JobRequest.objects.count(), 0)

    def test_preview_is_forbidden_for_staff_who_is_not_superuser(self):
        staff_user = get_user_model().objects.create_user(
            email="staff-preview@example.com",
            password="test-pass",
            is_staff=True,
        )
        self.client.force_login(staff_user)

        response = self.client.get(self.preview_url)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(JobRequest.objects.count(), 0)

    @patch("jobrequests.admin.send_job_approval_preview_email", return_value=202)
    def test_preview_sends_to_logged_in_superadmin_without_database_write(
        self,
        send_preview,
    ):
        response = self.client.post(self.preview_url, follow=True)

        self.assertEqual(response.status_code, 200)
        send_preview.assert_called_once_with(
            "admin-preview@example.com",
            first_name="Admin",
        )
        self.assertContains(
            response,
            "Förhandsvisningen skickades till admin-preview@example.com.",
        )
        self.assertEqual(JobRequest.objects.count(), 0)
