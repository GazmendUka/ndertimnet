# backend/jobrequests/views.py

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsCompanyProfileComplete, IsEmailVerified
from main.pagination import AlbanianPagination

from offers.models import Offer, OfferStatus
from leads.models import ArchivedJob  # behåll om du vill fortsätta arkivera

from .models import JobRequest, JobRequestAudit, JobRequestDraft
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
        customer_profile = getattr(request.user, "customer_profile", None)
        return bool(customer_profile and obj.customer == customer_profile)


# ------------------------------------------------------------
# ✅ Company-profile completeness bara för companies
# ------------------------------------------------------------

class IsCompanyProfileCompleteIfCompany(permissions.BasePermission):
    """
    Customers ska inte blockas av company-profile-krav.
    Companies måste ha komplett profil (enligt IsCompanyProfileComplete).
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) != "company":
            return True

        # Delegation till befintlig permission
        return IsCompanyProfileComplete().has_permission(request, view)


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
    permission_classes = [IsAuthenticated, IsEmailVerified, IsCustomerAndOwner]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        customer_profile = getattr(user, "customer_profile", None)

        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            return JobRequestDraft.objects.none()

        if not customer_profile:
            return JobRequestDraft.objects.none()

        return JobRequestDraft.objects.filter(customer=customer_profile).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        customer_profile = getattr(user, "customer_profile", None)

        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            raise ValidationError("Vetëm klientët mund të krijojnë kërkesa (draft).")

        if not customer_profile:
            raise ValidationError("Nuk u gjet profili i klientit për këtë përdorues.")

        serializer.save(customer=customer_profile)

    # --------------------------------------------------------
    # 🚀 POST /jobrequest-drafts/<id>/submit/
    # Konvertera draft → riktig JobRequest
    # --------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        draft = self.get_object()

        if draft.is_submitted:
            return Response(
                {"detail": "Ky draft është tashmë i dorëzuar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        missing = []
        if not draft.title:
            missing.append("title")
        if not draft.description:
            missing.append("description")
        if not draft.city:
            missing.append("city")
        if not draft.profession:
            missing.append("profession")

        if missing:
            return Response(
                {"detail": "Kërkesa nuk është e plotë.", "missing_fields": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = JobRequest.objects.create(
            customer=draft.customer,
            title=draft.title,
            description=draft.description,
            budget=draft.budget,
            city=draft.city,
            profession=draft.profession,
            is_active=True,
        )

        draft.is_submitted = True
        draft.save(update_fields=["is_submitted"])

        JobRequestAudit.objects.create(
            job_request=job,
            action="created_from_draft",
            message="Kërkesa u krijua nga një draft multi-step.",
        )

        serializer = JobRequestSerializer(job, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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

        customer_profile = getattr(request.user, "customer_profile", None)
        return bool(customer_profile and obj.customer == customer_profile)


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
        IsCompanyProfileCompleteIfCompany,
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

        # Support for frontend request /api/jobrequests/?mine=1
        if params.get("mine") == "1":
            customer_profile = getattr(user, "customer_profile", None)
            if customer_profile and getattr(user, "role", None) == "customer":
                return (
                    JobRequest.objects.filter(
                        customer=customer_profile,
                        is_deleted=False
                    )
                    .select_related("customer", "city", "profession")
                    .prefetch_related("offers")
                    .order_by("-created_at")
                )
            return JobRequest.objects.none()

        # Customer → only own job requests
        if getattr(user, "role", None) == "customer":
            customer_profile = getattr(user, "customer_profile", None)
            if customer_profile:
                return (
                    JobRequest.objects.filter(
                        customer=customer_profile,
                        is_deleted=False
                    )
                    .select_related("customer", "city", "profession")
                    .prefetch_related("offers")
                    .order_by("-created_at")
                )
            return JobRequest.objects.none()

        # Company → only active jobs (och kräver aktiv company)
        if getattr(user, "role", None) == "company":
            company_profile = getattr(user, "company_profile", None)
            if company_profile and company_profile.is_active:
                return (
                    JobRequest.objects.filter(
                        is_active=True,
                        is_deleted=False
                    )
                    .select_related("customer", "city", "profession")
                    .prefetch_related("offers")
                    .order_by("-created_at")
                )
            return JobRequest.objects.none()

        # Admin → see all
        if user.is_superuser:
            return (
                JobRequest.objects.all()
                .select_related("customer", "city", "profession")
                .prefetch_related("offers")
                .order_by("-created_at")
            )

        return JobRequest.objects.none()

    # --------------------------------------------------------
    # 📝 Skapa ny job request → koppla till customer_profile
    # --------------------------------------------------------
    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            raise ValidationError("Vetëm klientët mund të krijojnë kërkesa.")

        customer_profile = getattr(user, "customer_profile", None)
        if not customer_profile:
            raise ValidationError("Nuk u gjet profili i klientit për këtë përdorues.")

        serializer.save(customer=customer_profile)

    # --------------------------------------------------------
    # ✏️ PATCH /api/jobrequests/{id}/
    # --------------------------------------------------------
    def partial_update(self, request, *args, **kwargs):
        job = self.get_object()
        user = request.user

        if getattr(user, "role", None) != "customer":
            raise PermissionDenied("Vetëm klientët mund të ndryshojnë kërkesën.")

        customer_profile = getattr(user, "customer_profile", None)
        if not customer_profile or job.customer != customer_profile:
            raise PermissionDenied("Kjo kërkesë nuk është e juaja.")

        if not job.is_active:
            raise ValidationError("Kërkesa është mbyllur dhe nuk mund të ndryshohet.")

        if job.is_completed or job.winner_offer_id:
            raise ValidationError(
                "Kërkesa ka ofertë të pranuar dhe nuk mund të ndryshohet."
            )

        # ✅ Offer-truth: lås edit om det finns offers som inte är DRAFT
        if job.offers.exclude(status=OfferStatus.DRAFT).exists():
            raise ValidationError("Kjo kërkesë nuk mund të ndryshohet sepse ka oferta.")

        # ✅ Policy: inom 48 timmar
        if job.created_at and timezone.now() > job.created_at + timedelta(hours=48):
            raise ValidationError("Kjo kërkesë nuk mund të ndryshohet pas 48 orësh.")

        response = super().partial_update(request, *args, **kwargs)

        updated_job = self.get_object()

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

        customer_profile = getattr(user, "customer_profile", None)
        if not customer_profile:
            return Response([], status=status.HTTP_200_OK)

        qs = (
            JobRequest.objects.filter(
                customer=customer_profile,
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

        customer_profile = getattr(user, "customer_profile", None)
        if job.customer != customer_profile:
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

        if offer.status == OfferStatus.REJECTED:
            return Response(
                {"detail": "Nuk mund të pranoni një ofertë të refuzuar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Kräver signering innan accept
        if not offer.current_version or not offer.current_version.is_signed:
            return Response(
                {"detail": "Oferta duhet të jetë e nënshkruar para pranimit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            now = timezone.now()

            # ✅ Accept selected + unlock lead (efter accept ska de alltid ha access)
            offer.status = OfferStatus.ACCEPTED
            offer.accepted_at = now
            offer.lead_unlocked = True
            offer.save(update_fields=["status", "accepted_at", "lead_unlocked", "updated_at"])

            # ✅ Reject other offers (men rör inte DRAFT)
            Offer.objects.filter(job_request=job).exclude(id=offer.id).exclude(
                status__in=[OfferStatus.REJECTED, OfferStatus.DRAFT]
            ).update(
                status=OfferStatus.REJECTED,
                rejected_at=now,
                updated_at=now,
            )

            # ✅ Update job fields (för UI/compat)
            price = offer.current_version.price_amount if offer.current_version else None

            job.accepted_company = offer.company
            job.accepted_price = price or job.budget
            job.winner_company = offer.company
            job.winner_price = price or job.budget
            job.winner_offer = offer
            job.is_completed = True
            job.is_active = False
            job.save()

            # Archive (om du vill behålla)
            ArchivedJob.objects.create(
                title=job.title,
                description=job.description,
                category=job.profession.name,
                location=job.city.name,
                date_accepted=now,
                price=price or (job.budget or 0),
                company=offer.company,
            )

            JobRequestAudit.objects.create(
                job_request=job,
                company=offer.company,
                action="offer_accepted",
                message="Klienti pranoi ofertën.",
            )
            JobRequestAudit.objects.create(
                job_request=job,
                company=offer.company,
                action="winner_selected",
                message="Kompania u zgjodh si fituese.",
            )
            JobRequestAudit.objects.create(
                job_request=job,
                company=offer.company,
                action="job_closed",
                message="Kërkesa u mbyll pas pranimit të ofertës.",
            )

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

        customer_profile = getattr(user, "customer_profile", None)
        if job.customer != customer_profile:
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

        customer_profile = getattr(user, "customer_profile", None)
        if job.customer != customer_profile:
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
            customer_profile = getattr(user, "customer_profile", None)
            if not customer_profile or job.customer != customer_profile:
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

        customer_profile = getattr(user, "customer_profile", None)
        if not customer_profile or job.customer != customer_profile:
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