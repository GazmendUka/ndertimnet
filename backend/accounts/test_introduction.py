from unittest.mock import patch
from django.contrib.auth.models import Permission
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework.exceptions import ValidationError
from accounts.models import Company, User
from accounts.serializers import RegisterCompanySerializer
from main.models import CompanyIntroductionSettings


class CompanyIntroductionTests(APITestCase):
    def register(self, suffix, **extra):
        serializer = RegisterCompanySerializer(data={"email": f"intro-{suffix}@example.test", "password": "test-only-pass", "company_name": "Demo", **extra})
        serializer.is_valid(raise_exception=True)
        return serializer.save().company_profile

    def test_default_twenty_and_public_catalog(self):
        self.assertEqual(self.client.get('/api/billing/catalog/').data['introductory_offers'], 20)
        company = self.register('default', free_offers_remaining=999, introductory_offers_granted=999)
        self.assertEqual(company.free_offers_remaining, 20)
        self.assertEqual(company.introductory_offers_granted, 20)

    @patch('accounts.views.send_verification_email')
    def test_public_registration_grants_configured_quota_once(self, email):
        CompanyIntroductionSettings.objects.update_or_create(pk=1, defaults={'free_offers': 3})
        body = {'email': 'public-intro@example.test', 'password': 'test-only-pass', 'company_name': 'Demo', 'free_offers_remaining': 999}
        response = self.client.post('/api/accounts/register/company/', body, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        company = Company.objects.get(user__email=body['email'])
        self.assertEqual((company.free_offers_remaining, company.introductory_offers_granted), (3, 3))
        self.assertFalse(company.user.email_verified)
        email.assert_called_once()
        self.assertEqual(self.client.post('/api/accounts/register/company/', body, format='json').status_code, 400)
        self.assertEqual(Company.objects.filter(user__email=body['email']).count(), 1)

    def test_policy_changes_only_apply_to_later_registrations(self):
        first = self.register('twenty')
        first.free_offers_remaining = 17
        first.save(update_fields=['free_offers_remaining'])
        for allowance in (15, 10, 5, 3, 0, 20):
            CompanyIntroductionSettings.objects.update_or_create(pk=1, defaults={'free_offers': allowance})
            next_company = self.register(str(allowance))
            self.assertEqual(next_company.free_offers_remaining, allowance)
            self.assertEqual(next_company.introductory_offers_granted, allowance)
            self.assertEqual(self.client.get('/api/billing/catalog/').data['introductory_offers'], allowance)
            first.refresh_from_db()
            self.assertEqual((first.free_offers_remaining, first.introductory_offers_granted), (17, 20))

    def test_duplicate_and_reactivation_do_not_refill(self):
        company = self.register('once')
        company.free_offers_remaining = 2
        company.save(update_fields=['free_offers_remaining'])
        with self.assertRaises(ValidationError):
            self.register('once')
        company.user.is_active = False
        company.user.save(update_fields=['is_active'])
        with patch('accounts.services.reactivation.initiate_company_reactivation') as reactivate:
            with self.assertRaises(ValidationError):
                self.register('once')
            reactivate.assert_called_once()
        company.refresh_from_db()
        self.assertEqual(company.free_offers_remaining, 2)

    def test_company_creation_failure_rolls_back_user(self):
        with patch('accounts.serializers.Company.objects.create', side_effect=RuntimeError('test failure')):
            with self.assertRaises(RuntimeError):
                self.register('rollback')
        self.assertFalse(User.objects.filter(email='intro-rollback@example.test').exists())

    def test_admin_policy_validation_and_permission(self):
        staff = User.objects.create_user(email='intro-staff@example.test', password='test', is_staff=True)
        self.client.force_login(staff)
        url = '/admin/main/companyintroductionsettings/1/change/'
        self.assertEqual(self.client.get(url).status_code, 403)
        staff.user_permissions.add(Permission.objects.get(codename='change_companyintroductionsettings'))
        self.assertEqual(self.client.post(url, {'free_offers': 10, '_save': 'Save'}).status_code, 302)
        self.assertEqual(CompanyIntroductionSettings.current_allowance(), 10)
        self.assertEqual(self.client.post(url, {'free_offers': -1, '_save': 'Save'}).status_code, 200)
        self.assertEqual(CompanyIntroductionSettings.current_allowance(), 10)
        self.assertEqual(self.client.post(url, {'free_offers': 1001, '_save': 'Save'}).status_code, 200)
        self.assertEqual(CompanyIntroductionSettings.current_allowance(), 10)
        self.assertEqual(self.client.post('/admin/main/companyintroductionsettings/1/delete/', {'post': 'yes'}).status_code, 403)

