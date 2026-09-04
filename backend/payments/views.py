# backend/payments/views.py

from decimal import Decimal, InvalidOperation
from datetime import timedelta

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from jobrequests.models import JobRequest
from offers.models import Offer, OfferStatus, PriceType
from accounts.models import Company
from payments.models import (
    LeadAccess,
    Payment,
    PaymentProvider,
    PaymentStatus,
    PaymentType,
)
from payments.services.raiaccept import (
    CANCELED_STATUSES,
    FAILED_STATUSES,
    PAID_STATUSES,
    RaiAcceptError,
    build_job_payment_payload,
    build_lead_unlock_payload,
    create_checkout,
    get_transaction_details,
)
from payments.serializers import PaymentSerializer
from pushnotifications.services import schedule_push_notification


PAID_LEAD_PRICE = Decimal("4.95")


class PaymentViewSet(viewsets.ViewSet):

    permission_classes = [IsAuthenticated]

    def _grant_lead_access(self, payment):
        offer = payment.offer

        if not payment.is_paid():
            payment.mark_paid(payment.provider_reference)

        if not offer.lead_unlocked:
            offer.lead_unlocked = True
            offer.save(update_fields=["lead_unlocked", "updated_at"])

        LeadAccess.objects.get_or_create(
            company=payment.company,
            job_request=offer.job_request,
        )

    def _absolute_backend_url(self, request, path):
        if settings.BACKEND_BASE_URL:
            return f"{settings.BACKEND_BASE_URL}{path}"
        return request.build_absolute_uri(path)

    def _frontend_payment_return_url(self, job_id):
        return f"{settings.FRONTEND_BASE_URL}/company/jobrequests/{job_id}?payment=return"

    def _frontend_job_payment_return_url(self, offer_id):
        return f"{settings.FRONTEND_BASE_URL}/customer/offers/{offer_id}?payment=return"

    def _visible_payment(self, request, payment_id):
        company = getattr(request.user, "company_profile", None)
        payments = Payment.objects.select_related(
            "offer",
            "offer__job_request",
        ).filter(pk=payment_id)
        if company:
            return payments.filter(company=company).first()
        if getattr(request.user, "role", None) == "customer":
            return payments.filter(payer_user=request.user).first()
        return None

    def _confirm_payment(self, payment):
        if payment.type == PaymentType.UNLOCK_LEAD:
            self._grant_lead_access(payment)
            return
        was_paid = payment.is_paid()
        payment.mark_paid(payment.provider_reference)
        if not was_paid and payment.payer_user:
            schedule_push_notification(
                user=payment.payer_user,
                category="payment_updates",
                title="Pagesa u konfirmua",
                body="Pagesa juaj në Ndërtimnet u konfirmua me sukses.",
                data={
                    "type": "payment_confirmed",
                    "offer_id": payment.offer_id,
                    "payment_id": payment.id,
                    "path": f"/customer/offers/{payment.offer_id}",
                },
            )

    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request):
        company = getattr(request.user, "company_profile", None)
        if company:
            payments = Payment.objects.filter(company=company)
        elif getattr(request.user, "role", None) == "customer":
            payments = Payment.objects.filter(payer_user=request.user)
        else:
            return Response(
                {"detail": "Payment history is not available for this account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payments = payments.select_related(
            "offer",
            "offer__job_request",
        )
        return Response(PaymentSerializer(payments, many=True).data)

    @action(detail=False, methods=["get"], url_path="status")
    def payment_status(self, request):
        company = getattr(request.user, "company_profile", None)
        if not company:
            return Response(
                {"detail": "Company profile saknas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job_request_id = request.query_params.get("job_request")
        if not job_request_id:
            return Response(
                {"detail": "job_request is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.filter(
            company=company,
            offer__job_request_id=job_request_id,
            type=PaymentType.UNLOCK_LEAD,
        ).select_related("offer", "offer__job_request").first()

        if not payment:
            return Response({"status": "not_started", "lead_unlocked": False})

        data = PaymentSerializer(payment).data
        data["lead_unlocked"] = payment.offer.lead_unlocked
        return Response(data)

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        payment = self._visible_payment(request, pk)
        if not payment:
            return Response(
                {"detail": "Payment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if payment.status != PaymentStatus.PAID:
            return Response(
                {"detail": "Receipt is available after payment is confirmed"},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=["get"], url_path="job-status")
    def job_payment_status(self, request):
        if getattr(request.user, "role", None) != "customer":
            return Response(
                {"detail": "Only customers can view job payment status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        offer_id = request.query_params.get("offer")
        if not offer_id:
            return Response(
                {"detail": "offer is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.filter(
            offer_id=offer_id,
            offer__job_request__customer=request.user,
            payer_user=request.user,
            type=PaymentType.JOB_PAYMENT,
        ).select_related("offer", "offer__job_request").first()

        if not payment:
            return Response({"status": "not_started"})
        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=["post"], url_path="pay-job")
    def pay_job(self, request):
        if getattr(request.user, "role", None) != "customer":
            return Response(
                {"detail": "Only customers can pay an accepted offer."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not settings.CUSTOMER_JOB_PAYMENTS_ENABLED:
            return Response(
                {
                    "detail": "Pagesat aktivizohen sapo llogaria bankare e tregtarit të jetë gati.",
                    "code": "merchant_setup_required",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        offer_id = request.data.get("offer")
        if not offer_id:
            return Response(
                {"detail": "offer is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        offer = get_object_or_404(
            Offer.objects.select_related(
                "company",
                "current_version",
                "job_request",
                "job_request__city",
            ),
            pk=offer_id,
            job_request__customer=request.user,
            status=OfferStatus.ACCEPTED,
        )
        version = offer.current_version
        if not version or not version.is_signed:
            return Response(
                {"detail": "Only a signed offer can be paid."},
                status=status.HTTP_409_CONFLICT,
            )
        if version.price_type != PriceType.FIXED:
            return Response(
                {
                    "detail": "Oferta me çmim për orë kërkon fillimisht një shumë përfundimtare.",
                    "code": "final_amount_required",
                },
                status=status.HTTP_409_CONFLICT,
            )
        if not version.price_amount or version.price_amount <= 0:
            return Response(
                {"detail": "The accepted offer has no payable amount."},
                status=status.HTTP_409_CONFLICT,
            )
        currency = (version.currency or "EUR").upper()
        if currency != "EUR":
            return Response(
                {"detail": "Only EUR payments are currently supported."},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            payment, created = Payment.objects.select_for_update().get_or_create(
                offer=offer,
                company=offer.company,
                type=PaymentType.JOB_PAYMENT,
                defaults={
                    "payer_user": request.user,
                    "amount": version.price_amount,
                    "currency": currency,
                    "provider": PaymentProvider.RAIACCEPT,
                },
            )

            if payment.status == PaymentStatus.PAID:
                return Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)

            if (
                not created
                and payment.status == PaymentStatus.PENDING
                and payment.amount == version.price_amount
                and payment.currency == currency
                and payment.provider_reference
                and payment.checkout_url
            ):
                return Response(
                    {
                        "message": "RaiAccept checkout already exists",
                        "requires_payment": True,
                        "payment_url": payment.checkout_url,
                        "payment_amount": f"{payment.amount:.2f}",
                        "currency": payment.currency,
                    },
                    status=status.HTTP_202_ACCEPTED,
                )

            recently_started = (
                not created
                and payment.status == PaymentStatus.PENDING
                and not payment.checkout_url
                and payment.updated_at >= timezone.now() - timedelta(seconds=60)
            )
            if recently_started:
                return Response(
                    {
                        "detail": "Pagesa po përgatitet. Provoni përsëri pas pak.",
                        "code": "payment_initializing",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            payment.payer_user = request.user
            payment.amount = version.price_amount
            payment.currency = currency
            payment.provider = PaymentProvider.RAIACCEPT
            payment.status = PaymentStatus.PENDING
            payment.paid_at = None
            payment.failure_code = ""
            payment.provider_reference = ""
            payment.provider_session_id = ""
            payment.provider_transaction_id = ""
            payment.checkout_url = ""
            payment.save(update_fields=[
                "payer_user",
                "amount",
                "currency",
                "provider",
                "status",
                "paid_at",
                "failure_code",
                "provider_reference",
                "provider_session_id",
                "provider_transaction_id",
                "checkout_url",
                "updated_at",
            ])

        return_url = self._frontend_job_payment_return_url(offer.id)
        notification_url = self._absolute_backend_url(
            request,
            "/api/payments/raiaccept/notify/",
        )
        payload = build_job_payment_payload(
            payment=payment,
            offer=offer,
            request=request,
            return_url=return_url,
            notification_url=notification_url,
        )

        try:
            checkout = create_checkout(payload)
        except RaiAcceptError:
            payment.mark_failed("checkout_failed")
            return Response(
                {
                    "detail": "Nuk u arrit të krijohet pagesa.",
                    "code": "raiaccept_checkout_failed",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.provider_reference = checkout["order_id"]
        payment.provider_session_id = checkout.get("session_id", "")
        payment.checkout_url = checkout["payment_url"]
        payment.status = PaymentStatus.PENDING
        payment.save(update_fields=[
            "provider_reference",
            "provider_session_id",
            "checkout_url",
            "status",
            "updated_at",
        ])
        return Response(
            {
                "message": "RaiAccept checkout created",
                "requires_payment": True,
                "payment_url": checkout["payment_url"],
                "payment_amount": f"{payment.amount:.2f}",
                "currency": payment.currency,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["post"], url_path="unlock-lead")
    def unlock_lead(self, request):

        company = getattr(request.user, "company_profile", None)

        if not company:
            return Response(
                {"detail": "Company profile saknas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job_request_id = request.data.get("job_request")

        if not job_request_id:
            return Response(
                {"detail": "job_request is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = get_object_or_404(
            JobRequest,
            pk=job_request_id,
            is_active=True,
            is_deleted=False,
            moderation_status=JobRequest.MODERATION_APPROVED,
        )

        if not company.can_unlock_leads():
            return Response(
                {"detail": "Plotëso profilin për të zhbllokuar klientë."},
                status=status.HTTP_403_FORBIDDEN,
            )

        platform = str(request.data.get("platform") or "web").lower()

        with transaction.atomic():
            company = Company.objects.select_for_update().get(pk=company.pk)

            offer, _ = Offer.objects.get_or_create(
                company=company,
                job_request=job,
            )

            if offer.lead_unlocked:
                LeadAccess.objects.get_or_create(company=company, job_request=job)
                return Response(
                    {
                        "detail": "Lead är redan upplåst.",
                        "payment_amount": "0.00",
                        "currency": "EUR",
                        "used_free_lead": False,
                        "free_leads_remaining": company.free_leads_remaining,
                    },
                    status=status.HTTP_200_OK,
                )

            use_free_lead = company.can_unlock_free_lead()
            payment_amount = Decimal("0.00") if use_free_lead else PAID_LEAD_PRICE

            if not use_free_lead and platform in {"ios", "android"}:
                return Response(
                    {
                        "detail": "Pagesa për hapjen e lead-it në aplikacion kërkon sistemin e pagesave të dyqanit.",
                        "code": "store_billing_required",
                        "platform": platform,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            payment, created = Payment.objects.select_for_update().get_or_create(
                offer=offer,
                company=company,
                type=PaymentType.UNLOCK_LEAD,
                defaults={
                    "amount": payment_amount,
                    "currency": "EUR",
                    "provider": PaymentProvider.INTERNAL,
                },
            )

            is_existing_paid_unlock = not created and payment.status == PaymentStatus.PAID

            if is_existing_paid_unlock:
                self._grant_lead_access(payment)
                return Response(
                    {
                        "detail": "Lead är redan upplåst.",
                        "offer_id": offer.id,
                        "payment_amount": f"{payment.amount:.2f}",
                        "currency": payment.currency,
                        "used_free_lead": payment.amount == Decimal("0.00"),
                        "free_leads_remaining": company.free_leads_remaining,
                    },
                    status=status.HTTP_200_OK,
                )

            if use_free_lead and payment.status != PaymentStatus.PAID:
                payment.amount = payment_amount
                payment.currency = "EUR"
                payment.provider = PaymentProvider.INTERNAL
                payment.save(update_fields=["amount", "currency", "provider"])
                self._grant_lead_access(payment)

            if not is_existing_paid_unlock and use_free_lead:
                company.free_leads_remaining -= 1
                company.save(update_fields=["free_leads_remaining"])

            if not use_free_lead:
                if (
                    not created
                    and payment.status == PaymentStatus.PENDING
                    and payment.provider_reference
                    and payment.checkout_url
                ):
                    return Response(
                        {
                            "message": "RaiAccept checkout already exists",
                            "requires_payment": True,
                            "payment_url": payment.checkout_url,
                            "payment_amount": f"{payment.amount:.2f}",
                            "currency": payment.currency,
                            "free_leads_remaining": company.free_leads_remaining,
                        },
                        status=status.HTTP_202_ACCEPTED,
                    )

                recently_started = (
                    not created
                    and payment.status == PaymentStatus.PENDING
                    and not payment.checkout_url
                    and payment.updated_at >= timezone.now() - timedelta(seconds=60)
                )
                if recently_started:
                    return Response(
                        {
                            "detail": "Pagesa po përgatitet. Provoni përsëri pas pak.",
                            "code": "payment_initializing",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                payment.amount = PAID_LEAD_PRICE
                payment.currency = "EUR"
                payment.provider = PaymentProvider.RAIACCEPT
                payment.status = PaymentStatus.PENDING
                payment.paid_at = None
                payment.failure_code = ""
                payment.provider_reference = ""
                payment.provider_session_id = ""
                payment.provider_transaction_id = ""
                payment.checkout_url = ""
                payment.save(
                    update_fields=[
                        "amount",
                        "currency",
                        "provider",
                        "status",
                        "paid_at",
                        "failure_code",
                        "provider_reference",
                        "provider_session_id",
                        "provider_transaction_id",
                        "checkout_url",
                        "updated_at",
                    ]
                )

        if not use_free_lead:
            return_url = self._frontend_payment_return_url(job.id)
            notification_url = self._absolute_backend_url(
                request,
                "/api/payments/raiaccept/notify/",
            )
            payload = build_lead_unlock_payload(
                payment=payment,
                job=job,
                request=request,
                return_url=return_url,
                notification_url=notification_url,
            )

            try:
                checkout = create_checkout(payload)
            except RaiAcceptError:
                payment.mark_failed("checkout_failed")
                return Response(
                    {
                        "detail": "Nuk u arrit të krijohet pagesa.",
                        "code": "raiaccept_checkout_failed",
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            payment.provider_reference = checkout["order_id"]
            payment.provider_session_id = checkout.get("session_id", "")
            payment.checkout_url = checkout["payment_url"]
            payment.status = PaymentStatus.PENDING
            payment.save(update_fields=[
                "provider_reference",
                "provider_session_id",
                "checkout_url",
                "status",
                "updated_at",
            ])

            return Response(
                {
                    "message": "RaiAccept checkout created",
                    "requires_payment": True,
                    "payment_url": checkout["payment_url"],
                    "payment_amount": f"{payment.amount:.2f}",
                    "currency": payment.currency,
                    "free_leads_remaining": company.free_leads_remaining,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        return Response(
            {
                "message": "Lead upplåst",
                "offer_id": offer.id,
                "payment_amount": f"{payment.amount:.2f}",
                "currency": payment.currency,
                "used_free_lead": not is_existing_paid_unlock and use_free_lead,
                "free_leads_remaining": company.free_leads_remaining,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        url_path="raiaccept/notify",
    )
    def raiaccept_notify(self, request):
        order = request.data.get("order") or {}
        transaction_data = request.data.get("transaction") or {}
        merchant_data = request.data.get("merchant") or {}
        invoice = order.get("invoice") or {}

        order_id = order.get("orderIdentification")
        transaction_id = transaction_data.get("transactionId")
        merchant_reference = invoice.get("merchantOrderReference", "")
        merchant_account_id = merchant_data.get("merchantAccountId", "")

        if (
            settings.RAIACCEPT_MERCHANT_ACCOUNT_ID
            and merchant_account_id != settings.RAIACCEPT_MERCHANT_ACCOUNT_ID
        ):
            return Response(
                {"detail": "Merchant account mismatch"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not order_id or not transaction_id:
            return Response(
                {"detail": "Missing RaiAccept order or transaction id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.filter(
            provider=PaymentProvider.RAIACCEPT,
            provider_reference=order_id,
        ).select_related("offer", "company", "offer__job_request").first()

        if not payment and merchant_reference.startswith("payment_"):
            payment_id = merchant_reference.removeprefix("payment_")
            payment = Payment.objects.filter(
                id=payment_id,
                provider=PaymentProvider.RAIACCEPT,
            ).select_related("offer", "company", "offer__job_request").first()

        if not payment:
            return Response(
                {"detail": "Payment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            details = get_transaction_details(order_id, transaction_id)
        except RaiAcceptError:
            return Response(
                {"detail": "Could not verify RaiAccept transaction"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        transaction_obj = details.get("transaction") or details
        verified_merchant = (details.get("merchant") or {}).get("merchantAccountId", "")
        gateway_status = str(transaction_obj.get("status", "")).upper()
        transaction_type = transaction_obj.get("transactionType", "")

        if (
            settings.RAIACCEPT_MERCHANT_ACCOUNT_ID
            and verified_merchant != settings.RAIACCEPT_MERCHANT_ACCOUNT_ID
        ):
            return Response(
                {"detail": "Verified merchant account mismatch"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verified_transaction_id = transaction_obj.get("transactionId")
        if verified_transaction_id and verified_transaction_id != transaction_id:
            return Response(
                {"detail": "Verified transaction id mismatch"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if transaction_type and transaction_type != "PURCHASE":
            return Response({"detail": "Ignored non-purchase transaction"}, status=200)

        if gateway_status in PAID_STATUSES:
            try:
                verified_amount = Decimal(str(transaction_obj["transactionAmount"]))
            except (KeyError, InvalidOperation, TypeError, ValueError):
                verified_amount = None
            verified_currency = str(transaction_obj.get("transactionCurrency", "")).upper()
            expected_production = settings.RAIACCEPT_MODE == "production"
            environment_matches = transaction_obj.get("isProduction") is expected_production
            status_code_matches = str(transaction_obj.get("statusCode", "")) == "0000"

            if (
                verified_amount != payment.amount
                or verified_currency != payment.currency.upper()
                or not environment_matches
                or not status_code_matches
            ):
                payment.provider_transaction_id = transaction_id
                payment.failure_code = "verification_mismatch"
                payment.save(update_fields=[
                    "provider_transaction_id",
                    "failure_code",
                    "updated_at",
                ])
                return Response(
                    {"detail": "Payment verification mismatch"},
                    status=status.HTTP_409_CONFLICT,
                )

            if payment.provider_reference != order_id:
                payment.provider_reference = order_id
                payment.save(update_fields=["provider_reference"])

            with transaction.atomic():
                payment = Payment.objects.select_for_update().select_related(
                    "offer",
                    "company",
                    "offer__job_request",
                ).get(pk=payment.pk)
                payment.provider_transaction_id = transaction_id
                payment.save(update_fields=["provider_transaction_id", "updated_at"])
                self._confirm_payment(payment)
            return Response({"detail": "Payment confirmed"}, status=200)

        if gateway_status in FAILED_STATUSES:
            payment.provider_transaction_id = transaction_id
            payment.save(update_fields=["provider_transaction_id", "updated_at"])
            payment.mark_failed(gateway_status.lower())
            return Response({"detail": "Payment failed"}, status=200)

        if gateway_status in CANCELED_STATUSES:
            payment.provider_transaction_id = transaction_id
            payment.save(update_fields=["provider_transaction_id", "updated_at"])
            payment.mark_canceled(gateway_status.lower())
            return Response({"detail": "Payment canceled"}, status=200)

        return Response({"detail": "Payment pending"}, status=200)
