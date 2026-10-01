from io import BytesIO
from uuid import uuid4

from PIL import Image, ImageOps
from django.core.files.base import ContentFile
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from .models import Company, PortfolioProject, AccountFileErasure
from .services.deletion import erase_file


class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioProject
        fields = ["id", "title", "description", "scope", "image", "approved", "created_at"]
        read_only_fields = ["id", "approved", "created_at"]

    def validate_image(self, upload):
        if upload.size > 5 * 1024 * 1024:
            raise ValidationError("Maksimumi 5 MB.")
        try:
            image = Image.open(upload)
            if image.format not in ("JPEG", "PNG", "WEBP") or image.width * image.height > 20000000:
                raise ValueError()
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((1800, 1800))
            output = BytesIO()
            image.save(output, "JPEG", quality=85)
        except Exception:
            raise ValidationError("Zgjidhni një fotografi JPG, PNG ose WebP të vlefshme.")
        return ContentFile(output.getvalue(), name=f"{uuid4().hex}.jpg")


class PortfolioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PortfolioSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        return PortfolioProject.objects.filter(company__user=self.request.user)

    def perform_create(self, serializer):
        with transaction.atomic():
            company = Company.objects.select_for_update().filter(user=self.request.user, is_active=True).first()
            if not company or not self.request.user.email_verified:
                raise PermissionDenied("Kërkohet një kompani aktive me email të verifikuar.")
            if company.portfolio_projects.count() >= 12:
                raise ValidationError("Mund të shtoni deri në 12 projekte.")
            serializer.save(company=company)

    def perform_destroy(self, instance):
        name = instance.image.name
        with transaction.atomic():
            task = AccountFileErasure.objects.create(name=name)
            instance.delete()
            transaction.on_commit(lambda: erase_file(task.pk), robust=True)
