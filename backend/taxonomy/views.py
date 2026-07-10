# backend/taxonomy/views.py

from rest_framework import viewsets, permissions
from django.db.models import Prefetch

from .models import Industry, Profession
from .serializers import IndustrySerializer, ProfessionSerializer


class IndustryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        Industry.objects.filter(is_active=True)
        .prefetch_related(
            Prefetch(
                "professions",
                queryset=Profession.objects.filter(is_active=True).select_related("industry"),
            )
        )
        .order_by("sort_order", "name")
    )
    serializer_class = IndustrySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class ProfessionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        Profession.objects.filter(is_active=True)
        .select_related("industry")
        .order_by("industry__sort_order", "sort_order", "name")
    )
    serializer_class = ProfessionSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
