from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from locations.models import City
from taxonomy.models import Industry, Profession

from .models import Company


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
