# ndertimnet/backend/leads/views.py 

from rest_framework import viewsets, serializers, status, filters
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from accounts.models import Customer, Company
from .models import JobRequest, LeadMatch, LeadMessage
from .serializers import LeadMatchSerializer, LeadMessageSerializer
from jobrequests.serializers import JobRequestSerializer
from core.pagination import AlbanianPagination

from accounts.permissions import IsEmailVerified, IsCompanyProfileCompleteOnlyForCompanies
from payments.services.access import has_offer_access


# ------------------------------------------------------------
# ✅ Helper: robust Company lookup
# ------------------------------------------------------------
def get_company_for_user(user):
    """
    Returns Company instance linked to user, or None.
    Works regardless of whether you have user.company_profile or not.
    """
    return Company.objects.filter(user=user).first()


# ------------------------------------------------------------
# 🇦🇱 Kërkesat e punës (JobRequest)
# ------------------------------------------------------------
class JobRequestViewSet(viewsets.ModelViewSet):
    queryset = JobRequest.objects.all().order_by("-created_at")
    serializer_class = JobRequestSerializer
    permission_classes = [
        IsAuthenticated,
        IsEmailVerified,
        IsCompanyProfileCompleteOnlyForCompanies,
    ]
    pagination_class = AlbanianPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "is_reopened", "location", "max_offers"]
    search_fields = ["title", "description", "location", "customer__user__email"]
    ordering_fields = ["created_at", "budget", "max_offers"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        """
        Kur një përdorues (klient) krijon kërkesë të re,
        siguro që të ekzistojë Customer-profili.
        """
        user = self.request.user
        customer_profile, _ = Customer.objects.get_or_create(
            user=user,
            defaults={"phone": "", "address": ""},
        )
        serializer.save(customer=customer_profile)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        company = get_company_for_user(user)

        # 🔐 blockera företag utan färdig profil
        if company and getattr(company, "profile_step", 0) < 4:
            return qs.none()

        # Company sees relevant active jobs
        if company:
            if company.professions.exists():
                return qs.filter(
                    is_active=True,
                    professions__in=company.professions.all()
                ).distinct()
            return qs.none()

        if getattr(user, "customer_profile", None):
            return qs.filter(customer=user.customer_profile)

        return qs.none()

    # --------------------------------------------------------
    # 🔐 STEG 4A — JobRequest FULL vs LÅST vy
    # --------------------------------------------------------
    def retrieve(self, request, *args, **kwargs):
        job = self.get_object()
        user = request.user

        data = JobRequestSerializer(job, context={"request": request}).data

        if user.is_authenticated and getattr(user, "customer_profile", None):
            return Response(data, status=status.HTTP_200_OK)

        company = None
        if user.is_authenticated:
            company = get_company_for_user(user)

        if company and has_offer_access(company, job):
            return Response(data, status=status.HTTP_200_OK)

        data["locked"] = True
        data["lock_reason"] = "offer_access_required"

        for field in [
            "description",
            "budget",
            "requirements",
            "address",
            "customer",
            "customer_phone",
            "customer_email",
        ]:
            if field in data:
                data[field] = None

        return Response(data, status=status.HTTP_200_OK)



# ------------------------------------------------------------
# 🇦🇱 Oferta të kompanive (LeadMatch)
# ------------------------------------------------------------
class LeadMatchViewSet(viewsets.ModelViewSet):
    queryset = (
        LeadMatch.objects.all()
        .select_related("job_request", "company", "job_request__customer")
        .order_by("-created_at")
    )
    serializer_class = LeadMatchSerializer
    permission_classes = [
        IsAuthenticated,
        IsEmailVerified,
        IsCompanyProfileCompleteOnlyForCompanies,
    ]   
    pagination_class = AlbanianPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["company", "job_request", "status"]
    search_fields = ["message", "job_request__title", "company__company_name"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    # --------------------------------------------------------
    # CUSTOM ACTIONS (ACCEPT / DECLINE BY CUSTOMER)
    # --------------------------------------------------------
    def accept(self, request, pk=None):
        """
        Klienti pranon ofertën:
        - status → accepted
        - workflow_status → in_progress
        - can_chat → True
        - customer_info_unlocked → True
        """
        lead = self.get_object()

        customer = getattr(request.user, "customer_profile", None)
        if not customer or lead.job_request.customer != customer:
            return Response(
                {"detail": "Nuk keni autorizim për këtë ofertë."},
                status=status.HTTP_403_FORBIDDEN,
            )

        lead.status = "accepted"
        lead.workflow_status = "in_progress"
        lead.can_chat = True
        lead.customer_info_unlocked = True
        lead.customer_info_unlocked_by_company = False
        lead.save()

        return Response({"detail": "Oferta u pranua."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        """
        Klienti refuzon ofertën:
        - status → declined
        - workflow_status → archived
        - can_chat → False
        - customer_info_unlocked → False
        """
        lead = self.get_object()

        customer = getattr(request.user, "customer_profile", None)
        if not customer or lead.job_request.customer != customer:
            return Response(
                {"detail": "Nuk keni autorizim për këtë ofertë."},
                status=status.HTTP_403_FORBIDDEN,
            )

        lead.status = "declined"
        lead.workflow_status = "archived"
        lead.can_chat = False
        lead.customer_info_unlocked = False
        lead.customer_info_unlocked_by_company = False
        lead.save()

        return Response({"detail": "Oferta u refuzua."}, status=status.HTTP_200_OK)

    # --------------------------------------------------------
    # GET QUERYSET (PER-USER VISIBILITY)
    # --------------------------------------------------------
    def get_queryset(self):
        """
        - Superuser: sheh të gjitha lead matches.
        - Kompania: sheh vetëm lead matches për kompaninë e vet.
        - Klienti: sheh vetëm oferta për kërkesat e veta.
        - Plus filtër ?job_request=<id>
        """
        user = self.request.user

        qs = (
            LeadMatch.objects
            .select_related("company", "job_request", "job_request__customer")
            .order_by("-created_at")
        )

        if user.is_superuser:
            filtered = qs
        else:
            company = get_company_for_user(user)
            if company:
                filtered = qs.filter(company=company)
            elif getattr(user, "customer_profile", None):
                filtered = qs.filter(job_request__customer=user.customer_profile)
            else:
                filtered = LeadMatch.objects.none()

        # Support ?job_request=ID
        job_request_id = self.request.query_params.get("job_request")
        if job_request_id:
            try:
                job_request_id_int = int(job_request_id)
            except ValueError:
                return LeadMatch.objects.none()
            filtered = filtered.filter(job_request_id=job_request_id_int)

        # (debug prints – remove later if you want)
        print("DEBUG → job_request filter:", self.request.query_params.get("job_request"))
        print("DEBUG → SQL:", filtered.query)

        return filtered
    
    # --------------------------------------------------------
    # CREATE (COMPANY SENDS OFFER)
    # --------------------------------------------------------
    def perform_create(self, serializer):
        user = self.request.user
        company = get_company_for_user(user)

        if not company:
            raise serializers.ValidationError(
                {"detail": "Duhet të jeni kompani për të dërguar ofertë."}
            )

        job_request = serializer.validated_data.get("job_request")
        if not job_request:
            raise serializers.ValidationError({"detail": "Zgjidhni një kërkesë për punë."})

        # 🔐 STEG 4B — kräver Offer Access (15€)
        if not has_offer_access(company, job_request):
            raise serializers.ValidationError(
                {
                    "detail": "Offer access (15€) krävs för att skicka offert.",
                    "code": "offer_access_required",
                }
            )

        if not job_request.is_active:
            raise serializers.ValidationError({"detail": "Kjo punë nuk është më aktive."})

        if LeadMatch.objects.filter(job_request=job_request, company=company).exists():
            raise serializers.ValidationError(
                {"detail": "Keni dërguar tashmë një ofertë për këtë punë."}
            )

        if job_request.offers_count >= job_request.max_offers:
            raise serializers.ValidationError(
                {"detail": "Kjo punë ka arritur numrin maksimal të ofertave."}
            )

        lead = serializer.save(company=company)

        job_request.last_offer_at = timezone.now()
        job_request.save(update_fields=["last_offer_at"])

        return lead


    # --------------------------------------------------------
    # RETRIEVE (ONE LEAD + ANONYMISATION + CONTACT FIELDS)
    # --------------------------------------------------------
    def retrieve(self, request, *args, **kwargs):
        """
        Kthen një LeadMatch:
        - gjithmonë me nested job_request & company (via serializer)
        - nëse customer_info_unlocked = False → anonimizo klientin
        - nëse customer_info_unlocked = True → shto customer_phone & customer_email
        - nëse can_chat = False → messages: [] (frontend di që s’ka chat akoma)
        """
        lead = self.get_object()
        data = LeadMatchSerializer(lead).data

        # 🔐 Anonymisation of customer
        if not lead.customer_info_unlocked:
            if "job_request" in data and "customer" in data["job_request"]:
                data["job_request"]["customer"] = {
                    "id": None,
                    "user": {
                        "first_name": "Anonymous",
                        "last_name": "Customer",
                        "email": None,
                    },
                    "phone": None,
                    "address": None,
                }
        else:
            customer = lead.job_request.customer
            data["customer_phone"] = getattr(customer, "phone", None)
            data["customer_email"] = getattr(customer.user, "email", None)

        # 💬 If chat is locked, return empty list so frontend knows.
        if not lead.can_chat:
            data["messages"] = []

        return Response(data, status=status.HTTP_200_OK)

    # --------------------------------------------------------
    # 🔥 Ndertimnet v.05 — PREMIUM / WORKFLOW ACTIONS (COMPANY)
    # --------------------------------------------------------
    
    # 3️⃣ Set workflow status (pipeline) – only company that owns the lead
    @action(detail=True, methods=["post"])
    def set_status(self, request, pk=None):
        """
        Ndryshon vetëm workflow_status (pipeline i punës):
        - active
        - in_progress
        - completed
        - archived
        Vetëm kompania e lead-it lejohet ta ndryshojë.
        """
        lead = self.get_object()

        company = get_company_for_user(request.user)
        if not company or lead.company != company:
            return Response(
                {"detail": "Vetëm kompania e kësaj oferte mund të ndryshojë statusin e punës."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("status")

        valid_statuses = dict(getattr(LeadMatch, "WORKFLOW_STATUS_CHOICES", [])).keys()
        if valid_statuses and new_status not in valid_statuses:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        lead.workflow_status = new_status
        lead.save()

        return Response({"message": "Status updated"}, status=status.HTTP_200_OK)    
    
    # --------------------------------------------------------
    # 🔍 CHECK IF OFFER EXISTS FOR JOB (FOR LOGGED COMPANY)
    # --------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="check-by-job/(?P<job_id>[^/.]+)")
    def check_by_job(self, request, job_id=None):
        """
        Returnerar:
        {
          exists: true/false,
          offer_id: <id> (om finns)
        }

        Används av:
        /jobrequests/<id> sidan
        """
        user = request.user
        company = get_company_for_user(user)

        if not company:
            return Response(
                {"detail": "Vetëm kompanitë mund të kontrollojnë ofertat."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            job_id_int = int(job_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Job ID i pavlefshëm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        offer = LeadMatch.objects.filter(
            job_request_id=job_id_int,
            company=company
        ).first()

        if offer:
            return Response({
                "exists": True,
                "offer_id": offer.id
            })

        return Response({
            "exists": False
        })

# ------------------------------------------------------------
# 💬 MESAZHET (Chat)
# ------------------------------------------------------------
class LeadMessageViewSet(viewsets.ModelViewSet):
    queryset = (
        LeadMessage.objects
        .all()
        .select_related("lead", "sender_company", "sender_customer")
    )
    serializer_class = LeadMessageSerializer
    permission_classes = [
        IsAuthenticated,
        IsEmailVerified,
        IsCompanyProfileCompleteOnlyForCompanies,
]
    pagination_class = AlbanianPagination
    ordering = ["created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        lead_id = self.request.query_params.get("lead")

        if not lead_id:
            return qs.none()

        try:
            lead = LeadMatch.objects.get(pk=int(lead_id))
        except (LeadMatch.DoesNotExist, ValueError):
            return qs.none()

        company = get_company_for_user(self.request.user)

        # 🔐 Företag måste ha unlockat lead
        if company:
            if not has_offer_access(company, lead.job_request):
                return qs.none()

        return qs.filter(lead=lead).order_by("created_at")


    def perform_create(self, serializer):
        """
        Kur dërgohet mesazh:
        - lidhet gjithmonë me një LeadMatch ekzistues
        - nëse user është kompani → sender_type = "company"
        - nëse user është klient → sender_type = "customer"
        """
        user = self.request.user
        lead_id = self.request.data.get("lead")

        if not lead_id:
            raise serializers.ValidationError({"detail": "Lead ID mungon."})

        try:
            lead = LeadMatch.objects.get(pk=int(lead_id))
        except (LeadMatch.DoesNotExist, ValueError):
            raise serializers.ValidationError({"detail": f"Lead me ID {lead_id} nuk ekziston."})


        company = get_company_for_user(user)
        if company:
            if lead.company != company:
                raise serializers.ValidationError(
                    {"detail": "Nuk keni autorizim për këtë lead."}
                )

            # 🔐 Lead måste vara upplåst
            if not has_offer_access(company, lead.job_request):
                raise serializers.ValidationError(
                    {
                        "detail": "Lead måste vara upplåst för att skriva meddelanden.",
                        "code": "offer_access_required",
                    }
                )

            return serializer.save(
                lead=lead,
                sender_company=company,
                sender_customer=None,
                sender_type="company",
            )



        if getattr(user, "customer_profile", None):
            if lead.job_request.customer != user.customer_profile:
                raise serializers.ValidationError(
                    {"detail": "Nuk keni autorizim për këtë lead."}
                )
            return serializer.save(
                lead=lead,
                sender_company=None,
                sender_customer=user.customer_profile,
                sender_type="customer",
            )

        raise serializers.ValidationError(
            {"detail": "Përdoruesi nuk është kompani as klient."}
        )

