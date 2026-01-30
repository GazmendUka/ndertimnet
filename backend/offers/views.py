# backend/offers/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.http import FileResponse
from io import BytesIO
from accounts.permissions_company_steps import IsCompanyStep2
from payments.models import LeadAccess
from .pdf_contract import build_offer_contract_pdf
from jobrequests.models import JobRequest
from .models import Offer, OfferVersion, OfferStatus
from .serializers import (
    OfferSerializer,
    OfferCreateSerializer,
    OfferSignSerializer,
    OfferDecisionSerializer,
    OfferEarlyChatUnlockSerializer,
)

class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.select_related(
        "current_version",
        "job_request"
    ).all()
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated]

    # --------------------------------------------------
    # BASE QUERYSET (Company only)
    # --------------------------------------------------
    def get_queryset(self):
        user = self.request.user

        if user.role == "company":
            return self.queryset.filter(company=user.company_profile)

        return self.queryset.none()

    # --------------------------------------------------
    # LIST – My offers (explicit endpoint)
    # GET /api/offers/mine/
    # --------------------------------------------------
    @action(detail=False, methods=["get"])
    def mine(self, request):
        """
        Returnerar alla offerter för inloggat företag.
        Används av /leads/mine i frontend.
        """

        user = request.user

        if user.role != "company":
            return Response([], status=200)

        company = user.company_profile

        qs = Offer.objects.filter(
            company=company
        ).select_related(
            "current_version",
            "job_request"
        ).order_by("-created_at")

        serializer = OfferSerializer(qs, many=True)
        return Response(serializer.data, status=200)

    # --------------------------------------------------
    # CREATE
    # --------------------------------------------------
    def create(self, request, *args, **kwargs):
        user = request.user
        company = user.company_profile
        job_request_id = request.data.get("job_request")

        if not job_request_id:
            return Response(
                {"detail": "job_request is required"},
                status=400
            )

        # 🔐 Lead måste vara upplåst
        if not LeadAccess.objects.filter(
            company=company,
            job_request_id=job_request_id,
        ).exists():
            return Response(
                {"detail": "Lead must be unlocked before creating an offer."},
                status=403
            )

        # 🧩 Företaget måste vara steg 2
        if not IsCompanyStep2().has_permission(request, self):
            return Response(
                {"detail": "Complete company profile before creating an offer."},
                status=403
            )

        serializer = OfferCreateSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()

        return Response(
            OfferSerializer(offer).data,
            status=status.HTTP_201_CREATED
        )

    # --------------------------------------------------
    # UPDATE (wizard save)
    # --------------------------------------------------
    def partial_update(self, request, pk=None):
        offer = self.get_object()

        # 1. BLOCKERA om accepterad
        if offer.status == "accepted":
            return Response(
                {"detail": "Accepted offer cannot be edited."},
                status=400
            )

        cv = offer.current_version

        # 2. Ingen version ännu → skapa v1
        if not cv:
            cv = OfferVersion.objects.create(
                offer=offer,
                version_number=1,
                created_by=request.user,
            )
            offer.current_version = cv
            offer.save(update_fields=["current_version"])

        # 3. Om signerad → skapa NY version
        if cv.is_signed:
            new_v = OfferVersion.objects.create(
                offer=offer,
                version_number=cv.version_number + 1,
                created_by=request.user,

                # kopiera gamla värden
                presentation_text=cv.presentation_text,
                can_start_from=cv.can_start_from,
                duration_text=cv.duration_text,
                price_type=cv.price_type,
                price_amount=cv.price_amount,
                currency=cv.currency,
                includes_text=cv.includes_text,
                excludes_text=cv.excludes_text,
                payment_terms=cv.payment_terms,
            )

            offer.current_version = new_v
            offer.status = "signed"
            offer.save(update_fields=["current_version", "status"])

            cv = new_v

        # 4. Uppdatera FÄLT
        for field, value in request.data.items():
            if hasattr(cv, field):
                setattr(cv, field, value)

        cv.save()

        offer.save(update_fields=["updated_at"])

        return Response(OfferSerializer(offer).data)

    # --------------------------------------------------
    # SIGN
    # --------------------------------------------------
    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        offer = self.get_object()

        # 🔐 HARD BACKEND GUARD – STEP 5 (SIGN)
        if not IsCompanyStep2().has_permission(request, self):
            return Response(
                {"detail": "Company profile must be completed before signing offer."},
                status=403
            )

        serializer = OfferSignSerializer(
            data=request.data,
            context={"request": request, "offer": offer},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"success": True, "message": "Offer signed successfully"},
            status=200
        )



    # --------------------------------------------------
    # DECISION = ACCEPT / REJECT
    # --------------------------------------------------
    @action(detail=True, methods=["post"])
    def decision(self, request, pk=None):
        offer = self.get_object()

        if not IsCompanyStep2().has_permission(request, self):
            return Response(
                {"detail": "Company profile incomplete."},
                status=403
            )

        serializer = OfferDecisionSerializer(
            data=request.data,
            context={"request": request, "offer": offer},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"success": True, "status": offer.status},
            status=200
        )


    # --------------------------------------------------
    # EARLY CHAT UNLOCK
    # --------------------------------------------------
    @action(detail=True, methods=["post"], url_path="unlock-chat")
    def unlock_chat(self, request, pk=None):
        offer = self.get_object()

        serializer = OfferEarlyChatUnlockSerializer(
            data={},
            context={"request": request, "offer": offer},
        )
        serializer.is_valid(raise_exception=True)
        unlock = serializer.save()

        return Response(
            {"success": True, "amount": unlock.amount},
            status=200
        )

    # --------------------------------------------------
    # PDF CONTRACT
    # --------------------------------------------------
    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        offer = self.get_object()

        pdf_bytes = build_offer_contract_pdf(offer)

        filename = f"oferta_{offer.id}_v{offer.current_version.version_number if offer.current_version else 1}.pdf"
        return FileResponse(
            BytesIO(pdf_bytes),
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )

    # --------------------------------------------------
    # CHECK IF OFFER EXISTS FOR JOB
    # --------------------------------------------------
    @action(detail=False, methods=["get"], url_path=r"check-by-job/(?P<job_id>\d+)")
    def check_by_job(self, request, job_id=None):

        user = request.user

        if user.role != "company":
            return Response(
                {"detail": "Only companies can access offers."},
                status=403
            )

        company = user.company_profile

        get_object_or_404(JobRequest, pk=job_id)

        offer = Offer.objects.filter(
            company=company,
            job_request_id=job_id,
        ).only("id").first()

        return Response(
            {"exists": bool(offer), "offer_id": offer.id if offer else None},
            status=200
        )

    # --------------------------------------------------
    # UNIQUE OFFER PER JOB (READ ONLY)
    # --------------------------------------------------
    @action(detail=False, methods=["get"], url_path=r"by-job/(?P<job_id>\d+)")
    def by_job(self, request, job_id=None):
        user = request.user

        # 1️⃣ Endast företag
        if user.role != "company":
            return Response(
                {"detail": "Only companies can access offers."},
                status=403
            )

        company = user.company_profile
        job = get_object_or_404(JobRequest, pk=job_id)

        # 2️⃣ Finns offerten redan?
        offer = Offer.objects.select_related(
            "current_version",
            "job_request"
        ).filter(
            company=company,
            job_request=job
        ).first()

        # 3️⃣ Om offerten INTE finns → krävs LeadAccess
        if not offer:
            if not LeadAccess.objects.filter(
                company=company,
                job_request=job
            ).exists():
                return Response(
                    {"detail": "Lead is not unlocked."},
                    status=403
                )

            return Response(
                {"detail": "Offer does not exist for this job request."},
                status=404
            )

        # 4️⃣ Offerten finns → returnera den
        return Response(
            OfferSerializer(offer).data,
            status=200
        )
            
    # --------------------------------------------------
    # VERSIONS HISTORY
    # GET /api/offers/{id}/versions/
    # --------------------------------------------------
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        offer = self.get_object()

        qs = (
            OfferVersion.objects
            .filter(offer=offer)
            .order_by("-version_number")
        )

        from .serializers import OfferVersionSerializer
        serializer = OfferVersionSerializer(qs, many=True)
        return Response(serializer.data, status=200)

