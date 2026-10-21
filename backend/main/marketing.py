"""Company-owned Hero submissions. Public visibility is always moderated."""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator
from django.db import transaction
from django.utils import timezone
from cloudinary.exceptions import Error as CloudinaryError
from rest_framework import generics, permissions, serializers, status, views
from rest_framework.exceptions import APIException
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from uuid import uuid4
from .models import HeroAdvertisement


class IsCampaignCompany(permissions.BasePermission):
    message = "Vetëm kompanitë aktive me email të verifikuar mund të menaxhojnë fushata."

    def has_permission(self, request, view):
        user = request.user
        company = getattr(user, "company_profile", None) if user.is_authenticated else None
        return bool(user.is_authenticated and user.is_active and user.role == "company"
                    and user.email_verified and company and company.is_active)


class CampaignUploadThrottle(UserRateThrottle):
    scope = "marketing_upload"
    rate = "10/day"

    def allow_request(self, request, view):
        return True if request.method != "POST" else super().allow_request(request, view)


class CampaignImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if getattr(data, "size", 0) > 5 * 1024 * 1024:
            raise serializers.ValidationError("Imazhi duhet të jetë jo më i madh se 5 MB.")
        image = super().to_internal_value(data)
        if image.image.format not in {"JPEG", "PNG", "WEBP"}:
            raise serializers.ValidationError("Përdorni JPG, PNG ose WebP.")
        width, height = image.image.size
        if width < 1200 or height < 600 or width <= height or width * height > 20_000_000:
            raise serializers.ValidationError("Përdorni imazh horizontal të paktën 1200 × 600 px, deri në 20 megapikselë.")
        return image


class CampaignSerializer(serializers.ModelSerializer):
    description = serializers.CharField(source="subtitle", min_length=20, max_length=260)
    title = serializers.CharField(min_length=5, max_length=180)
    destination_url = serializers.CharField(source="external_url", max_length=200)
    image = CampaignImageField(source="background_image", write_only=True)
    image_url = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    start_date = serializers.DateTimeField(source="starts_at", read_only=True)
    end_date = serializers.DateTimeField(source="ends_at", read_only=True)
    rejection_reason = serializers.CharField(source="review_note", read_only=True)
    cta_text = serializers.CharField(max_length=40, default="Zbulo më shumë")

    class Meta:
        model = HeroAdvertisement
        fields = ["id", "title", "description", "destination_url", "cta_text", "duration_days",
                  "image", "image_url", "status", "start_date", "end_date", "rejection_reason", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_destination_url(self, value):
        try:
            URLValidator(schemes=["http", "https"])(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Përdorni një link të vlefshëm HTTP ose HTTPS.")
        return value

    def get_image_url(self, obj):
        return self.context["request"].build_absolute_uri(obj.background_image.url) if obj.background_image else ""

    def get_status(self, obj):
        if obj.review_status != "approved":
            return obj.review_status
        now = timezone.now()
        if not obj.is_active:
            return "paused"
        if obj.ends_at and obj.ends_at <= now:
            return "expired"
        if obj.starts_at and obj.starts_at > now:
            return "scheduled"
        return "active"

    def create(self, validated_data):
        return HeroAdvertisement.objects.create(**validated_data,
            company=self.context["request"].user.company_profile,
            review_status="pending", is_active=False, link_type="external",
            slug=f"campaign-{uuid4().hex}")


class CampaignPagination(PageNumberPagination):
    page_size = 12


class CampaignListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCampaignCompany]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = CampaignSerializer
    pagination_class = CampaignPagination
    throttle_classes = [CampaignUploadThrottle]

    def get_queryset(self):
        return HeroAdvertisement.objects.filter(company=self.request.user.company_profile).order_by("-created_at", "-pk")

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                serializer.save()
        except CloudinaryError:
            error = APIException("Imazhi nuk mund të ruhet tani. Ju lutemi provoni përsëri.")
            error.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            raise error


class CampaignWithdrawView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCampaignCompany]

    @transaction.atomic
    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        campaign = get_object_or_404(HeroAdvertisement.objects.select_for_update(),
            pk=pk, company=request.user.company_profile)
        campaign.review_status = "withdrawn"
        campaign.is_active = False
        campaign.save(update_fields=["review_status", "is_active", "updated_at"])
        return Response(CampaignSerializer(campaign, context={"request": request}).data)
