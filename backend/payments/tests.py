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

    def test_unlock_lead_writes_payment_and_access_state(self):
        self.client.force_authenticate(self.company_user)

        response = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": self.job.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        offer = Offer.objects.get(company=self.company, job_request=self.job)
        self.assertTrue(offer.lead_unlocked)
        self.assertTrue(
            LeadAccess.objects.filter(company=self.company, job_request=self.job).exists()
        )
        self.assertTrue(
            Payment.objects.filter(
                offer=offer,
                company=self.company,
                type=PaymentType.UNLOCK_LEAD,
                status=PaymentStatus.PAID,
            ).exists()
        )

        self.company.refresh_from_db()
        self.assertEqual(self.company.free_leads_remaining, 1)

    def test_unlock_lead_is_idempotent_after_success(self):
        self.client.force_authenticate(self.company_user)

        self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": self.job.id},
            format="json",
        )
        response = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": self.job.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.company.refresh_from_db()
        self.assertEqual(self.company.free_leads_remaining, 1)
        self.assertEqual(
            Payment.objects.filter(company=self.company, type=PaymentType.UNLOCK_LEAD).count(),
            1,
        )
        self.assertEqual(
            LeadAccess.objects.filter(company=self.company, job_request=self.job).count(),
            1,
        )

    @patch("payments.views.create_checkout")
    def test_unlock_lead_creates_raiaccept_checkout_when_free_leads_are_used(self, create_checkout):
        create_checkout.return_value = {
            "order_id": "rai_order_123",
            "session_id": "rai_session_123",
            "payment_url": "https://checkout.raiaccept.test/session",
        }
        self.company.free_leads_remaining = 0
        self.company.save(update_fields=["free_leads_remaining"])
        self.client.force_authenticate(self.company_user)

        response = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": self.job.id},
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertTrue(response.data["requires_payment"])
        self.assertEqual(response.data["payment_url"], "https://checkout.raiaccept.test/session")
        self.assertEqual(response.data["payment_amount"], "4.95")

        offer = Offer.objects.get(company=self.company, job_request=self.job)
        self.assertFalse(offer.lead_unlocked)
        self.assertFalse(
            LeadAccess.objects.filter(company=self.company, job_request=self.job).exists()
        )

        payment = Payment.objects.get(
            offer=offer,
            company=self.company,
            type=PaymentType.UNLOCK_LEAD,
        )

        self.assertEqual(payment.amount, Decimal("4.95"))
        self.assertEqual(payment.provider, PaymentProvider.RAIACCEPT)
        self.assertEqual(payment.provider_reference, "rai_order_123")
        self.assertEqual(payment.status, PaymentStatus.PENDING)

        self.company.refresh_from_db()
        self.assertEqual(self.company.free_leads_remaining, 0)

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

    @patch("payments.views.create_checkout")
    def test_repeated_pending_unlock_reuses_the_same_checkout(self, create_checkout):
        create_checkout.return_value = {
            "order_id": "rai_order_reused",
            "session_id": "rai_session_reused",
            "payment_url": "https://checkout.raiaccept.test/reused-session",
        }
        self.company.free_leads_remaining = 0
        self.company.save(update_fields=["free_leads_remaining"])
        self.client.force_authenticate(self.company_user)

        first = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": self.job.id, "platform": "web"},
            format="json",
        )
        second = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": self.job.id, "platform": "web"},
            format="json",
        )

        self.assertEqual(first.status_code, 202)
        self.assertEqual(second.status_code, 202)
        self.assertEqual(first.data["payment_url"], second.data["payment_url"])
        create_checkout.assert_called_once()
        self.assertEqual(
            Payment.objects.filter(company=self.company, type=PaymentType.UNLOCK_LEAD).count(),
            1,
        )

    @patch("payments.views.create_checkout")
    def test_native_paid_lead_unlock_requires_store_billing(self, create_checkout):
        self.company.free_leads_remaining = 0
        self.company.save(update_fields=["free_leads_remaining"])
        self.client.force_authenticate(self.company_user)

        response = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": self.job.id, "platform": "ios"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "store_billing_required")
        create_checkout.assert_not_called()
        self.assertFalse(Payment.objects.filter(company=self.company).exists())

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
        self.assertTrue(status_response.data["lead_unlocked"])
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

    @patch("payments.views.create_checkout")
    def test_checkout_failure_is_recorded_without_unlocking_lead(self, create_checkout):
        create_checkout.side_effect = RaiAcceptError("bank unavailable")
        self.company.free_leads_remaining = 0
        self.company.save(update_fields=["free_leads_remaining"])
        self.client.force_authenticate(self.company_user)

        response = self.client.post(
            "/api/payments/unlock-lead/",
            {"job_request": self.job.id, "platform": "web"},
            format="json",
        )

        self.assertEqual(response.status_code, 502)
        payment = Payment.objects.get(company=self.company, offer__job_request=self.job)
        self.assertEqual(payment.status, PaymentStatus.FAILED)
        self.assertEqual(payment.failure_code, "checkout_failed")
        self.assertFalse(payment.offer.lead_unlocked)

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

    @patch("payments.views.create_checkout")
    def test_customer_job_payment_stays_disabled_until_merchant_is_ready(self, create_checkout):
        offer = self._accepted_offer()
        self.client.force_authenticate(self.customer_user)

        response = self.client.post(
            "/api/payments/pay-job/",
            {"offer": offer.id},
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "merchant_setup_required")
        self.assertFalse(Payment.objects.filter(type=PaymentType.JOB_PAYMENT).exists())
        create_checkout.assert_not_called()

    @patch("payments.views.create_checkout")
    def test_customer_can_start_fixed_price_job_payment_when_enabled(self, create_checkout):
        create_checkout.return_value = {
            "order_id": "rai_job_order_1",
            "session_id": "rai_job_session_1",
            "payment_url": "https://checkout.raiaccept.test/job-session",
        }
        offer = self._accepted_offer()
        self.client.force_authenticate(self.customer_user)

        with self.settings(CUSTOMER_JOB_PAYMENTS_ENABLED=True):
            response = self.client.post(
                "/api/payments/pay-job/",
                {"offer": offer.id, "amount": "0.01"},
                format="json",
            )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["payment_amount"], "1250.00")
        payment = Payment.objects.get(offer=offer, type=PaymentType.JOB_PAYMENT)
        self.assertEqual(payment.payer_user, self.customer_user)
        self.assertEqual(payment.company, self.company)
        self.assertEqual(payment.amount, Decimal("1250.00"))
        self.assertEqual(payment.provider_reference, "rai_job_order_1")
        payload = create_checkout.call_args.args[0]
        self.assertEqual(payload["invoice"]["amount"], 1250.0)
        self.assertEqual(payload["invoice"]["merchantOrderReference"], f"payment_{payment.id}")

    @patch("payments.views.create_checkout")
    def test_hourly_offer_requires_a_final_amount_before_payment(self, create_checkout):
        offer = self._accepted_offer(price_type=PriceType.HOURLY, price="35.00")
        self.client.force_authenticate(self.customer_user)

        with self.settings(CUSTOMER_JOB_PAYMENTS_ENABLED=True):
            response = self.client.post(
                "/api/payments/pay-job/",
                {"offer": offer.id},
                format="json",
            )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "final_amount_required")
        create_checkout.assert_not_called()

    @patch("payments.views.create_checkout")
    def test_repeated_job_payment_reuses_checkout(self, create_checkout):
        create_checkout.return_value = {
            "order_id": "rai_job_order_reused",
            "session_id": "rai_job_session_reused",
            "payment_url": "https://checkout.raiaccept.test/reused-job-session",
        }
        offer = self._accepted_offer()
        self.client.force_authenticate(self.customer_user)

        with self.settings(CUSTOMER_JOB_PAYMENTS_ENABLED=True):
            first = self.client.post("/api/payments/pay-job/", {"offer": offer.id}, format="json")
            second = self.client.post("/api/payments/pay-job/", {"offer": offer.id}, format="json")

        self.assertEqual(first.status_code, 202)
        self.assertEqual(second.status_code, 202)
        self.assertEqual(first.data["payment_url"], second.data["payment_url"])
        create_checkout.assert_called_once()

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
