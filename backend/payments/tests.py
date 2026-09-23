from decimal import Decimal
from unittest.mock import patch

from rest_framework.test import APITestCase

from accounts.models import Company, User
from jobrequests.models import JobRequest
from locations.models import City
from offers.models import Offer, OfferStatus, OfferVersion, PriceType
from payments.models import (
    LeadAccess,
    Payment,
    PaymentProvider,
    PaymentStatus,
    PaymentType,
)
from payments.services.raiaccept import RaiAcceptError
from taxonomy.models import Profession


class PaymentUnlockLeadTests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(name="Prishtina", slug="prishtina", country="XK")
        self.profession = Profession.objects.create(name="Renovim", slug="renovim")

        self.company_user = User.objects.create_user(
            email="company@example.com",
            password="pass123",
            role="company",
            email_verified=True,
        )
        self.company = Company.objects.create(
            user=self.company_user,
            company_name="Build Co",
            free_leads_remaining=2,
        )
        self.company.city = self.city
        self.company.description = "Experienced renovation company"
        self.company.phone = "+38344111222"
        self.company.profile_step = 4
        self.company.save()
        self.company.professions.add(self.profession)

        self.customer_user = User.objects.create_user(
            email="customer@example.com",
            password="pass123",
            role="customer",
            email_verified=True,
        )
        self.job = JobRequest.objects.create(
            customer=self.customer_user,
            title="Kitchen renovation",
            description="Renovate the kitchen",
            city=self.city,
            profession=self.profession,
        )




    @patch("payments.views.get_transaction_details")
    def test_raiaccept_webhook_opens_lead_after_success(self, get_transaction_details):
        get_transaction_details.return_value = {
            "transaction": {
                "transactionId": "tx_123",
                "transactionAmount": 4.95,
                "transactionCurrency": "EUR",
                "isProduction": False,
                "transactionType": "PURCHASE",
                "status": "SUCCESS",
                "statusCode": "0000",
            }
        }
        offer = Offer.objects.create(company=self.company, job_request=self.job)
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
            amount=Decimal("4.95"),
            currency="EUR",
            provider=PaymentProvider.RAIACCEPT,
            provider_reference="rai_order_123",
            status=PaymentStatus.PENDING,
        )

        response = self.client.post(
            "/api/payments/raiaccept/notify/",
            {
                "order": {
                    "orderIdentification": "rai_order_123",
                    "invoice": {
                        "merchantOrderReference": f"payment_{payment.id}",
                    },
                },
                "transaction": {
                    "transactionId": "tx_123",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        payment.refresh_from_db()
        offer.refresh_from_db()

        self.assertEqual(payment.status, PaymentStatus.PAID)
        self.assertTrue(offer.lead_unlocked)
        self.assertTrue(
            LeadAccess.objects.filter(company=self.company, job_request=self.job).exists()
        )

        self.company.refresh_from_db()
        self.assertEqual(self.company.free_leads_remaining, 2)

    def test_raiaccept_webhook_rejects_wrong_merchant_account(self):
        offer = Offer.objects.create(company=self.company, job_request=self.job)
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
            amount=Decimal("4.95"),
            currency="EUR",
            provider=PaymentProvider.RAIACCEPT,
            provider_reference="rai_order_123",
            status=PaymentStatus.PENDING,
        )

        with self.settings(RAIACCEPT_MERCHANT_ACCOUNT_ID="P-007-MA-yKgFZvpG"):
            response = self.client.post(
                "/api/payments/raiaccept/notify/",
                {
                    "order": {
                        "orderIdentification": "rai_order_123",
                        "invoice": {
                            "merchantOrderReference": f"payment_{payment.id}",
                        },
                    },
                    "transaction": {
                        "transactionId": "tx_123",
                    },
                    "merchant": {
                        "merchantAccountId": "other-merchant",
                    },
                },
                format="json",
            )

        self.assertEqual(response.status_code, 400)

        payment.refresh_from_db()
        offer.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertFalse(offer.lead_unlocked)

    def test_raiaccept_webhook_requires_merchant_identity_when_configured(self):
        offer = Offer.objects.create(company=self.company, job_request=self.job)
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
            amount=Decimal("4.95"),
            provider=PaymentProvider.RAIACCEPT,
            provider_reference="rai_order_missing_merchant",
        )

        with self.settings(RAIACCEPT_MERCHANT_ACCOUNT_ID="merchant-required"):
            response = self.client.post(
                "/api/payments/raiaccept/notify/",
                {
                    "order": {"orderIdentification": "rai_order_missing_merchant"},
                    "transaction": {"transactionId": "tx_missing_merchant"},
                },
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.PENDING)



    def test_company_can_view_payment_status_history_and_paid_receipt(self):
        offer = Offer.objects.create(
            company=self.company,
            job_request=self.job,
            lead_unlocked=True,
        )
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
            amount=Decimal("4.95"),
            currency="EUR",
            provider=PaymentProvider.RAIACCEPT,
            provider_reference="rai_order_receipt",
            provider_transaction_id="rai_tx_receipt",
            status=PaymentStatus.PENDING,
        )
        payment.mark_paid()
        self.client.force_authenticate(self.company_user)

        status_response = self.client.get(
            f"/api/payments/status/?job_request={self.job.id}"
        )
        history_response = self.client.get("/api/payments/history/")
        receipt_response = self.client.get(f"/api/payments/{payment.id}/receipt/")

        self.assertEqual(status_response.status_code, 200)
        self.assertFalse(status_response.data["lead_unlocked"])  # Payment alone does not send the offer.
        self.assertEqual(status_response.data["status"], PaymentStatus.PAID)
        self.assertEqual(history_response.status_code, 200)
        self.assertEqual(len(history_response.data), 1)
        self.assertEqual(receipt_response.status_code, 200)
        self.assertEqual(receipt_response.data["receipt_number"], payment.receipt_number)
        self.assertNotIn("provider_reference", receipt_response.data)
        self.assertNotIn("provider_transaction_id", receipt_response.data)

    @patch("payments.views.get_transaction_details")
    def test_canceled_webhook_is_recorded_and_can_be_retried(self, get_transaction_details):
        get_transaction_details.return_value = {
            "transaction": {
                "transactionId": "tx_canceled",
                "transactionType": "PURCHASE",
                "status": "CANCELED",
            }
        }
        offer = Offer.objects.create(company=self.company, job_request=self.job)
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
            amount=Decimal("4.95"),
            currency="EUR",
            provider=PaymentProvider.RAIACCEPT,
            provider_reference="rai_order_canceled",
            status=PaymentStatus.PENDING,
        )

        response = self.client.post(
            "/api/payments/raiaccept/notify/",
            {
                "order": {"orderIdentification": "rai_order_canceled"},
                "transaction": {"transactionId": "tx_canceled"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.CANCELED)
        self.assertEqual(payment.failure_code, "canceled")
        self.assertFalse(offer.lead_unlocked)

        self.client.force_authenticate(self.company_user)
        history = self.client.get("/api/payments/history/")
        self.assertTrue(history.data[0]["can_retry"])

    def test_paid_payment_cannot_be_downgraded_by_late_failure(self):
        offer = Offer.objects.create(
            company=self.company,
            job_request=self.job,
            lead_unlocked=True,
        )
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
            amount=Decimal("4.95"),
            provider=PaymentProvider.RAIACCEPT,
        )
        payment.mark_paid("rai_order_paid")
        original_paid_at = payment.paid_at

        payment.mark_failed("late_failure")
        payment.mark_canceled("late_cancel")
        payment.refresh_from_db()

        self.assertEqual(payment.status, PaymentStatus.PAID)
        self.assertEqual(payment.paid_at, original_paid_at)


    @patch("payments.views.get_transaction_details")
    def test_pending_and_failed_gateway_statuses_do_not_unlock_lead(self, get_transaction_details):
        offer = Offer.objects.create(company=self.company, job_request=self.job)
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
            amount=Decimal("4.95"),
            provider=PaymentProvider.RAIACCEPT,
            provider_reference="rai_order_statuses",
        )
        payload = {
            "order": {"orderIdentification": "rai_order_statuses"},
            "transaction": {"transactionId": "tx_statuses"},
        }

        get_transaction_details.return_value = {
            "transaction": {
                "transactionId": "tx_statuses",
                "transactionType": "PURCHASE",
                "status": "PENDING",
            }
        }
        pending = self.client.post(
            "/api/payments/raiaccept/notify/", payload, format="json"
        )
        payment.refresh_from_db()
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertFalse(offer.lead_unlocked)

        get_transaction_details.return_value["transaction"]["status"] = "FAILED"
        failed = self.client.post(
            "/api/payments/raiaccept/notify/", payload, format="json"
        )
        payment.refresh_from_db()
        self.assertEqual(failed.status_code, 200)
        self.assertEqual(payment.status, PaymentStatus.FAILED)
        self.assertEqual(payment.failure_code, "failed")
        self.assertFalse(offer.lead_unlocked)

    def test_payment_records_are_private_to_the_company(self):
        offer = Offer.objects.create(company=self.company, job_request=self.job)
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
            amount=Decimal("4.95"),
            provider=PaymentProvider.RAIACCEPT,
            status=PaymentStatus.PAID,
        )

        self.client.force_authenticate(self.customer_user)
        history = self.client.get("/api/payments/history/")
        receipt = self.client.get(f"/api/payments/{payment.id}/receipt/")

        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data, [])
        self.assertEqual(receipt.status_code, 404)

    def _accepted_offer(self, *, price_type=PriceType.FIXED, price="1250.00"):
        offer = Offer.objects.create(company=self.company, job_request=self.job)
        version = OfferVersion.objects.create(
            offer=offer,
            version_number=1,
            price_type=price_type,
            price_amount=Decimal(price),
            currency="EUR",
            is_signed=True,
            created_by=self.company_user,
        )
        offer.current_version = version
        offer.status = OfferStatus.ACCEPTED
        offer.save()
        return offer





    @patch("payments.views.get_transaction_details")
    def test_job_payment_webhook_marks_paid_without_unlocking_a_lead(self, get_transaction_details):
        get_transaction_details.return_value = {
            "transaction": {
                "transactionId": "tx_job_paid",
                "transactionAmount": 1250.0,
                "transactionCurrency": "EUR",
                "isProduction": False,
                "transactionType": "PURCHASE",
                "status": "SUCCESS",
                "statusCode": "0000",
            }
        }
        offer = self._accepted_offer()
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            payer_user=self.customer_user,
            type=PaymentType.JOB_PAYMENT,
            amount=Decimal("1250.00"),
            currency="EUR",
            provider=PaymentProvider.RAIACCEPT,
            provider_reference="rai_job_order_paid",
        )

        response = self.client.post(
            "/api/payments/raiaccept/notify/",
            {
                "order": {
                    "orderIdentification": "rai_job_order_paid",
                    "invoice": {"merchantOrderReference": f"payment_{payment.id}"},
                },
                "transaction": {"transactionId": "tx_job_paid"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        offer.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.PAID)
        self.assertFalse(offer.lead_unlocked)

    @patch("payments.views.get_transaction_details")
    def test_success_status_with_wrong_amount_is_not_confirmed(self, get_transaction_details):
        get_transaction_details.return_value = {
            "transaction": {
                "transactionId": "tx_wrong_amount",
                "transactionAmount": 1.0,
                "transactionCurrency": "EUR",
                "isProduction": False,
                "transactionType": "PURCHASE",
                "status": "SUCCESS",
                "statusCode": "0000",
            }
        }
        offer = self._accepted_offer()
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            payer_user=self.customer_user,
            type=PaymentType.JOB_PAYMENT,
            amount=Decimal("1250.00"),
            currency="EUR",
            provider=PaymentProvider.RAIACCEPT,
            provider_reference="rai_job_wrong_amount",
        )

        response = self.client.post(
            "/api/payments/raiaccept/notify/",
            {
                "order": {"orderIdentification": "rai_job_wrong_amount"},
                "transaction": {"transactionId": "tx_wrong_amount"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertEqual(payment.failure_code, "verification_mismatch")

    def test_customer_can_only_view_own_job_payment_history_status_and_receipt(self):
        offer = self._accepted_offer()
        payment = Payment.objects.create(
            offer=offer,
            company=self.company,
            payer_user=self.customer_user,
            type=PaymentType.JOB_PAYMENT,
            amount=Decimal("1250.00"),
            currency="EUR",
            provider=PaymentProvider.RAIACCEPT,
        )
        payment.mark_paid("rai_job_order_receipt")
        self.client.force_authenticate(self.customer_user)

        status_response = self.client.get(f"/api/payments/job-status/?offer={offer.id}")
        history_response = self.client.get("/api/payments/history/")
        receipt_response = self.client.get(f"/api/payments/{payment.id}/receipt/")

        self.assertEqual(status_response.status_code, 200)
        self.assertEqual(status_response.data["status"], PaymentStatus.PAID)
        self.assertEqual(history_response.status_code, 200)
        self.assertEqual(len(history_response.data), 1)
        self.assertEqual(receipt_response.status_code, 200)
        self.assertEqual(receipt_response.data["receipt_number"], payment.receipt_number)
