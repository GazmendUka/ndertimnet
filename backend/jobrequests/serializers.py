# backend/jobrequests/serializers.py

from rest_framework import serializers
from .models import JobRequest, JobRequestAudit, JobRequestDraft
from accounts.serializers import CustomerSerializer, CompanySerializer

from locations.serializers import CitySerializer
from taxonomy.serializers import ProfessionSerializer
from locations.models import City
from taxonomy.models import Profession


# ------------------------------------------------------------
# ✅ Minimal Offer serializers (inline, undviker import-cirklar)
# ------------------------------------------------------------

class OfferVersionPublicSerializer(serializers.Serializer):
    version_number = serializers.IntegerField()
    presentation_text = serializers.CharField()
    can_start_from = serializers.DateField(allow_null=True)
    duration_text = serializers.CharField()
    price_type = serializers.CharField()
    price_amount = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    currency = serializers.CharField()
    includes_text = serializers.CharField()
    excludes_text = serializers.CharField()
    payment_terms = serializers.CharField()
    is_signed = serializers.BooleanField()
    signed_at = serializers.DateTimeField(allow_null=True)


class OfferPublicSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    company = CompanySerializer(read_only=True)
    status = serializers.CharField()
    round_number = serializers.IntegerField()
    lead_unlocked = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    accepted_at = serializers.DateTimeField(allow_null=True)
    rejected_at = serializers.DateTimeField(allow_null=True)
    current_version = OfferVersionPublicSerializer(allow_null=True)


# ------------------------------------------------------------
# 🔎 AUDIT LOG SERIALIZER
# ------------------------------------------------------------

class JobRequestAuditSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = JobRequestAudit
        fields = ["id", "action", "message", "company", "created_at"]


# ------------------------------------------------------------
# 🧾 JOB REQUEST LIST SERIALIZER (COMPANY)
# ------------------------------------------------------------

class JobRequestListSerializer(serializers.ModelSerializer):
    has_offer = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()

    city_detail = CitySerializer(source="city", read_only=True)
    profession_detail = ProfessionSerializer(source="profession", read_only=True)

    class Meta:
        model = JobRequest
        fields = [
            "id",
            "title",
            "description",
            "budget",
            "is_active",
            "city_detail",
            "profession_detail",
            "customer",
            "has_offer",
        ]

    def _get_company(self):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        return getattr(request.user, "company_profile", None)

    def get_has_offer(self, obj):
        company = self._get_company()
        if not company:
            return False
        return obj.offers.filter(company=company).exists()

    def get_customer(self, obj):
        company = self._get_company()
        if not company:
            return None

        offer = obj.offers.filter(company=company).first()
        if not offer or not offer.lead_unlocked:
            return None

        return {"id": obj.customer_id}


# ------------------------------------------------------------
# 🏗️ JOB REQUEST SERIALIZER (MAIN)
# ------------------------------------------------------------

class JobRequestSerializer(serializers.ModelSerializer):
    customer = serializers.SerializerMethodField()
    city_detail = CitySerializer(source="city", read_only=True)
    profession_detail = ProfessionSerializer(source="profession", read_only=True)

    accepted_company = CompanySerializer(read_only=True)
    winner_company = CompanySerializer(read_only=True)

    audit_logs = serializers.SerializerMethodField()
    lead_unlocked = serializers.SerializerMethodField()

    offers_count = serializers.IntegerField(read_only=True)
    offers_left = serializers.SerializerMethodField()
    extra_offers_added = serializers.IntegerField(read_only=True)

    # ✅ Offer-truth fields
    offers = serializers.SerializerMethodField()
    winner_offer = serializers.SerializerMethodField()

    # WRITE
    city = serializers.PrimaryKeyRelatedField(queryset=City.objects.all(), write_only=True)
    profession = serializers.PrimaryKeyRelatedField(queryset=Profession.objects.all(), write_only=True)

    class Meta:
        model = JobRequest
        fields = [
            "id",
            "customer",
            "title",
            "description",
            "budget",

            "city",
            "profession",
            "city_detail",
            "profession_detail",

            "created_at",
            "updated_at",
            "is_active",
            "lead_unlocked",

            "max_offers",
            "offers_count",
            "offers_left",
            "extra_offers_added",
            "last_offer_at",

            "is_reopened",
            "reopened_at",

            "is_completed",
            "accepted_company",
            "accepted_price",

            "expires_at",

            "winner_company",
            "winner_price",
            "winner_offer",

            # ✅ Offer list
            "offers",

            "audit_logs",
        ]
        read_only_fields = ("customer", "created_at", "last_offer_at", "reopened_at", "updated_at")

    # ----------------------------
    # Helpers
    # ----------------------------

    def _get_request_user(self):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        return request.user

    def _get_company(self):
        user = self._get_request_user()
        return getattr(user, "company_profile", None) if user else None

    def _get_company_offer(self, obj):
        company = self._get_company()
        if not company:
            return None
        return obj.offers.filter(company=company).select_related("company", "current_version").first()

    # ----------------------------
    # Fields
    # ----------------------------

    def get_customer(self, obj):
        """
        Customer-data:
        - Customers: ser alltid sin egen data.
        - Companies: bara om lead_unlocked=True för deras offer.
        """
        user = self._get_request_user()
        if not user:
            return None

        role = getattr(user, "role", None)
        if role == "customer":
            return CustomerSerializer(obj.customer).data

        if role == "company":
            offer = self._get_company_offer(obj)
            if not offer or not offer.lead_unlocked:
                return None
            return CustomerSerializer(obj.customer).data

        return None

    def get_lead_unlocked(self, obj):
        offer = self._get_company_offer(obj)
        return bool(offer and offer.lead_unlocked)

    def get_audit_logs(self, obj):
        """
        Audit:
        - Customer: ser alltid.
        - Company: bara om lead_unlocked=True.
        """
        user = self._get_request_user()
        if not user:
            return []

        role = getattr(user, "role", None)
        if role == "customer":
            return JobRequestAuditSerializer(obj.audit_logs.all().order_by("-created_at"), many=True).data

        if role == "company":
            offer = self._get_company_offer(obj)
            if not offer or not offer.lead_unlocked:
                return []
            return JobRequestAuditSerializer(obj.audit_logs.all().order_by("-created_at"), many=True).data

        return []

    def get_offers_left(self, obj):
        company = self._get_company()
        if not company:
            return 0
        return getattr(company, "free_leads_remaining", 0)

    def get_offers(self, obj):
        """
        Offers list:
        - Customer: ser alla offers (med current_version).
        - Company: ser bara sin egen offer.
        """
        user = self._get_request_user()
        if not user:
            return []

        role = getattr(user, "role", None)

        if role == "customer":
            qs = obj.offers.select_related("company", "current_version").order_by("-created_at")
            return OfferPublicSerializer(qs, many=True).data

        if role == "company":
            offer = self._get_company_offer(obj)
            return OfferPublicSerializer([offer], many=True).data if offer else []

        return []

    def get_winner_offer(self, obj):
        """
        Winner offer:
        - Customer: ser alltid winner_offer om den finns.
        - Company: ser bara om lead_unlocked=True (för deras egen offer).
        """
        if not obj.winner_offer_id:
            return None

        user = self._get_request_user()
        if not user:
            return None

        role = getattr(user, "role", None)

        # Customer ser alltid
        if role == "customer":
            offer = obj.winner_offer
            # säkerställ current_version finns i payload
            offer = type(offer).objects.select_related("company", "current_version").get(pk=offer.pk)
            return OfferPublicSerializer(offer).data

        # Company ser bara om de har lead_unlocked
        if role == "company":
            offer = self._get_company_offer(obj)
            if not offer or not offer.lead_unlocked:
                return None
            if offer.id != obj.winner_offer_id:
                return None
            return OfferPublicSerializer(offer).data

        return None


# ------------------------------------------------------------
# 🆕 JOB REQUEST DRAFT SERIALIZER
# ------------------------------------------------------------

class JobRequestDraftSerializer(serializers.ModelSerializer):
    city = serializers.PrimaryKeyRelatedField(queryset=City.objects.all(), required=False, allow_null=True)
    profession = serializers.PrimaryKeyRelatedField(queryset=Profession.objects.all(), required=False, allow_null=True)

    class Meta:
        model = JobRequestDraft
        fields = [
            "id",
            "title",
            "description",
            "budget",
            "city",
            "profession",
            "current_step",
            "is_submitted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_submitted", "created_at", "updated_at"]

    def validate_current_step(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("current_step must be between 1 and 5.")
        return value


class JobRequestUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=False)
    description = serializers.CharField(required=False, allow_blank=True)
    budget = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    profession = serializers.PrimaryKeyRelatedField(
        queryset=Profession.objects.all(),
        required=False
    )

    class Meta:
        model = JobRequest
        fields = ["title", "description", "budget", "profession"]