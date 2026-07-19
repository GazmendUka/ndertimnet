from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from io import StringIO
from unittest.mock import patch
from rest_framework.test import APITestCase

from locations.models import City
from taxonomy.models import Industry, Profession

from .models import Company, Customer


User = get_user_model()


class CompanyProfileWizardApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="wizard-company@example.com",
            password="test-pass",
            role="company",
        )
        self.company = Company.objects.create(
            user=self.user,
            company_name="Wizard Company",
        )
        self.url = "/api/accounts/profile/company/"

    def test_unverified_company_can_read_but_cannot_update_profile(self):
        self.client.force_authenticate(self.user)

        read_response = self.client.get(self.url)
        update_response = self.client.patch(
            self.url,
            {"phone": "+38344111222"},
            format="multipart",
        )

        self.assertEqual(read_response.status_code, 200)
        self.assertFalse(read_response.data["data"]["email_verified"])
        self.assertEqual(update_response.status_code, 403)

    @override_settings(
        STORAGES={
            "default": {
                "BACKEND": "django.core.files.storage.FileSystemStorage",
            },
        },
    )
    def test_profile_is_complete_without_optional_offer_text(self):
        self.user.email_verified = True
        self.user.save(update_fields=["email_verified"])
        city = City.objects.create(
            name="Prishtinë Wizard",
            slug="prishtine-wizard",
            country="XK",
        )
        industry = Industry.objects.create(
            name="Construction Wizard",
            slug="construction-wizard",
        )
        profession = Profession.objects.create(
            industry=industry,
            name="Builder Wizard",
            slug="builder-wizard",
        )
        self.company.org_number = "ORG-123"
        self.company.phone = "+38344111222"
        self.company.address = "Rruga Test 1"
        self.company.description = "A sufficiently detailed company description."
        self.company.registration_document = "company_documents/registration.pdf"
        self.company.save()
        self.company.cities.add(city)
        self.company.professions.add(profession)
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        sections = response.data["data"]["profile_sections"]
        self.assertFalse(sections["offer_text"])
        self.assertEqual(sections["completed"], 5)
        self.assertEqual(sections["total"], 5)
        self.assertEqual(sections["percentage"], 100)
        self.assertEqual(response.data["data"]["profile_completion"], 100)

    def test_verification_document_remains_required(self):
        self.user.email_verified = True
        self.user.save(update_fields=["email_verified"])
        city = City.objects.create(
            name="Prishtinë Required",
            slug="prishtine-required",
            country="XK",
        )
        industry = Industry.objects.create(
            name="Required Industry",
            slug="required-industry",
        )
        profession = Profession.objects.create(
            industry=industry,
            name="Required Profession",
            slug="required-profession",
        )
        self.company.org_number = "ORG-456"
        self.company.phone = "+38344999888"
        self.company.address = "Rruga Required 2"
        self.company.description = "A sufficiently detailed company description."
        self.company.save()
        self.company.cities.add(city)
        self.company.professions.add(profession)
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        sections = response.data["data"]["profile_sections"]
        self.assertFalse(sections["verification"])
        self.assertEqual(sections["completed"], 4)
        self.assertEqual(sections["percentage"], 80)
        self.assertEqual(response.data["data"]["profile_completion"], 80)


class ProfileCompletionReminderCommandTests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Prishtinë Reminder",
            slug="prishtine-reminder",
            country="XK",
        )
        self.industry = Industry.objects.create(
            name="Reminder Industry",
            slug="reminder-industry",
        )
        self.profession = Profession.objects.create(
            industry=self.industry,
            name="Reminder Profession",
            slug="reminder-profession",
        )

    def create_company_user(self, email, complete=False):
        user = User.objects.create_user(
            email=email,
            password="test-pass",
            role="company",
        )
        user.date_joined = timezone.now() - timezone.timedelta(days=2)
        user.email_verified = True
        user.save(update_fields=["date_joined", "email_verified"])
        company = Company.objects.create(user=user, company_name="Reminder Company")

        if complete:
            company.org_number = "ORG-REM"
            company.phone = "+38344111000"
            company.address = "Rruga Reminder"
            company.description = "A sufficiently detailed company description."
            company.registration_document = "company_documents/reminder.pdf"
            company.save()
            company.cities.add(self.city)
            company.professions.add(self.profession)
            company.profile_step = company.calculate_profile_step()
            company.save(update_fields=["profile_step"])

        return user

    def create_customer_user(self, email, complete=False):
        user = User.objects.create_user(
            email=email,
            password="test-pass",
            role="customer",
        )
        user.date_joined = timezone.now() - timezone.timedelta(days=2)
        user.save(update_fields=["date_joined"])
        customer = Customer.objects.create(user=user)

        if complete:
            user.first_name = "Test"
            user.last_name = "Customer"
            user.save(update_fields=["first_name", "last_name"])
            customer.phone = "+38344111222"
            customer.address = "Rruga Customer"
            customer.postal_code = "10000"
            customer.city = self.city
            customer.save()

        return user

    @patch("accounts.management.commands.send_profile_completion_reminders.send_profile_completion_reminder_email")
    def test_reminds_incomplete_accounts_and_updates_tracking(self, send_email):
        company_user = self.create_company_user("incomplete-company@example.com")
        customer_user = self.create_customer_user("incomplete-customer@example.com")
        self.create_company_user("complete-company@example.com", complete=True)

        output = StringIO()
        call_command("send_profile_completion_reminders", stdout=output)

        self.assertEqual(send_email.call_count, 2)
        company_user.refresh_from_db()
        customer_user.refresh_from_db()
        self.assertEqual(company_user.profile_completion_reminder_count, 1)
        self.assertIsNotNone(company_user.profile_completion_reminder_sent_at)
        self.assertEqual(customer_user.profile_completion_reminder_count, 1)
        self.assertIsNotNone(customer_user.profile_completion_reminder_sent_at)
        self.assertIn("Dërguar: 2", output.getvalue())

    @patch("accounts.management.commands.send_profile_completion_reminders.send_profile_completion_reminder_email")
    def test_does_not_resend_before_interval_or_after_max_reminders(self, send_email):
        recent_user = self.create_company_user("recent-reminder@example.com")
        recent_user.profile_completion_reminder_sent_at = timezone.now()
        recent_user.profile_completion_reminder_count = 1
        recent_user.save(update_fields=[
            "profile_completion_reminder_sent_at",
            "profile_completion_reminder_count",
        ])

        maxed_user = self.create_company_user("maxed-reminder@example.com")
        maxed_user.profile_completion_reminder_sent_at = timezone.now() - timezone.timedelta(days=10)
        maxed_user.profile_completion_reminder_count = 3
        maxed_user.save(update_fields=[
            "profile_completion_reminder_sent_at",
            "profile_completion_reminder_count",
        ])

        call_command("send_profile_completion_reminders")

        send_email.assert_not_called()
