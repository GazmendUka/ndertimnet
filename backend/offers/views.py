# backend/offers/views.py

from io import BytesIO
from uuid import UUID, uuid4

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions_company_steps import IsCompanyStep2
from jobrequests.models import JobRequest
from payments.models import LeadAccess, PlatformCharge, PaymentStatus
from payments.billing import authorize_offer_send
from accounts.models import Company
from pushnotifications.services import schedule_push_notification

from .models import Offer, OfferMessage, OfferReview, OfferVersion, OfferStatus
from .contact_policy import enforce_contact_policy
from .pdf_contract import build_offer_contract_pdf
from .serializers import (
    OfferSerializer,
    OfferCreateSerializer,
    OfferSignSerializer,
    OfferDecisionSerializer,
    OfferVersionSerializer,
    OfferMessageSerializer,
    OfferReviewSerializer,
)


class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.select_related("current_version", "job_request").all()
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

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
                job_request__customer=user,
                job_request__is_deleted=False,
            ).filter(
                Q(job_request__is_active=True) | Q(status=OfferStatus.ACCEPTED)
            ).filter(versions__is_signed=True).distinct()

        else:
            return Offer.objects.none()

        # -----------------------------
        # Optional job filter
        # -----------------------------
        job_request_id = self.request.query_params.get("job_request")
        if job_request_id:
            qs = qs.filter(job_request_id=job_request_id)

        return qs.order_by("-created_at")

    # --------------------------------------------------
    # RETRIEVE
    # --------------------------------------------------
    def retrieve(self, request, *args, **kwargs):
        offer_id = kwargs.get("pk")
        user = request.user

        # CUSTOMER
        if getattr(user, "role", None) == "customer":

            offer = get_object_or_404(
                Offer.objects.select_related("current_version", "job_request")
                .filter(versions__is_signed=True).distinct()
                .filter(job_request__is_deleted=False)
                .filter(
                    Q(job_request__is_active=True) |
                    Q(status=OfferStatus.ACCEPTED)
                ),
                id=offer_id,
                job_request__customer=user,
            )

        # COMPANY
        elif getattr(user, "role", None) == "company":
            company = getattr(user, "company_profile", None)

            if not company:
                return Response(
                    {"detail": "Profili i kompanisë mungon."},
                    status=403,
                )

            offer = get_object_or_404(
                Offer.objects.select_related("current_version", "job_request")
                .filter(job_request__is_deleted=False)
                .filter(
                    Q(job_request__is_active=True) |
                    Q(status=OfferStatus.ACCEPTED)
                ),
                id=offer_id,
                company=company,
            )

        else:
            return Response({"detail": "Not allowed"}, status=403)

        if request.user.role == "customer":
            from jobrequests.activity import record_customer_activity
            record_customer_activity(offer.job_request_id)
            Offer.objects.filter(pk=offer.pk, customer_opened_at__isnull=True).update(customer_opened_at=timezone.now())
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

        serializer = OfferSerializer(qs, many=True, context={"request": request})
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
            moderation_status=JobRequest.MODERATION_APPROVED,
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

        return Response(OfferSerializer(offer, context={"request": request}).data, status=status.HTTP_201_CREATED)

    # --------------------------------------------------
    # UPDATE (wizard save)
    # PATCH /api/offers/{id}/
    # --------------------------------------------------
    @transaction.atomic
    def partial_update(self, request, pk=None):
        offer = self.get_object()
        if request.user.role != "company" or offer.company.user_id != request.user.pk:
            return Response({"detail": "Vetëm kompania mund të ndryshojë ofertën."}, status=403)
        Company.objects.select_for_update().get(pk=offer.company_id)
        JobRequest.objects.select_for_update().get(pk=offer.job_request_id)
        offer = Offer.objects.select_for_update(of=("self",)).get(pk=offer.pk)
        charges = PlatformCharge.objects.filter(offer=offer, fulfilled_at__isnull=True)
        if charges.filter(status=PaymentStatus.PAID).exists() or charges.filter(checkouts__status=PaymentStatus.PENDING).exists():
            return Response({"detail": "Përfundoni pagesën dhe nënshkrimin para ndryshimeve."}, status=409)

        if offer.job_request.is_deleted or (not offer.job_request.is_active and offer.status != OfferStatus.ACCEPTED):
            return Response(
                {"detail": "Kjo kërkesë nuk është më aktive."},
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
                estimated_hours=cv.estimated_hours,
                currency=cv.currency,
                includes_text=cv.includes_text,
                excludes_text=cv.excludes_text,
                payment_terms=cv.payment_terms,
            )

            offer.current_version = new_v
            if offer.status != OfferStatus.ACCEPTED:
                offer.status = OfferStatus.DRAFT
            offer.save(update_fields=["current_version", "status"])
            cv = new_v

        # Validate only editable business fields. Never accept is_signed/offer/id from the client.
        serializer = OfferVersionSerializer(cv, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        offer.refresh_from_db()

        return Response(OfferSerializer(offer, context={"request": request}).data)

    # --------------------------------------------------
    # SIGN
    # POST /api/offers/{id}/sign/
    # --------------------------------------------------
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def sign(self, request, pk=None):
        offer = self.get_object()
        if request.user.role != "company" or offer.company.user_id != request.user.pk:
            return Response({"detail": "Vetëm kompania mund të nënshkruajë ofertën."}, status=403)
        Company.objects.select_for_update().get(pk=offer.company_id)
        job = JobRequest.objects.select_for_update().get(pk=offer.job_request_id)
        offer = Offer.objects.select_for_update(of=("self",)).select_related("current_version", "job_request").get(pk=offer.pk)
        from payments.offer_slots import require_offer_slot
        require_offer_slot(offer, job)

        if offer.job_request.is_deleted or (not offer.job_request.is_active and offer.status != OfferStatus.ACCEPTED):
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
        authorize_offer_send(offer, request.user)
        serializer.save()
        offer.lead_unlocked = True
        offer.save(update_fields=["lead_unlocked", "updated_at"])

        schedule_push_notification(
            user=offer.job_request.customer,
            category="offer_updates",
            title="Ofertë e re në Ndërtimnet",
            body="Një kompani ka dërguar një ofertë të re për kërkesën tuaj.",
            data={
                "type": "offer_signed",
                "offer_id": offer.id,
                "path": f"/customer/offers/{offer.id}",
            },
        )

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
        previous_status = offer.status
        previous_accepted_id = offer.accepted_version_id
        previous_rejected_id = offer.versions.filter(customer_rejected_at__isnull=False).values_list("pk", flat=True).first()

        if getattr(user, "role", None) != "customer":
            return Response(
                {"detail": "Vetëm klientët mund të vendosin për ofertat."},
                status=403,
            )

        if offer.job_request.customer != user:
            return Response(
                {"detail": "Kjo ofertë nuk është e juaja."},
                status=403,
            )

        serializer = OfferDecisionSerializer(
            data=request.data,
            context={"request": request, "offer": offer},
        )

        serializer.is_valid(raise_exception=True)
        decided_offer = serializer.save()

        latest_rejected_id = decided_offer.versions.filter(customer_rejected_at__isnull=False).values_list("pk", flat=True).first()
        if previous_status != decided_offer.status or previous_accepted_id != decided_offer.accepted_version_id or previous_rejected_id != latest_rejected_id:
            schedule_push_notification(
                user=decided_offer.company.user,
                category="offer_updates",
                title="Përditësim i ofertës",
                body=(
                    "Klienti e pranoi ofertën tuaj."
                    if serializer.validated_data["decision"] == "accept"
                    else "Klienti nuk e pranoi ofertën tuaj."
                ),
                data={
                    "type": f"offer_version_{serializer.validated_data['decision']}" if previous_status == OfferStatus.ACCEPTED else f"offer_{decided_offer.status}",
                    "offer_id": decided_offer.id,
                    "path": f"/company/offers/{decided_offer.id}",
                },
            )

        return Response(
            {"success": True, "status": decided_offer.status},
            status=200,
        )

    # --------------------------------------------------
    # EARLY CHAT UNLOCK
    # POST /api/offers/{id}/unlock-chat/
    # --------------------------------------------------
    @action(detail=True, methods=["post"], url_path="unlock-chat")
    def unlock_chat(self, request, pk=None):
        return Response({"detail": "Hapja e veçantë e bisedës nuk ofrohet më."}, status=410)

    # --------------------------------------------------
    # PDF CONTRACT
    # GET /api/offers/{id}/pdf/
    # --------------------------------------------------
    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        offer = self.get_object()

        if offer.status != OfferStatus.ACCEPTED:
            return Response({"detail": "Kontrata me kontaktet është e disponueshme pasi klienti të pranojë ofertën."}, status=403)
        pdf_bytes = build_offer_contract_pdf(offer)
        filename = (
            f"oferta_{offer.id}_v"
            f"{offer.accepted_version.version_number if offer.accepted_version else 1}.pdf"
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
            moderation_status=JobRequest.MODERATION_APPROVED,
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
            moderation_status=JobRequest.MODERATION_APPROVED,
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

        return Response(OfferSerializer(offer, context={"request": request}).data, status=200)

    # --------------------------------------------------
    # VERSIONS HISTORY
    # GET /api/offers/{id}/versions/
    # --------------------------------------------------
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        offer = self.get_object()
        qs = OfferVersion.objects.filter(offer=offer).order_by("-version_number")
        if request.user.role == "customer":
            qs = qs.filter(is_signed=True)
        serializer = OfferVersionSerializer(qs, many=True, context={"request": request})
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

        if not offer.can_chat():
            return Response({"detail": "Dërgoni ofertën përpara se të hapni bisedën.",
                             "code": "offer_not_sent"}, status=403)

        # GET → list messages
        if request.method == "GET":
            qs = offer.messages.select_related(
                "sender_company",
                "sender_customer",
            ).order_by("created_at")

            serializer = OfferMessageSerializer(qs, many=True)
            return Response(serializer.data)

        message_text = request.data.get("message")
        if not isinstance(message_text, str) or not message_text.strip():
            return Response({"detail": "Message is required"}, status=400)
        message_text = message_text.strip()
        if len(message_text) > 2000:
            return Response({"detail": "Message cannot exceed 2000 characters"}, status=400)

        raw_client_id = request.data.get("client_message_id")
        try:
            client_message_id = UUID(str(raw_client_id)) if raw_client_id else uuid4()
        except (TypeError, ValueError, AttributeError):
            return Response({"detail": "client_message_id is invalid"}, status=400)

        # Lock the offer row so review submission and new messages cannot cross.
        with transaction.atomic():
            locked_offer = Offer.objects.select_for_update(of=("self",)).get(pk=offer.pk)
            if OfferReview.objects.filter(offer=locked_offer).exists():
                return Response(
                    {"detail": "Biseda është mbyllur pasi klienti ka lënë vlerësimin."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            enforce_contact_policy(locked_offer, message_text)
            existing = OfferMessage.objects.filter(client_message_id=client_message_id).first()
            if existing:
                if (
                    existing.offer_id == locked_offer.id
                    and existing.sender_type == getattr(user, "role", "")
                ):
                    return Response(OfferMessageSerializer(existing).data, status=200)
                return Response(
                    {"detail": "client_message_id is already in use"},
                    status=status.HTTP_409_CONFLICT,
                )

            if getattr(user, "role", None) == "company":
                message = locked_offer.messages.create(
                    sender_type="company",
                    sender_company=user.company_profile,
                    message=message_text,
                    client_message_id=client_message_id,
                )
                recipient = locked_offer.job_request.customer
                recipient_path = f"/customer/offers/{locked_offer.id}"

            elif getattr(user, "role", None) == "customer":
                message = locked_offer.messages.create(
                    sender_type="customer",
                    sender_customer=user.customer_profile,
                    message=message_text,
                    client_message_id=client_message_id,
                )
                recipient = locked_offer.company.user
                recipient_path = f"/company/offers/{locked_offer.id}"

            else:
                return Response({"detail": "Invalid sender"}, status=403)

        schedule_push_notification(
            user=recipient,
            category="chat_messages",
            title="Mesazh i ri në Ndërtimnet",
            body="Keni një mesazh të ri në bisedën tuaj.",
            data={
                "type": "chat_message",
                "offer_id": offer.id,
                "message_id": message.id,
                "path": recipient_path,
            },
        )

        if user.role == "customer":
            from jobrequests.activity import record_customer_activity
            record_customer_activity(offer.job_request_id)
        serializer = OfferMessageSerializer(message)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=["post"], url_path="messages/read")
    def mark_messages_read(self, request, pk=None):
        offer = self.get_object()
        if not offer.can_chat():
            return Response({"detail": "Biseda hapet pas dërgimit të ofertës."}, status=403)
        sender_type = getattr(request.user, "role", "")
        updated = offer.messages.filter(read_at__isnull=True).exclude(
            sender_type=sender_type
        ).update(read_at=timezone.now())
        return Response({"marked_read": updated})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        sender_type = getattr(request.user, "role", "")
        unread = OfferMessage.objects.filter(
            offer__in=self.get_queryset(),
            read_at__isnull=True,
        ).exclude(sender_type=sender_type)
        by_offer = {
            str(row["offer_id"]): row["count"]
            for row in unread.values("offer_id").annotate(count=Count("id"))
        }
        return Response({"total": sum(by_offer.values()), "by_offer": by_offer})

    # --------------------------------------------------
    # CUSTOMER REVIEW
    # GET /api/offers/{id}/review/
    # POST /api/offers/{id}/review/
    # --------------------------------------------------
    @action(detail=True, methods=["get", "post"], url_path="review")
    def review(self, request, pk=None):
        offer = self.get_object()

        if request.method == "GET":
            review = OfferReview.objects.filter(offer=offer).select_related(
                "customer", "company"
            ).first()
            if not review:
                return Response({"detail": "Vlerësimi nuk është dorëzuar ende."}, status=404)
            return Response(OfferReviewSerializer(review, context={"request": request}).data)

        if getattr(request.user, "role", None) != "customer":
            return Response(
                {"detail": "Vetëm klienti mund të lërë vlerësim."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if offer.job_request.customer_id != request.user.id:
            return Response(
                {"detail": "Kjo ofertë nuk është e juaja."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if offer.status != OfferStatus.ACCEPTED:
            return Response(
                {"detail": "Mund të vlerësoni vetëm një ofertë të pranuar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OfferReviewSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Serialise review creation with message sending. Once this transaction
        # commits, no later message can be created for the offer.
        with transaction.atomic():
            locked_offer = Offer.objects.select_for_update(of=("self",)).select_related("company").get(pk=offer.pk)
            if OfferReview.objects.filter(offer=locked_offer).exists():
                return Response(
                    {"detail": "Vlerësimi për këtë punë është dorëzuar tashmë."},
                    status=status.HTTP_409_CONFLICT,
                )
            review = serializer.save(
                offer=locked_offer,
                customer=request.user,
                company=locked_offer.company,
            )
        return Response(
            OfferReviewSerializer(review, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
