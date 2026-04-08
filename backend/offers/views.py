# backend/offers/views.py

from io import BytesIO

from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions_company_steps import IsCompanyStep2
from jobrequests.models import JobRequest
from payments.models import LeadAccess

from .models import Offer, OfferVersion, OfferStatus
from .pdf_contract import build_offer_contract_pdf
from .serializers import (
    OfferSerializer,
    OfferCreateSerializer,
    OfferSignSerializer,
    OfferDecisionSerializer,
    OfferEarlyChatUnlockSerializer,
    OfferVersionSerializer,
    OfferMessageSerializer,
)


class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.select_related("current_version", "job_request").all()
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated]

    # --------------------------------------------------
    # BASE QUERYSET
    # --------------------------------------------------
    def get_queryset(self):
        user = self.request.user
        qs = self.queryset

        # -----------------------------
        # Company
        # -----------------------------
        if getattr(user, "role", None) == "company":
            company = getattr(user, "company_profile", None)
            if not company:
                return Offer.objects.none()

            qs = qs.filter(
                company=company,
                job_request__is_deleted=False,
            ).filter(
                Q(job_request__is_active=True) | Q(status=OfferStatus.ACCEPTED)
            )

        # -----------------------------
        # Customer
        # -----------------------------
        elif getattr(user, "role", None) == "customer":
            customer = getattr(user, "customer_profile", None)
            if not customer:
                return Offer.objects.none()

            qs = qs.filter(
                job_request__customer=customer,
                job_request__is_deleted=False,
            ).filter(
                Q(job_request__is_active=True) | Q(status=OfferStatus.ACCEPTED)
            ).exclude(status=OfferStatus.DRAFT)

        else:
            return Offer.objects.none()

        # -----------------------------
        # Optional job filter
        # -----------------------------
        job_request_id = self.request.query_params.get("job_request")
        if job_request_id:
            qs = qs.filter(job_request_id=job_request_id)

        return qs

    # --------------------------------------------------
    # RETRIEVE
    # --------------------------------------------------
    def retrieve(self, request, *args, **kwargs):
        offer_id = kwargs.get("pk")
        user = request.user

        # CUSTOMER
        if getattr(user, "role", None) == "customer":
            customer = getattr(user, "customer_profile", None)
            if not customer:
                return Response({"detail": "Profili i klientit mungon."}, status=403)

            offer = get_object_or_404(
                Offer.objects.select_related("current_version", "job_request")
                .exclude(status=OfferStatus.DRAFT)
                .filter(job_request__is_deleted=False)
                .filter(Q(job_request__is_active=True) | Q(status=OfferStatus.ACCEPTED)),
                id=offer_id,
                job_request__customer=customer,
            )

        # COMPANY
        elif getattr(user, "role", None) == "company":
            company = getattr(user, "company_profile", None)
            if not company:
                return Response({"detail": "Profili i kompanisë mungon."}, status=403)

            offer = get_object_or_404(
                Offer.objects.select_related("current_version", "job_request")
                .filter(job_request__is_deleted=False)
                .filter(Q(job_request__is_active=True) | Q(status=OfferStatus.ACCEPTED)),
                id=offer_id,
                company=company,
            )

        else:
            return Response({"detail": "Not allowed"}, status=403)

        serializer = self.get_serializer(offer)
        return Response(serializer.data)

    # --------------------------------------------------
    # LIST – MY OFFERS
    # GET /api/offers/mine/
    # --------------------------------------------------
    @action(detail=False, methods=["get"])
    def mine(self, request):
        """
        Returnerar alla offerter för inloggat företag.
        (Tillfälligt kompatibel med frontend som tidigare använde /leads/mine)
        """
        user = request.user

        if getattr(user, "role", None) != "company":
            return Response([], status=200)

        company = getattr(user, "company_profile", None)
        if not company:
            return Response([], status=200)

        qs = (
            Offer.objects.filter(
                company=company,
                job_request__is_deleted=False,
            )
            .filter(
                Q(job_request__is_active=True) | Q(status=OfferStatus.ACCEPTED)
            )
            .select_related("current_version", "job_request")
            .order_by("-created_at")
        )

        serializer = OfferSerializer(qs, many=True)
        return Response(serializer.data, status=200)

    # --------------------------------------------------
    # CREATE
    # POST /api/offers/
    # --------------------------------------------------
    def create(self, request, *args, **kwargs):
        user = request.user

        # Endast företag
        if getattr(user, "role", None) != "company":
            return Response({"detail": "Vetëm kompanitë mund të krijojnë oferta."}, status=403)

        company = getattr(user, "company_profile", None)
        if not company:
            return Response({"detail": "Profili i kompanisë mungon."}, status=403)

        job_request_id = request.data.get("job_request")
        if not job_request_id:
            return Response(
                {"detail": "Ju lutemi zgjidhni një kërkesë pune përpara se të vazhdoni."},
                status=400,
            )

        # JobRequest måste fortfarande vara aktiv
        job = get_object_or_404(
            JobRequest,
            pk=job_request_id,
            is_active=True,
            is_deleted=False,
        )

        # Lead måste vara upplåst innan offert
        if not LeadAccess.objects.filter(company=company, job_request=job).exists():
            return Response(
                {"detail": "Duhet të hapni punën përpara se të krijoni ofertë."},
                status=403,
            )

        # Company profile step 2
        if not IsCompanyStep2().has_permission(request, self):
            return Response(
                {"detail": "Plotësoni profilin e kompanisë përpara se të krijoni ofertë."},
                status=403,
            )

        serializer = OfferCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()

        return Response(OfferSerializer(offer).data, status=status.HTTP_201_CREATED)

    # --------------------------------------------------
    # UPDATE (wizard save)
    # PATCH /api/offers/{id}/
    # --------------------------------------------------
    def partial_update(self, request, pk=None):
        offer = self.get_object()

        if offer.job_request.is_deleted or not offer.job_request.is_active:
            return Response(
                {"detail": "Kjo kërkesë nuk është më aktive."},
                status=400,
            )

        # Blockera om accepterad
        if offer.status == OfferStatus.ACCEPTED:
            return Response(
                {"detail": "Oferta e pranuar nuk mund të ndryshohet."},
                status=400,
            )

        cv = offer.current_version

        # Ingen version ännu → skapa v1
        if not cv:
            cv = OfferVersion.objects.create(
                offer=offer,
                version_number=1,
                created_by=request.user,
            )
            offer.current_version = cv
            offer.save(update_fields=["current_version"])

        # Om signerad → skapa ny version
        if cv.is_signed:
            new_v = OfferVersion.objects.create(
                offer=offer,
                version_number=cv.version_number + 1,
                created_by=request.user,
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
            offer.status = OfferStatus.DRAFT
            offer.save(update_fields=["current_version", "status"])
            cv = new_v

        # Uppdatera fält på current version
        for field, value in request.data.items():
            if hasattr(cv, field):
                setattr(cv, field, value)

        cv.save()
        offer.refresh_from_db()

        return Response(OfferSerializer(offer).data)

    # --------------------------------------------------
    # SIGN
    # POST /api/offers/{id}/sign/
    # --------------------------------------------------
    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        offer = self.get_object()

        if offer.job_request.is_deleted or not offer.job_request.is_active:
            return Response(
                {"detail": "Kjo kërkesë nuk është më aktive."},
                status=400,
            )

        if not IsCompanyStep2().has_permission(request, self):
            return Response(
                {"detail": "Profili i kompanisë duhet të jetë i plotësuar përpara nënshkrimit të ofertës."},
                status=403,
            )

        serializer = OfferSignSerializer(
            data=request.data,
            context={"request": request, "offer": offer},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"success": True, "message": "Oferta u nënshkrua me sukses."},
            status=200,
        )

    # --------------------------------------------------
    # DECISION = ACCEPT / REJECT
    # POST /api/offers/{id}/decision/
    # --------------------------------------------------
    @action(detail=True, methods=["post"])
    def decision(self, request, pk=None):
        offer = self.get_object()
        user = request.user

        if getattr(user, "role", None) != "customer":
            return Response({"detail": "Vetëm klientët mund të vendosin për ofertat."}, status=403)

        customer = getattr(user, "customer_profile", None)
        if not customer:
            return Response({"detail": "Profili i klientit mungon."}, status=403)

        if offer.job_request.customer != customer:
            return Response({"detail": "Kjo ofertë nuk është e juaja."}, status=403)

        serializer = OfferDecisionSerializer(
            data=request.data,
            context={"request": request, "offer": offer},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"success": True, "status": offer.status}, status=200)

    # --------------------------------------------------
    # EARLY CHAT UNLOCK
    # POST /api/offers/{id}/unlock-chat/
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

        return Response({"success": True, "amount": unlock.amount}, status=200)

    # --------------------------------------------------
    # PDF CONTRACT
    # GET /api/offers/{id}/pdf/
    # --------------------------------------------------
    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        offer = self.get_object()

        pdf_bytes = build_offer_contract_pdf(offer)
        filename = (
            f"oferta_{offer.id}_v"
            f"{offer.current_version.version_number if offer.current_version else 1}.pdf"
        )

        return FileResponse(
            BytesIO(pdf_bytes),
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )

    # --------------------------------------------------
    # CHECK IF OFFER EXISTS FOR JOB
    # GET /api/offers/check-by-job/{job_id}/
    # --------------------------------------------------
    @action(detail=False, methods=["get"], url_path=r"check-by-job/(?P<job_id>\d+)")
    def check_by_job(self, request, job_id=None):
        user = request.user

        if getattr(user, "role", None) != "company":
            return Response({"detail": "Vetëm kompanitë mund të kenë qasje në oferta."}, status=403)

        company = getattr(user, "company_profile", None)
        if not company:
            return Response({"detail": "Profili i kompanisë mungon."}, status=403)

        job = get_object_or_404(
            JobRequest,
            pk=job_id,
            is_deleted=False,
        )

        offer = Offer.objects.filter(
            company=company,
            job_request=job,
        ).filter(
            Q(job_request__is_active=True) | Q(status=OfferStatus.ACCEPTED)
        ).only("id").first()

        return Response(
            {"exists": bool(offer), "offer_id": offer.id if offer else None},
            status=200,
        )

    # --------------------------------------------------
    # UNIQUE OFFER PER JOB (READ ONLY)
    # GET /api/offers/by-job/{job_id}/
    # --------------------------------------------------
    @action(detail=False, methods=["get"], url_path=r"by-job/(?P<job_id>\d+)")
    def by_job(self, request, job_id=None):
        user = request.user

        if getattr(user, "role", None) != "company":
            return Response({"detail": "Vetëm kompanitë mund të kenë qasje në oferta."}, status=403)

        company = getattr(user, "company_profile", None)
        if not company:
            return Response({"detail": "Profili i kompanisë mungon."}, status=403)

        job = get_object_or_404(
            JobRequest,
            pk=job_id,
            is_deleted=False,
        )

        offer = (
            Offer.objects.select_related("current_version", "job_request", "company")
            .filter(
                company=company,
                job_request=job,
                job_request__is_deleted=False,
            )
            .filter(
                Q(job_request__is_active=True) | Q(status=OfferStatus.ACCEPTED)
            )
            .first()
        )

        # Om offerten inte finns → krävs LeadAccess
        if not offer:
            if not job.is_active:
                return Response({"detail": "Nuk ekziston asnjë ofertë për këtë kërkesë."}, status=404)

            if not LeadAccess.objects.filter(company=company, job_request=job).exists():
                return Response({"detail": "Duhet të hapni lead-in përpara se të vazhdoni."}, status=403)

            return Response({"detail": "Nuk ekziston asnjë ofertë për këtë kërkesë."}, status=404)

        return Response(OfferSerializer(offer).data, status=200)

    # --------------------------------------------------
    # VERSIONS HISTORY
    # GET /api/offers/{id}/versions/
    # --------------------------------------------------
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        offer = self.get_object()
        qs = OfferVersion.objects.filter(offer=offer).order_by("-version_number")
        serializer = OfferVersionSerializer(qs, many=True)
        return Response(serializer.data, status=200)

    # --------------------------------------------------
    # CHAT MESSAGES
    # GET /api/offers/{id}/messages/
    # POST /api/offers/{id}/messages/
    # --------------------------------------------------
    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        offer = self.get_object()
        user = request.user

        # GET → list messages
        if request.method == "GET":
            qs = offer.messages.select_related(
                "sender_company",
                "sender_customer",
            ).order_by("created_at")

            serializer = OfferMessageSerializer(qs, many=True)
            return Response(serializer.data)

        # POST → send message
        message_text = request.data.get("message")
        if not message_text:
            return Response({"detail": "Message is required"}, status=400)

        if getattr(user, "role", None) == "company":
            message = offer.messages.create(
                sender_type="company",
                sender_company=user.company_profile,
                message=message_text,
            )

        elif getattr(user, "role", None) == "customer":
            message = offer.messages.create(
                sender_type="customer",
                sender_customer=user.customer_profile,
                message=message_text,
            )

        else:
            return Response({"detail": "Invalid sender"}, status=403)

        serializer = OfferMessageSerializer(message)
        return Response(serializer.data, status=201)