# backend/jobrequests/views.py

from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated

from main.pagination import AlbanianPagination
from accounts.permissions import IsEmailVerified, IsCompanyProfileComplete

from .models import JobRequest, JobRequestAudit, JobRequestDraft
from .serializers import (
    JobRequestSerializer,
    JobRequestListSerializer,
    JobRequestAuditSerializer,
    JobRequestDraftSerializer,
)

# OBS:
# LeadMatch används fortfarande i accept/decline i denna fil.
# Det är en kvarvarande "legacy" som bör migreras till offers.Offer senare,
# eftersom Payment/Lead unlock nu bygger på offers.Offer + lead_unlocked.
from leads.models import LeadMatch, ArchivedJob

from offers.models import Offer


# ------------------------------------------------------------
# 🔐 GLOBALT SKYDD (gäller alla ViewSets i denna fil)
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
        if not request.user.is_authenticated:
            return False
        return getattr(request.user, "role", None) == "customer"

    def has_object_permission(self, request, view, obj):
        customer_profile = getattr(request.user, "customer_profile", None)
        return obj.customer == customer_profile


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
    permission_classes = [
        IsAuthenticated,
        IsEmailVerified,
        IsCustomerAndOwner,
    ]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        customer_profile = getattr(user, "customer_profile", None)

        if not user.is_authenticated or getattr(user, "role", None) != "customer":
            return JobRequestDraft.objects.none()

        if not customer_profile:
            return JobRequestDraft.objects.none()

        return JobRequestDraft.objects.filter(customer=customer_profile).order_by(
            "-created_at"
        )

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
            action="job_closed",  # kan senare bytas till en egen action "created_from_draft"
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

        return (
            request.user.is_authenticated
            and getattr(request.user, "role", None) == "customer"
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        customer_profile = getattr(request.user, "customer_profile", None)
        return customer_profile is not None and obj.customer == customer_profile


# ------------------------------------------------------------
# 🏗️  JobRequest ViewSet (huvud-API:t)
# ------------------------------------------------------------

class JobRequestViewSet(ActiveAccountGuardMixin, viewsets.ModelViewSet):
    """
    Huvud-API för jobb-förfrågningar.

    • GET /api/jobrequests/          → roll-baserad lista
    • POST /api/jobrequests/         → skapa ny (customer)
    • GET /api/jobrequests/{id}/     → detaljer
    • POST /api/jobrequests/{id}/accept-offer/   → kund accepterar offert
    • POST /api/jobrequests/{id}/decline-offer/  → kund nekar offert
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
                return JobRequest.objects.filter(customer=customer_profile).order_by(
                    "-created_at"
                )
            return JobRequest.objects.none()

        # Customer → only own job requests
        if getattr(user, "role", None) == "customer":
            customer_profile = getattr(user, "customer_profile", None)
            if customer_profile:
                return JobRequest.objects.filter(customer=customer_profile).order_by(
                    "-created_at"
                )
            return JobRequest.objects.none()

        # Company → only active jobs (och kräver aktiv company)
        if getattr(user, "role", None) == "company":
            company_profile = getattr(user, "company_profile", None)
            if company_profile and company_profile.is_active:
                return JobRequest.objects.filter(is_active=True).order_by("-created_at")
            return JobRequest.objects.none()

        # Admin → see all
        if user.is_superuser:
            return JobRequest.objects.all().order_by("-created_at")

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
    # 👤 GET /api/jobrequests/mine/
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def mine(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"detail": "Not authenticated"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if getattr(user, "role", None) != "customer":
            return Response(
                {"detail": "Not allowed"},
                status=status.HTTP_403_FORBIDDEN,
            )

        customer_profile = getattr(user, "customer_profile", None)
        if not customer_profile:
            return Response([], status=status.HTTP_200_OK)

        qs = JobRequest.objects.filter(customer=customer_profile).order_by("-created_at")
        serializer = self.get_serializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    # --------------------------------------------------------
    # ✅ POST /api/jobrequests/{id}/accept-offer/
    # Kund accepterar en offert → vinnare, arkiv, logg
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

        # LEGACY: här används fortfarande LeadMatch som "offer"
        try:
            offer = LeadMatch.objects.get(id=offer_id, job_request=job)
        except LeadMatch.DoesNotExist:
            return Response(
                {"detail": "Oferta nuk u gjet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        offer.status = "accepted"
        offer.save()

        LeadMatch.objects.filter(job_request=job).exclude(id=offer.id).update(
            status="declined"
        )

        job.accepted_company = offer.company
        job.accepted_price = offer.price
        job.winner_company = offer.company
        job.winner_price = offer.price
        job.winner_offer = offer
        job.is_completed = True
        job.is_active = False
        job.save()

        ArchivedJob.objects.create(
            title=job.title,
            description=job.description,
            category=job.profession.name,
            location=job.city.name,
            date_accepted=timezone.now(),
            price=offer.price or (job.budget or 0),
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
    # ❌ POST /api/jobrequests/{id}/decline-offer/
    # Kund nekar en specifik offert
    # --------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="decline-offer")
    def decline_offer(self, request, pk=None):
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

        # LEGACY: här används fortfarande LeadMatch som "offer"
        try:
            offer = LeadMatch.objects.get(id=offer_id, job_request=job)
        except LeadMatch.DoesNotExist:
            return Response(
                {"detail": "Oferta nuk u gjet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if offer.status == "accepted":
            return Response(
                {"detail": "Nuk mund të refuzoni një ofertë të pranuar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        offer.status = "declined"
        offer.save()

        JobRequestAudit.objects.create(
            job_request=job,
            company=offer.company,
            action="offer_declined",
            message="Klienti refuzoi ofertën.",
        )

        return Response({"detail": "Oferta u refuzua."}, status=status.HTTP_200_OK)

    # --------------------------------------------------------
    # 🔁 POST /api/jobrequests/{id}/reopen/
    # Runda 2 – deri në +5 extra offerter
    # --------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen_for_more_offers(self, request, pk=None):
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

        if job.is_completed:
            return Response(
                {"detail": "Kjo kërkesë është mbyllur tashmë."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if job.is_reopened:
            return Response(
                {"detail": "Kjo kërkesë është tashmë rihapur për rundin e dytë."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_offers = job.matches.all()
        if not existing_offers.exists():
            return Response(
                {"detail": "Nuk ka oferta të mjaftueshme për rihapje."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing_offers.filter(status="accepted").exists():
            return Response(
                {"detail": "Ka një ofertë të pranuar – nuk mund të rihapet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing_offers.filter(status="pending").exists():
            return Response(
                {"detail": "Ka oferta në pritje – vendosni fillimisht për to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if job.offers_count < 7:
            return Response(
                {"detail": "Rundi i parë nuk është plotësuar ende."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
            return Response(
                {"detail": "Not authenticated"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        role = getattr(user, "role", None)

        # Customer: endast ägaren
        if role == "customer":
            customer_profile = getattr(user, "customer_profile", None)
            if not customer_profile or job.customer != customer_profile:
                return Response(
                    {"detail": "Not allowed"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Company: endast om lead är upplåst via Offer + kräver aktiv company
        elif role == "company":
            company = getattr(user, "company_profile", None)
            if not company or not company.is_active:
                return Response(
                    {"detail": "Not allowed"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            offer = Offer.objects.filter(company=company, job_request=job).first()
            if not offer or not offer.lead_unlocked:
                return Response(
                    {"detail": "Lead is locked"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        else:
            return Response(
                {"detail": "Not allowed"},
                status=status.HTTP_403_FORBIDDEN,
            )

        logs = job.audit_logs.all().order_by("-created_at")
        serializer = JobRequestAuditSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
