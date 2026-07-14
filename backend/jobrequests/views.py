# backend/jobrequests/views.py

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import (
    IsEmailVerified,
    IsCompanyMarketplaceReady,
)
from main.pagination import AlbanianPagination

from offers.models import Offer, OfferStatus
from offers.services import OfferAcceptanceError, accept_offer as accept_offer_service

from .models import JobRequest, JobRequestAudit, JobRequestDraft, JobRequestModerationEvent
from .serializers import (
    JobRequestAuditSerializer,
    JobRequestDraftSerializer,
    JobRequestListSerializer,
    JobRequestSerializer,
    JobRequestUpdateSerializer,
)


# ------------------------------------------------------------
# 🔐 GLOBALT SKYDD
# ------------------------------------------------------------

class ActiveAccountGuardMixin:
    """
    Global guard för att säkra soft-delete.
    - Blockera om user.is_active=False
    - Blockera om user.role=="company" och company_profile.is_active=False

    Detta skyddar även om en gammal JWT fortfarande är giltig.
    """

    def initial(self, request, *args, **kwargs):
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            if not getattr(user, "is_active", True):
                raise PermissionDenied("Kjo llogari është e çaktivizuar.")

            if getattr(user, "role", None) == "company":
                company = getattr(user, "company_profile", None)
                if not company or not getattr(company, "is_active", True):
                    raise PermissionDenied("Kjo kompani është e çaktivizuar.")

        return super().initial(request, *args, **kwargs)


# ------------------------------------------------------------
# 👤 Permission för JobRequestDraft: Endast kunden + ägare
# ------------------------------------------------------------

class IsCustomerAndOwner(permissions.BasePermission):
    """
    Tillåter endast:
    • Inloggad användare med role='customer'
    • Endast ägaren kan läsa/uppdatera objektet
    """

    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated and getattr(request.user, "role", None) == "customer"
        )

    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return obj.customer == user

# ------------------------------------------------------------
# 🆕 JobRequestDraft ViewSet – Multi-step form
# ------------------------------------------------------------

class JobRequestDraftViewSet(ActiveAccountGuardMixin, viewsets.ModelViewSet):
    """
    Hanterar utkast för 4-stegs JobRequest-formuläret:

    • POST   /api/jobrequests/jobrequest-drafts/             → skapa utkast
    • PATCH  /api/jobrequests/jobrequest-drafts/<id>/        → uppdatera steg
    • GET    /api/jobrequests/jobrequest-drafts/             → lista mina utkast
    • GET    /api/jobrequests/jobrequest-drafts/<id>/        → se specifikt utkast
    • POST   /api/jobrequests/jobrequest-drafts/<id>/submit/ → skapa riktig JobRequest
    """

    serializer_class = JobRequestDraftSerializer
    permission_classes = [IsAuthenticated, IsCustomerAndOwner]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user

        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            return JobRequestDraft.objects.none()

        return JobRequestDraft.objects.filter(customer=user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save()

    # --------------------------------------------------------
    # 🚀 POST /jobrequest-drafts/<id>/submit/
    # Konvertera draft → riktig JobRequest
    # --------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        draft = self.get_object()

        # --------------------------------------------------------
        # 🛑 PROFILE COMPLETENESS CHECK (FINAL VERSION)
        # --------------------------------------------------------
        user = draft.customer
        customer_profile = getattr(user, "customer_profile", None)

        missing_profile_fields = []

        if not (user.first_name and user.first_name.strip()):
            missing_profile_fields.append("first_name")

        if not (user.last_name and user.last_name.strip()):
            missing_profile_fields.append("last_name")

        if not (customer_profile and str(customer_profile.phone).strip()):
            missing_profile_fields.append("phone")

        resolved_address = (
            draft.address
            or (customer_profile.address if customer_profile else "")
        )

        if not (resolved_address and str(resolved_address).strip()):
            missing_profile_fields.append("address")

        if missing_profile_fields:
            raise ValidationError({
                "detail": "Profili nuk është i plotë.",
                "missing_profile_fields": missing_profile_fields,
            })

        if draft.is_submitted:
            return Response(
                {"detail": "Ky draft është tashmë i dorëzuar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        missing = []
        if not (draft.title and draft.title.strip()):
            missing.append("title")
        if not (draft.description and draft.description.strip()):
            missing.append("description")
        if not draft.city:
            missing.append("city")
        if not (resolved_address and str(resolved_address).strip()):
            missing.append("address")

        if missing:
            return Response(
                {"detail": "Kërkesa nuk është e plotë.", "missing_fields": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer = draft.customer

        if hasattr(customer, "user"):
            customer = customer.user

        if not customer:
            raise ValidationError("Customer not found.")

        with transaction.atomic():
            job = JobRequest.objects.create(
                customer=customer,
                title=draft.title,
                description=draft.description,
                budget=draft.budget,
                city=draft.city,
                profession=draft.profession,
                address=resolved_address,
                postal_code=draft.postal_code,
                is_active=False,
                moderation_status=JobRequest.MODERATION_PENDING,
                moderation_note="",
                submitted_at=timezone.now(),
                expires_at=None,
            )

            draft.is_submitted = True
            draft.save(update_fields=["is_submitted"])

            JobRequestAudit.objects.create(
                job_request=job,
                action="created_from_draft",
                message="Kërkesa u krijua nga një draft multi-step.",
            )
            JobRequestModerationEvent.objects.create(
                job_request=job,
                status=JobRequest.MODERATION_PENDING,
                note="Kërkesa u dërgua për shqyrtim.",
            )

        return Response(
            {
                "id": job.id,
                "detail": "Kërkesa u dërgua për shqyrtim.",
            },
            status=status.HTTP_201_CREATED,
        )


# ------------------------------------------------------------
# 👤 Permission: Customers kan skapa, andra läser
# ------------------------------------------------------------

class IsCustomerOrReadOnly(permissions.BasePermission):
    """
    • Customers får skapa job requests.
    • Companies får bara läsa.
    • Safe methods (GET/HEAD/OPTIONS) är öppna (men queryseten begränsas).
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        return bool(
            request.user.is_authenticated and getattr(request.user, "role", None) == "customer"
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.customer == request.user


# ------------------------------------------------------------
# 🏗️  JobRequest ViewSet (huvud-API:t)
# ------------------------------------------------------------

class JobRequestViewSet(ActiveAccountGuardMixin, viewsets.ModelViewSet):
    """
    Huvud-API för jobb-förfrågningar.

    • GET /api/jobrequests/          → roll-baserad lista
    • POST /api/jobrequests/         → skapa ny (customer)
    • GET /api/jobrequests/{id}/     → detaljer
    • POST /api/jobrequests/{id}/accept-offer/   → kund accepterar offert (Offer-truth)
    • POST /api/jobrequests/{id}/decline-offer/  → kund nekar offert (Offer-truth)
    • POST /api/jobrequests/{id}/reopen/         → runda 2 (nya 5 offerter)
    • GET  /api/jobrequests/mine/                → kundens egna requests
    """

    serializer_class = JobRequestSerializer
    permission_classes = [
        IsAuthenticated,
        IsEmailVerified,
        IsCustomerOrReadOnly,
        IsCompanyMarketplaceReady,
    ]
    pagination_class = AlbanianPagination

    def get_serializer_class(self):
        if self.action == "list":
            return JobRequestListSerializer

        if self.action in ["update", "partial_update"]:
            return JobRequestUpdateSerializer

        return JobRequestSerializer

    # --------------------------------------------------------
    # 🔍 Queryset beroende på roll
    # --------------------------------------------------------
    def get_queryset(self):
        user = self.request.user
        params = self.request.query_params

        if not user.is_authenticated:
            return JobRequest.objects.none()
        # Admin → see all
        if user.is_superuser:
            return (
                JobRequest.objects.all()
                .select_related("customer", "city", "profession")
                .prefetch_related("offers")
                .order_by("-created_at")
            )

        # Support for frontend request /api/jobrequests/?mine=1
        if params.get("mine") == "1":
            if getattr(user, "role", None) == "customer":
                return (
                    JobRequest.objects.filter(
                        customer=user,
                        is_deleted=False
                    )
                    .select_related("customer", "city", "profession")
                    .prefetch_related("offers")
                    .order_by("-created_at")
                )

            return JobRequest.objects.none()

        # Customer → only own job requests
        if getattr(user, "role", None) == "customer":
            return (
                JobRequest.objects.filter(
                    customer=user,
                    is_deleted=False
                )
                .select_related("customer", "city", "profession")
                .prefetch_related("offers")
                .order_by("-created_at")
            )

        # Company → only active jobs (och kräver aktiv company)
        if getattr(user, "role", None) == "company":
            company_profile = getattr(user, "company_profile", None)
            if company_profile and company_profile.is_active:
                return (
                    JobRequest.objects.filter(
                        is_active=True,
                        moderation_status=JobRequest.MODERATION_APPROVED,
                        is_deleted=False
                    )
                    .select_related("customer", "city", "profession")
                    .prefetch_related("offers")
                    .order_by("-created_at")
                )
            return JobRequest.objects.none()

        return JobRequest.objects.none()

    # --------------------------------------------------------
    # 📝 Skapa ny job request → koppla till customer_profile
    # --------------------------------------------------------
    def perform_create(self, serializer):
        user = self.request.user

        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            raise ValidationError("Vetëm klientët mund të krijojnë kërkesa.")

        job = serializer.save(
            customer=user,
            moderation_status=JobRequest.MODERATION_PENDING,
            moderation_note="",
            submitted_at=timezone.now(),
            is_active=False,
            expires_at=None,
        )
        JobRequestModerationEvent.objects.create(
            job_request=job,
            status=JobRequest.MODERATION_PENDING,
            note="Kërkesa u dërgua për shqyrtim.",
        )

    # --------------------------------------------------------
    # ✏️ PATCH /api/jobrequests/{id}/
    # --------------------------------------------------------
    def partial_update(self, request, *args, **kwargs):
        job = self.get_object()
        user = request.user

        if getattr(user, "role", None) != "customer":
            raise PermissionDenied("Vetëm klientët mund të ndryshojnë kërkesën.")

        if job.customer != user:
            raise PermissionDenied("Kjo kërkesë nuk është e juaja.")

        editable_moderation_statuses = {
            JobRequest.MODERATION_PENDING,
            JobRequest.MODERATION_CHANGES_REQUESTED,
        }

        if not job.is_active and job.moderation_status not in editable_moderation_statuses:
            raise ValidationError("Kërkesa është mbyllur dhe nuk mund të ndryshohet.")

        if job.is_completed or job.winner_offer_id:
            raise ValidationError(
                "Kërkesa ka ofertë të pranuar dhe nuk mund të ndryshohet."
            )

        # ✅ Offer-truth: lås edit om det finns offers som inte är DRAFT
        if job.offers.exclude(status=OfferStatus.DRAFT).exists():
            raise ValidationError("Kjo kërkesë nuk mund të ndryshohet sepse ka oferta.")

        if (
            job.moderation_status == JobRequest.MODERATION_APPROVED
            and job.created_at
            and timezone.now() > job.created_at + timedelta(hours=48)
        ):
            raise ValidationError("Kjo kërkesë nuk mund të ndryshohet pas 48 orësh.")

        response = super().partial_update(request, *args, **kwargs)

        updated_job = self.get_object()

        if job.moderation_status in {
            JobRequest.MODERATION_PENDING,
            JobRequest.MODERATION_CHANGES_REQUESTED,
            JobRequest.MODERATION_APPROVED,
        }:
            updated_job.moderation_status = JobRequest.MODERATION_PENDING
            updated_job.moderation_note = ""
            updated_job.submitted_at = timezone.now()
            updated_job.moderation_updated_at = None
            updated_job.is_active = False
            updated_job.published_at = None
            updated_job.expires_at = None
            updated_job.save(update_fields=[
                "moderation_status",
                "moderation_note",
                "submitted_at",
                "moderation_updated_at",
                "is_active",
                "published_at",
                "expires_at",
                "updated_at",
            ])
            JobRequestModerationEvent.objects.create(
                job_request=updated_job,
                status=JobRequest.MODERATION_PENDING,
                note="Kërkesa e përditësuar u ridërgua për shqyrtim.",
            )

        JobRequestAudit.objects.create(
            job_request=updated_job,
            action="job_updated",
            message="Klienti përditësoi kërkesën.",
        )

        return response

    # --------------------------------------------------------
    # 👤 GET /api/jobrequests/mine/
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def mine(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"detail": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        if getattr(user, "role", None) != "customer":
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        qs = (
            JobRequest.objects.filter(
                customer=user,
                is_deleted=False
            )
            .select_related("customer", "city", "profession")
            .prefetch_related("offers")
            .order_by("-created_at")
        )
        serializer = self.get_serializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    # --------------------------------------------------------
    # ✅ POST /api/jobrequests/{id}/accept-offer/ (Offer-truth)
    # --------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="accept-offer")
    def accept_offer(self, request, pk=None):
        job = self.get_object()
        user = request.user

        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if job.customer != user:
            return Response(
                {"detail": "Kjo kërkesë nuk është e juaja."},
                status=status.HTTP_403_FORBIDDEN,
            )

        offer_id = request.data.get("offer_id")
        if not offer_id:
            return Response(
                {"detail": "offer_id është i detyrueshëm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            offer = Offer.objects.select_related("company", "current_version").get(
                id=offer_id, job_request=job
            )
        except Offer.DoesNotExist:
            return Response({"detail": "Oferta nuk u gjet."}, status=status.HTTP_404_NOT_FOUND)

        try:
            _, job = accept_offer_service(offer_id=offer.id, customer=user)
        except OfferAcceptanceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(job, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # --------------------------------------------------------
    # ❌ POST /api/jobrequests/{id}/decline-offer/ (Offer-truth)
    # --------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="decline-offer")
    def decline_offer(self, request, pk=None):
        job = self.get_object()
        user = request.user

        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if job.customer != user:
            return Response({"detail": "Kjo kërkesë nuk është e juaja."}, status=status.HTTP_403_FORBIDDEN)

        offer_id = request.data.get("offer_id")
        if not offer_id:
            return Response({"detail": "offer_id është i detyrueshëm."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            offer = Offer.objects.select_related("company").get(id=offer_id, job_request=job)
        except Offer.DoesNotExist:
            return Response({"detail": "Oferta nuk u gjet."}, status=status.HTTP_404_NOT_FOUND)

        if offer.status == OfferStatus.ACCEPTED:
            return Response(
                {"detail": "Nuk mund të refuzoni një ofertë të pranuar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        offer.status = OfferStatus.REJECTED
        offer.rejected_at = timezone.now()
        offer.save()

        JobRequestAudit.objects.create(
            job_request=job,
            company=offer.company,
            action="offer_declined",
            message="Klienti refuzoi ofertën.",
        )

        return Response({"detail": "Oferta u refuzua."}, status=status.HTTP_200_OK)

    # --------------------------------------------------------
    # 🔁 POST /api/jobrequests/{id}/reopen/ (Offer-truth)
    # --------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen_for_more_offers(self, request, pk=None):
        job = self.get_object()
        user = request.user

        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if job.customer != user:
            return Response({"detail": "Kjo kërkesë nuk është e juaja."}, status=status.HTTP_403_FORBIDDEN)

        if job.is_completed:
            return Response({"detail": "Kjo kërkesë është mbyllur tashmë."}, status=status.HTTP_400_BAD_REQUEST)

        if job.is_reopened:
            return Response(
                {"detail": "Kjo kërkesë është tashmë rihapur për rundin e dytë."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_offers = Offer.objects.filter(job_request=job)

        if not existing_offers.exists():
            return Response({"detail": "Nuk ka oferta të mjaftueshme për rihapje."}, status=status.HTTP_400_BAD_REQUEST)

        # Block om någon accepted
        if existing_offers.filter(status=OfferStatus.ACCEPTED).exists():
            return Response({"detail": "Ka një ofertë të pranuar – nuk mund të rihapet."}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Block om det finns aktiva offers (SIGNED/ACCEPTED)
        if existing_offers.filter(status__in=[OfferStatus.SIGNED, OfferStatus.ACCEPTED]).exists():
            return Response(
                {"detail": "Ka oferta aktive – vendosni fillimisht për to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if job.offers_count < 7:
            return Response({"detail": "Rundi i parë nuk është plotësuar ende."}, status=status.HTTP_400_BAD_REQUEST)

        job.is_reopened = True
        job.max_offers = 12
        job.reopened_at = timezone.now()
        job.save()

        JobRequestAudit.objects.create(
            job_request=job,
            action="reopened_round_two",
            message="Kërkesa u rihap për rundin e dytë (deri në 5 oferta shtesë).",
        )

        serializer = self.get_serializer(job, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # --------------------------------------------------------
    # 📜 GET /api/jobrequests/{id}/audit/
    # --------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="audit")
    def audit_log(self, request, pk=None):
        job = self.get_object()
        user = request.user

        if not user.is_authenticated:
            return Response({"detail": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        role = getattr(user, "role", None)

        # Customer: endast ägaren
        if role == "customer":
            if job.customer != user:
                return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
            


        # Company: endast om lead är upplåst via Offer + kräver aktiv company
        elif role == "company":
            company = getattr(user, "company_profile", None)
            if not company or not company.is_active:
                return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

            offer = Offer.objects.filter(company=company, job_request=job).first()
            if not offer or not offer.lead_unlocked:
                return Response({"detail": "Lead is locked"}, status=status.HTTP_403_FORBIDDEN)

        else:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        logs = job.audit_logs.all().order_by("-created_at")
        serializer = JobRequestAuditSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # --------------------------------------------------------
    # 🗑️ DELETE /api/jobrequests/{id}/  → Soft delete
    # --------------------------------------------------------
    def destroy(self, request, *args, **kwargs):
        job = self.get_object()
        user = request.user

        if getattr(user, "role", None) != "customer":
            raise PermissionDenied("Vetëm klientët mund ta fshijnë kërkesën.")

        if job.customer != user:
            raise PermissionDenied("Kjo kërkesë nuk është e juaja.")

        # 🚫 Permanent block om jobbet redan är avslutat
        if job.is_completed or job.winner_offer_id:
            raise ValidationError(
                "Kjo kërkesë nuk mund të fshihet sepse është përfunduar."
            )

        offers_qs = job.offers

        # 🚫 Block om accepterad offert finns
        if offers_qs.filter(status=OfferStatus.ACCEPTED).exists():
            raise ValidationError(
                "Kjo kërkesë nuk mund të fshihet sepse ka një ofertë të pranuar."
            )

        # 🚫 Block om det finns obesvarade/aktiva offerter
        if offers_qs.filter(status=OfferStatus.SIGNED).exists():
            raise ValidationError(
                "Kjo kërkesë nuk mund të fshihet sepse ka oferta të papërgjigjura. Refuzoni ofertat fillimisht."
            )

        now = timezone.now()

        job.is_deleted = True
        job.deleted_at = now
        job.is_active = False
        job.save(update_fields=[
            "is_deleted",
            "deleted_at",
            "is_active",
            "updated_at",
        ])

        JobRequestAudit.objects.create(
            job_request=job,
            action="job_deleted",
            message="Kërkesa u fshi nga klienti.",
        )

        return Response(status=status.HTTP_204_NO_CONTENT)
