# ------------------------------------------------------------
# backend/leads/serializers.py
# ------------------------------------------------------------

from rest_framework import serializers
from .models import LeadMatch, LeadMessage, ArchivedJob
from accounts.serializers import CompanySerializer, BasicCustomerSerializer


# ------------------------------------------------------------
# 💬  Lead Message Serializer (communication)
# ------------------------------------------------------------

class LeadMessageSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        from payments.services.access import has_offer_access
        from offers.contact_policy import safe_text, redact_company
        data = super().to_representation(instance)
        if not has_offer_access(instance.lead.company, instance.lead.job_request):
            data["sender_customer"] = None
            if data.get("sender_company"):
                data["sender_company"] = redact_company(data["sender_company"])
            data["message"] = safe_text(data["message"])
        return data

    sender_company = CompanySerializer(read_only=True)
    sender_customer = BasicCustomerSerializer(read_only=True)
    class Meta:
        model = LeadMessage
        fields = [
            "id",
            "message",
            "sender_type",
            "sender_company",
            "sender_customer",
            "created_at",
        ]


# ------------------------------------------------------------
# 💼  Lead Match Serializer (offers from companies)
# ------------------------------------------------------------

class LeadMatchSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        from payments.services.access import has_offer_access, has_chat_access
        data = super().to_representation(instance)
        if not has_chat_access(instance.company, instance.job_request):
            data["messages"] = []
        data["can_chat"] = has_chat_access(instance.company, instance.job_request)
        if not has_offer_access(instance.company, instance.job_request):
            from offers.contact_policy import safe_text
            data["message"] = safe_text(data.get("message", ""))
            data["customer_info_unlocked"] = False
            data["customer_info_unlocked_by_company"] = False
        return data

    company = CompanySerializer(read_only=True)
    messages = LeadMessageSerializer(many=True, read_only=True)

    class Meta:
        model = LeadMatch
        fields = [
            "id",
            "job_request",          # write_only ID
            "company",
            "message",
            "price",
            "status",
            "round_number",
            "created_at",

            # 🔥 Ndertimnet v.05 – nya fält
            "can_chat",
            "customer_info_unlocked",
            "customer_info_unlocked_by_company",
            "workflow_status",

            "messages",
        ]
        extra_kwargs = {
            "job_request": {"write_only": True},
            "status": {"read_only": True},
            "round_number": {"read_only": True},
            "can_chat": {"read_only": True},
            "customer_info_unlocked": {"read_only": True},
            "customer_info_unlocked_by_company": {"read_only": True},
            "workflow_status": {"read_only": True},
        }


# ------------------------------------------------------------
# 🗂️  Archived Jobs Serializer
# ------------------------------------------------------------

class ArchivedJobSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = ArchivedJob
        fields = [
            "id",
            "title",
            "description",
            "category",
            "location",
            "date_accepted",
            "price",
            "company",
        ]
