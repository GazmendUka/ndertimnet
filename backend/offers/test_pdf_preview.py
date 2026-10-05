from rest_framework.test import APITestCase
from unittest.mock import patch
from payments.test_billing import BillingFixture

class OfferPdfPreviewTests(BillingFixture, APITestCase):
    def test_company_can_download_draft_without_customer_acceptance(self):
        r = self.client.get(f'/api/offers/{self.offer.pk}/pdf/?preview=1')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(b''.join(r.streaming_content).startswith(b'%PDF'))
        self.assertEqual(self.client.get(f'/api/offers/{self.offer.pk}/pdf/').status_code, 403)

    def test_preview_is_rendered_as_preview_not_accepted_contract(self):
        with patch('offers.views.build_offer_contract_pdf', return_value=b'%PDF-test') as render:
            self.assertEqual(self.client.get(f'/api/offers/{self.offer.pk}/pdf/?preview=1').status_code, 200)
            self.assertTrue(render.call_args.kwargs['preview'])

    def test_customer_cannot_download_company_draft_preview(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(f'/api/offers/{self.offer.pk}/pdf/?preview=1').status_code, 404)
