# backend/payments/views.py

from django.shortcuts import get_object_or_404
from django.db import transaction


from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions_company_steps import IsCompanyStep2
from payments.models import LeadAccess
from jobrequests.models import JobRequest


class PaymentViewSet(viewsets.ViewSet):
    """
    Handles payments related to offers:
    - Unlock lead (free quota or paid)
    """

    permission_classes = [IsAuthenticated]

    # --------------------------------------------------
    # 🔓 UNLOCK LEAD
    # --------------------------------------------------
    @action(detail=False, methods=["post"], url_path="unlock-lead")
    def unlock_lead(self, request):
        company = request.user.company_profile
        job_request_id = request.data.get("job_request")

        if not job_request_id:
            return Response(
                {"detail": "job_request is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = get_object_or_404(JobRequest, pk=job_request_id)

        # 🔐 redan upplåst?
        if LeadAccess.objects.filter(company=company, job_request=job).exists():
            return Response(
                {"detail": "Lead är redan upplåst."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            if company.can_unlock_free_lead():
                company.free_leads_remaining -= 1
                company.save(update_fields=["free_leads_remaining"])
            else:
                # stripe senare
                pass

            LeadAccess.objects.create(
                company=company,
                job_request=job,
            )

        return Response(
            {
                "message": "Lead upplåst",
                "free_leads_remaining": company.free_leads_remaining,
            },
            status=status.HTTP_201_CREATED,
        )
