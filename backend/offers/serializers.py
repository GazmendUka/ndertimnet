# backend/offers/serializers.py 

from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from jobrequests.serializers import JobRequestSerializer
from jobrequests.models import JobRequest
from payments.models import LeadAccess
from accounts.permissions_company_steps import IsCompanyStep2


from .models import (
    Offer,
    OfferVersion,
    OfferSignature,
    OfferChatUnlock,
    OfferStatus,
    UnlockType,
)
from accounts.models import Company


class OfferVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferVersion
        fields = [
            "id",
            "version_number",
            "presentation_text",
            "can_start_from",
            "duration_text",
            "price_type",
            "price_amount",
            "currency",
            "includes_text",
            "excludes_text",
            "payment_terms",
            "is_signed",
            "signed_at",
            "created_at",
        ]
        read_only_fields = ["id", "version_number", "is_signed", "signed_at", "created_at"]


class OfferSerializer(serializers.ModelSerializer):
    current_version = OfferVersionSerializer(read_only=True)
    job_request = JobRequestSerializer(read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id",
            "company",
            "job_request",
            "status",
            "current_version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]


# ======================================================
# CREATE OFFER + FIRST VERSION
# ======================================================

class OfferCreateSerializer(serializers.Serializer):
    job_request = serializers.IntegerField()

    presentation_text = serializers.CharField(required=False, allow_blank=True)
    can_start_from = serializers.DateField(required=False)
    duration_text = serializers.CharField(required=False, allow_blank=True)

    price_type = serializers.CharField(required=False)
    price_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    currency = serializers.CharField(required=False)

    includes_text = serializers.CharField(required=False, allow_blank=True)
    excludes_text = serializers.CharField(required=False, allow_blank=True)
    payment_terms = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user

        # 1️⃣ Endast företag
        if user.role != "company":
            raise serializers.ValidationError(
                "Only companies can create offers."
            )

        company = user.company_profile
        job_request_id = validated_data["job_request"]

        # 2️⃣ JobRequest måste finnas
        try:
            job_request = JobRequest.objects.get(id=job_request_id)
        except JobRequest.DoesNotExist:
            raise serializers.ValidationError(
                "Invalid job request."
            )

        # 3️⃣ Lead måste vara upplåst
        if not LeadAccess.objects.filter(
            company=company,
            job_request=job_request
        ).exists():
            raise serializers.ValidationError(
                "Lead must be unlocked before creating an offer."
            )

        # 4️⃣ Företagsprofil måste vara komplett (Step 2)
        if not IsCompanyStep2().has_permission(request, None):
            raise serializers.ValidationError(
                "Complete company profile before creating an offer."
            )

        # 5️⃣ Endast EN offert per jobb
        if Offer.objects.filter(
            company=company,
            job_request=job_request
        ).exists():
            raise serializers.ValidationError(
                "Offer already exists for this job request."
            )

        # 6️⃣ Skapa offer + version (din befintliga logik)
        with transaction.atomic():
            offer = Offer.objects.create(
                company=company,
                job_request=job_request,
                status=OfferStatus.DRAFT,
            )

            version = OfferVersion.objects.create(
                offer=offer,
                version_number=1,
                created_by=user,

                presentation_text=validated_data.get("presentation_text", ""),
                can_start_from=validated_data.get("can_start_from"),
                duration_text=validated_data.get("duration_text", ""),

                price_type=validated_data.get("price_type", "fixed"),
                price_amount=validated_data.get("price_amount"),
                currency=validated_data.get("currency", "EUR"),

                includes_text=validated_data.get("includes_text", ""),
                excludes_text=validated_data.get("excludes_text", ""),
                payment_terms=validated_data.get("payment_terms", ""),
            )

            offer.current_version = version
            offer.save(update_fields=["current_version"])

            # Spara default-presentation
            if version.presentation_text:
                company.default_offer_presentation = version.presentation_text
                company.save(update_fields=["default_offer_presentation"])

        return offer



# ======================================================
# UPDATE (NEW VERSION)
# ======================================================

class OfferUpdateSerializer(serializers.Serializer):
    presentation_text = serializers.CharField(required=False, allow_blank=True)
    can_start_from = serializers.DateField(required=False)
    duration_text = serializers.CharField(required=False, allow_blank=True)

    price_type = serializers.CharField(required=False)
    price_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    currency = serializers.CharField(required=False)

    includes_text = serializers.CharField(required=False, allow_blank=True)
    excludes_text = serializers.CharField(required=False, allow_blank=True)
    payment_terms = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        user = self.context["request"].user

        if instance.is_locked():
            raise serializers.ValidationError("Offer is locked and cannot be edited.")

        last_version = instance.current_version
        new_version_number = last_version.version_number + 1

        with transaction.atomic():
            new_version = OfferVersion.objects.create(
                offer=instance,
                version_number=new_version_number,
                created_by=user,

                presentation_text=validated_data.get("presentation_text", last_version.presentation_text),
                can_start_from=validated_data.get("can_start_from", last_version.can_start_from),
                duration_text=validated_data.get("duration_text", last_version.duration_text),

                price_type=validated_data.get("price_type", last_version.price_type),
                price_amount=validated_data.get("price_amount", last_version.price_amount),
                currency=validated_data.get("currency", last_version.currency),

                includes_text=validated_data.get("includes_text", last_version.includes_text),
                excludes_text=validated_data.get("excludes_text", last_version.excludes_text),
                payment_terms=validated_data.get("payment_terms", last_version.payment_terms),
            )

            # Om tidigare version var signerad → kräver ny sign
            new_version.is_signed = False
            new_version.save()

            instance.current_version = new_version
            instance.status = OfferStatus.DRAFT
            instance.save(update_fields=["current_version", "status"])

            # Uppdatera standardpresentation
            if new_version.presentation_text:
                company = instance.company
                company.default_offer_presentation = new_version.presentation_text
                company.save(update_fields=["default_offer_presentation"])

        return instance


# ======================================================
# SIGN
# ======================================================

class OfferSignSerializer(serializers.Serializer):
    personal_number = serializers.CharField()

    def create(self, validated_data):
        offer = self.context["offer"]
        version = offer.current_version
        user = self.context["request"].user

        if version.is_signed:
            raise serializers.ValidationError("This version is already signed.")

        pn = validated_data["personal_number"]

        signature = OfferSignature.objects.create(
            offer_version=version,
            signed_by=user,
            personnummer_hash=OfferSignature.hash_personnummer(pn),
            personnummer_masked=OfferSignature.mask_personnummer(pn),
            ip_address=self.context["request"].META.get("REMOTE_ADDR"),
        )

        version.is_signed = True
        version.signed_at = timezone.now()
        version.save(update_fields=["is_signed", "signed_at"])

        offer.status = OfferStatus.SIGNED
        offer.save(update_fields=["status"])

        return signature


# ======================================================
# ACCEPT / REJECT
# ======================================================

class OfferDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["accept", "reject"])

    def save(self, **kwargs):
        offer = self.context["offer"]
        decision = self.validated_data["decision"]

        if not offer.current_version.is_signed:
            raise serializers.ValidationError("Offer must be signed before decision.")

        if decision == "accept":
            offer.status = OfferStatus.ACCEPTED
            offer.accepted_at = timezone.now()

            # Auto unlock chat (gratis)
            OfferChatUnlock.objects.get_or_create(
                offer=offer,
                unlock_type=UnlockType.AFTER_ACCEPT,
                defaults={
                    "amount": 0,
                    "currency": "EUR",
                    "created_by": self.context["request"].user,
                },
            )

        else:
            offer.status = OfferStatus.REJECTED
            offer.rejected_at = timezone.now()

        offer.save()
        return offer


# ======================================================
# EARLY CHAT UNLOCK (5€)
# ======================================================

class OfferEarlyChatUnlockSerializer(serializers.Serializer):
    def create(self, validated_data):
        offer = self.context["offer"]
        user = self.context["request"].user

        if offer.status == OfferStatus.ACCEPTED:
            raise serializers.ValidationError("Chat is already free after accept.")

        unlock, created = OfferChatUnlock.objects.get_or_create(
            offer=offer,
            unlock_type=UnlockType.EARLY,
            defaults={
                "amount": 5,
                "currency": "EUR",
                "created_by": user,
            },
        )

        if not created:
            raise serializers.ValidationError("Chat already unlocked.")

        # TODO: koppla payment senare

        return unlock
