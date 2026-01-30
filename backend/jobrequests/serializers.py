# backend/jobrequests/serializers.py

from rest_framework import serializers
from .models import JobRequest, JobRequestAudit, JobRequestDraft
from accounts.serializers import CustomerSerializer, CompanySerializer

from locations.serializers import CitySerializer
from taxonomy.serializers import ProfessionSerializer
from locations.models import City
from taxonomy.models import Profession
from payments.models import LeadAccess

# ------------------------------------------------------------
# 🔎 AUDIT LOG SERIALIZER
# ------------------------------------------------------------
class JobRequestAuditSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = JobRequestAudit
        fields = [
            "id",
            "action",
            "message",
            "company",
            "created_at",
        ]

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
            "customer",   # endast signal (null / ej null)
            "has_offer",  # 🔑 DENNA BOOL
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
        """
        Endast signal för frontend (lead upplåst eller ej).
        Ingen kunddata exponeras.
        """
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

    # 🔹 READ
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

    winner_offer = serializers.SerializerMethodField()
    matches = serializers.SerializerMethodField()

    # 🔹 WRITE
    city = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(),
        write_only=True
    )
    profession = serializers.PrimaryKeyRelatedField(
        queryset=Profession.objects.all(),
        write_only=True
    )

    class Meta:
        model = JobRequest
        fields = [
            # basics
            "id",
            "customer",
            "title",
            "description",
            "budget",

            # location & profession
            "city",
            "profession",
            "city_detail",
            "profession_detail",

            # status
            "created_at",
            "is_active",
            "lead_unlocked",

            # offer cycle
            "max_offers",
            "offers_count",
            "offers_left",
            "extra_offers_added",
            "last_offer_at",

            # reopening
            "is_reopened",
            "reopened_at",

            # accepted
            "is_completed",
            "accepted_company",
            "accepted_price",

            # expiration
            "expires_at",

            # winner
            "winner_company",
            "winner_price",
            "winner_offer",

            # relations
            "matches",
            "audit_logs",
        ]

        read_only_fields = (
            "customer",
            "created_at",
            "last_offer_at",
            "reopened_at",
        )

    # ------------------------------------------------------------
    # METHODS
    # ------------------------------------------------------------
    def get_matches(self, obj):
        offer = self._get_company_offer(obj)
        if not offer or not offer.lead_unlocked:
            return []

        from leads.serializers import LeadMatchSerializer
        return LeadMatchSerializer(
            obj.matches.all().select_related("company", "job_request"),
            many=True
        ).data


    def get_winner_offer(self, obj):
        offer = self._get_company_offer(obj)
        if not offer or not offer.lead_unlocked:
            return None

        if not obj.winner_offer_id:
            return None

        from leads.serializers import LeadMatchSerializer
        return LeadMatchSerializer(obj.winner_offer).data

    
    def _get_company_offer(self, obj):
        """
        Return the offer for this job_request and current company (if any).
        """
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        company = getattr(request.user, "company_profile", None)
        if not company:
            return None

        return obj.offers.filter(company=company).first()
    
    def get_customer(self, obj):
        offer = self._get_company_offer(obj)
        if not offer or not offer.lead_unlocked:
            return None
        return CustomerSerializer(obj.customer).data
    
    def get_audit_logs(self, obj):
        offer = self._get_company_offer(obj)
        if not offer or not offer.lead_unlocked:
            return []

        return JobRequestAuditSerializer(obj.audit_logs.all(), many=True).data

    def get_lead_unlocked(self, obj):
        request = self.context.get("request")
        if not request:
            return False

        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        company = getattr(user, "company_profile", None)
        if not company:
            return False

        return LeadAccess.objects.filter(
            company=company,
            job_request=obj,
        ).exists()
    
    def get_offers_left(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0

        company = getattr(request.user, "company_profile", None)
        if not company:
            return 0

        return company.free_leads_remaining


# ------------------------------------------------------------
# 🆕 JOB REQUEST DRAFT SERIALIZER – används av multi-step form
# ------------------------------------------------------------

class JobRequestDraftSerializer(serializers.ModelSerializer):

    city = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(),
        required=False,
        allow_null=True
    )

    profession = serializers.PrimaryKeyRelatedField(
        queryset=Profession.objects.all(),
        required=False,
        allow_null=True
    )

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
        read_only_fields = [
            "id",
            "is_submitted",
            "created_at",
            "updated_at",
        ]

    # ------------------------------------------------------------
    # VALIDATION
    # ------------------------------------------------------------

    def validate_current_step(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "current_step must be between 1 and 5."
            )
        return value
