# backend/payments/views.py

from django.shortcuts import get_object_or_404
from django.db import transaction

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from jobrequests.models import JobRequest
from offers.models import Offer
from payments.models import Payment, PaymentType, PaymentStatus


class PaymentViewSet(viewsets.ViewSet):

    permission_classes = [IsAuthenticated]

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

        job = get_object_or_404(JobRequest, pk=job_request_id)

        with transaction.atomic():

            offer, _ = Offer.objects.get_or_create(
                company=company,
                job_request=job,
            )

            payment, created = Payment.objects.get_or_create(
                offer=offer,
                type=PaymentType.UNLOCK_LEAD,
                defaults={"status": PaymentStatus.PAID},
            )

            if not created:
                return Response(
                    {"detail": "Lead är redan upplåst."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if company.can_unlock_free_lead():
                company.free_leads_remaining -= 1
                company.save(update_fields=["free_leads_remaining"])
            else:
                pass  # Stripe senare

        return Response(
            {
                "message": "Lead upplåst",
                "free_leads_remaining": company.free_leads_remaining,
            },
            status=status.HTTP_201_CREATED,
        )