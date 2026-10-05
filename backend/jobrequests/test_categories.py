from uuid import uuid4
from rest_framework.test import APITestCase
from payments.test_billing import BillingFixture
from taxonomy.models import Industry, Profession
from jobrequests.models import JobRequest, JobRequestDraft
from jobrequests.matching import company_category_query

class CategoryRequestTests(BillingFixture, APITestCase):
    def setUp(self):
        super().setUp()
        self.industry = Industry.objects.create(name='Renovim', slug='renovim')
        self.profession.industry = self.industry
        self.profession.save()

    def test_category_matches_any_specialist_in_the_same_category(self):
        self.job.profession = None
        self.job.industry = self.industry
        self.job.save()
        self.assertTrue(JobRequest.objects.filter(company_category_query(self.company), pk=self.job.pk).exists())
        other = Industry.objects.create(name='Pastrim', slug='pastrim')
        self.job.industry = other
        self.job.save()
        self.assertFalse(JobRequest.objects.filter(company_category_query(self.company), pk=self.job.pk).exists())

    def test_uncertain_and_mixed_projects_are_discoverable_without_fabricated_specialty(self):
        self.job.profession = None
        for mode in ['mixed','unsure']:
            self.job.category_mode = mode
            self.job.save()
            self.assertTrue(JobRequest.objects.filter(company_category_query(self.company), pk=self.job.pk).exists())

    def test_guest_category_import_preserves_choice_and_detects_changed_retry(self):
        self.client.force_authenticate(self.customer)
        data = dict(client_draft_id=str(uuid4()), title='Renovim shtepie', description='Dua te rinovoj dhomen e ndenjes.', city=self.city.pk, profession=None, industry=self.industry.pk, category_mode='')
        url='/api/jobrequests/drafts/import-guest/'
        response=self.client.post(url,data,format='json')
        self.assertEqual(response.status_code,201,response.data)
        self.assertEqual(response.data['industry'],self.industry.pk)
        self.assertIsNone(response.data['profession'])
        self.assertEqual(self.client.post(url,data,format='json').status_code,200)
        data.update(industry=None,category_mode='unsure')
        self.assertEqual(self.client.post(url,data,format='json').status_code,409)

    def test_inactive_category_is_rejected(self):
        self.industry.is_active=False
        self.industry.save()
        self.client.force_authenticate(self.customer)
        response=self.client.post('/api/jobrequests/drafts/',dict(industry=self.industry.pk),format='json')
        self.assertEqual(response.status_code,400)

    def test_specialty_filter_also_finds_broad_category_requests(self):
        from jobrequests.matching import profession_category_query
        self.job.profession = None
        self.job.industry = self.industry
        self.job.save()
        self.assertTrue(JobRequest.objects.filter(profession_category_query(self.profession.pk), pk=self.job.pk).exists())
