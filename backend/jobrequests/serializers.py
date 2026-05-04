from rest_framework import serializers
from .models import JobRequest, JobRequestAudit, JobRequestDraft
from accounts.serializers import BasicCustomerSerializer, CompanySerializer

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
    current_version = OfferVersionPublicSerializer(allow_null=True, required=False)


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

    offers = serializers.SerializerMethodField()
    winner_offer = serializers.SerializerMethodField()

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
            "address",
            "postal_code",
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
            "offers",
            "audit_logs",
        ]
        read_only_fields = ("customer", "created_at", "last_offer_at", "reopened_at", "updated_at")

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

    def get_customer(self, obj):
        user = self._get_request_user()
        if not user:
            return None

        role = getattr(user, "role", None)

        if role == "customer":
            return BasicCustomerSerializer(obj.customer).data

        if role == "company":
            offer = self._get_company_offer(obj)
            if not offer or not offer.lead_unlocked:
                return None
            return BasicCustomerSerializer(obj.customer).data

        return None

    def get_lead_unlocked(self, obj):
        offer = self._get_company_offer(obj)
        return bool(offer and offer.lead_unlocked)

    def get_audit_logs(self, obj):
        user = self._get_request_user()
        if not user:
            return []

        role = getattr(user, "role", None)

        if role == "customer":
            return JobRequestAuditSerializer(
                obj.audit_logs.all().order_by("-created_at"), many=True
            ).data

        if role == "company":
            offer = self._get_company_offer(obj)
            if not offer or not offer.lead_unlocked:
                return []
            return JobRequestAuditSerializer(
                obj.audit_logs.all().order_by("-created_at"), many=True
            ).data

        return []

    def get_offers_left(self, obj):
        company = self._get_company()
        if not company:
            return 0
        return getattr(company, "free_leads_remaining", 0)

    def get_offers(self, obj):
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
        if not obj.winner_offer_id:
            return None

        user = self._get_request_user()
        if not user:
            return None

        role = getattr(user, "role", None)

        if role == "customer":
            offer = obj.winner_offer
            offer = type(offer).objects.select_related("company", "current_version").get(pk=offer.pk)
            return OfferPublicSerializer(offer).data

        if role == "company":
            offer = self._get_company_offer(obj)
            if not offer or not offer.lead_unlocked:
                return None
            if offer.id != obj.winner_offer_id:
                return None
            return OfferPublicSerializer(offer).data

        return None

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        if not user:
            raise serializers.ValidationError("User not found")

        customer_profile = getattr(user, "customer_profile", None)
        if not customer_profile:
            raise serializers.ValidationError("Customer profile not found")

        # Autofill
        if not validated_data.get("address"):
            validated_data["address"] = customer_profile.address

        if not validated_data.get("postal_code"):
            validated_data["postal_code"] = customer_profile.postal_code

        if "city" not in validated_data and customer_profile.city:
            validated_data["city"] = customer_profile.city

        # FK till USER (inte profile!)
        validated_data["customer"] = user

        return super().create(validated_data)


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
            "address",
            "postal_code",
        ]
        read_only_fields = ["id", "is_submitted", "created_at", "updated_at"]

        extra_kwargs = {
            "title": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "budget": {"required": False, "allow_null": True},
            "address": {"required": False, "allow_blank": True},
            "postal_code": {"required": False, "allow_blank": True},
            "current_step": {"required": False},
        }

    def validate_current_step(self, value):
        if value < 1 or value > 6:
            raise serializers.ValidationError("current_step must be between 1 and 6.")
        return value

    # 🔥 ADD THIS
    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        if not user:
            raise serializers.ValidationError("User not found")

        validated_data["customer"] = user

        if "current_step" not in validated_data:
            validated_data["current_step"] = 1

        return super().create(validated_data)


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
        required=False,
        allow_null=True
    )

    class Meta:
        model = JobRequest
        fields = ["title", "description", "budget", "profession"]