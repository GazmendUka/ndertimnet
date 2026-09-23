# backend/offers/serializers.py 

from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from accounts.serializers import CompanySerializer
from jobrequests.serializers import JobRequestSerializer
from jobrequests.models import JobRequest
from payments.models import LeadAccess
from accounts.permissions_company_steps import IsCompanyStep2


from .models import (
    Offer,
    OfferVersion,
    OfferSignature,
    OfferChatUnlock,
    OfferMessage,
    OfferReview,
    OfferStatus,
    UnlockType,
)
from .services import OfferAcceptanceError, accept_offer



class OfferVersionSerializer(serializers.ModelSerializer):
    estimated_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    def validate_estimated_hours(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Orët duhet të jenë më shumë se zero.")
        return value

    def to_representation(self, instance):
        from offers.contact_policy import safe_text
        data = super().to_representation(instance)
        request = self.context.get("request")
        own = bool(request and request.user.pk == instance.offer.company.user_id)
        if not own and not instance.offer.can_view_lead_details():
            for field in ("presentation_text", "duration_text", "includes_text", "excludes_text", "payment_terms"):
                data[field] = safe_text(data.get(field, ""))
        return data

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
            "estimated_hours",
            "estimated_total",
            "currency",
            "includes_text",
            "excludes_text",
            "payment_terms",
            "is_signed",
            "signed_at",
            "customer_accepted_at", "customer_rejected_at",
            "created_at",
        ]
        read_only_fields = ["id", "version_number", "is_signed", "signed_at", "created_at", "customer_accepted_at", "customer_rejected_at"]


class OfferSerializer(serializers.ModelSerializer):
    accepted_version = OfferVersionSerializer(read_only=True)
    pending_amendment = serializers.SerializerMethodField()

    def get_pending_amendment(self, obj):
        v = obj.customer_version()
        return bool(obj.accepted_version_id and v and v.pk != obj.accepted_version_id)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.user.role == "customer":
            version = instance.customer_version()
            data["current_version"] = OfferVersionSerializer(version, context=self.context).data if version else None
        return data

    company = CompanySerializer(read_only=True)   # ⭐ FIX
    current_version = OfferVersionSerializer(read_only=True)
    job_request = JobRequestSerializer(read_only=True)
    review = serializers.SerializerMethodField()
    chat_locked = serializers.SerializerMethodField()
    chat_available = serializers.BooleanField(source="can_chat", read_only=True)
    contact_details_available = serializers.BooleanField(source="can_view_lead_details", read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id",
            "company",
            "job_request",
            "status",
            "current_version",
            "accepted_version", "pending_amendment",
            "created_at",
            "updated_at",
            "review",
            "chat_locked",
            "chat_available",
            "contact_details_available",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def get_review(self, obj):
        try:
            review = obj.review
        except OfferReview.DoesNotExist:
            return None
        return OfferReviewSerializer(review, context=self.context).data

    def get_chat_locked(self, obj):
        return not obj.can_chat() or OfferReview.objects.filter(offer=obj).exists()


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
    estimated_hours = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True, min_value=Decimal("0.01"))
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
            job_request = JobRequest.objects.get(
                id=job_request_id,
                is_active=True,
                moderation_status=JobRequest.MODERATION_APPROVED,
            )
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

                presentation_text=(
                    validated_data.get("presentation_text")
                    or company.default_offer_presentation
                    or ""
                ),
                can_start_from=validated_data.get("can_start_from"),
                duration_text=validated_data.get("duration_text", ""),

                price_type=validated_data.get("price_type", "fixed"),
                price_amount=validated_data.get("price_amount"),
                estimated_hours=validated_data.get("estimated_hours"),
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
    estimated_hours = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True, min_value=Decimal("0.01"))
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
                estimated_hours=validated_data.get("estimated_hours", last_version.estimated_hours),
                currency=validated_data.get("currency", last_version.currency),

                includes_text=validated_data.get("includes_text", last_version.includes_text),
                excludes_text=validated_data.get("excludes_text", last_version.excludes_text),
                payment_terms=validated_data.get("payment_terms", last_version.payment_terms),
            )

            # Om tidigare version var signerad → kräver ny sign
            new_version.is_signed = False
            new_version.save()

            instance.current_version = new_version
            if instance.status != OfferStatus.ACCEPTED:
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

        if offer.status != OfferStatus.ACCEPTED:
            offer.status = OfferStatus.SIGNED
        offer.save(update_fields=["status"])

        return signature


# ======================================================
# ACCEPT / REJECT
# ======================================================

class OfferDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["accept", "reject"])
    version_id = serializers.IntegerField(required=False)

    def save(self, **kwargs):
        from .services import decide_version
        offer = self.context["offer"]
        version_id = self.validated_data.get("version_id")
        if offer.status == OfferStatus.ACCEPTED and version_id is None and offer.current_version_id != offer.accepted_version_id:
            raise serializers.ValidationError("Zgjidhni versionin që po miratoni ose refuzoni.")
        # Existing clients may decide an initial offer. Pin the version read for this request.
        version_id = version_id or offer.current_version_id
        try:
            return decide_version(offer_id=offer.pk, customer=self.context["request"].user,
                                  version_id=version_id, decision=self.validated_data["decision"])
        except OfferAcceptanceError as exc:
            raise serializers.ValidationError(str(exc)) from exc


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

# ======================================================
# CHAT MESSAGE SERIALIZER
# ======================================================

class OfferReviewSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.company_name", read_only=True)
    customer_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = OfferReview
        fields = [
            "id",
            "rating",
            "review_text",
            "image",
            "image_url",
            "recommended",
            "moderation_status",
            "company_name",
            "customer_name",
            "created_at",
        ]
        read_only_fields = ["id", "image_url", "moderation_status", "company_name", "customer_name", "created_at"]
        extra_kwargs = {
            "image": {"write_only": True, "required": False, "allow_null": True},
        }

    def get_customer_name(self, obj):
        first_name = (obj.customer.first_name or "").strip()
        last_name = (obj.customer.last_name or "").strip()
        if first_name and last_name:
            return f"{first_name} {last_name[0].upper()}."
        return first_name or "Klient i verifikuar"

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url

    def validate_image(self, image):
        if not image:
            return image
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image must be 5 MB or smaller.")
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if getattr(image, "content_type", None) not in allowed_types:
            raise serializers.ValidationError("Only JPEG, PNG and WebP images are allowed.")
        return image

    def validate_review_text(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("Review must contain at least 10 characters.")
        return value


class OfferMessageSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        from .contact_policy import safe_text
        data = super().to_representation(instance)
        if not instance.offer.can_view_lead_details():
            data["message"] = safe_text(data["message"])
            data["sender_name"] = safe_text(data["sender_name"])
        return data

    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = OfferMessage
        fields = [
            "id",
            "client_message_id",
            "sender_type",
            "sender_name",
            "message",
            "created_at",
            "read_at",
        ]
        read_only_fields = fields

    def get_sender_name(self, obj):

        if obj.sender_type == "company" and obj.sender_company:
            return obj.sender_company.company_name

        if obj.sender_type == "customer" and obj.sender_customer:
            user = obj.sender_customer.user
            return f"{user.first_name} {user.last_name}".strip() or "Klienti"

        return "Unknown"
