from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, views
from rest_framework.response import Response

from .models import HeroAdvertisement, PlatformUpdate
from .serializers import (
    HeroAdvertisementDetailSerializer,
    HeroAdvertisementSerializer,
    PlatformUpdateDetailSerializer,
    PlatformUpdateSerializer,
)


class PlatformUpdateListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        updates = PlatformUpdate.objects.filter(is_published=True).order_by(
            "display_order",
            "-created_at",
        )
        serialized = PlatformUpdateSerializer(updates, many=True).data

        grouped = {
            "in_progress": [],
            "planned": [],
            "done": [],
        }

        for update in serialized:
            grouped[update["status"]].append(update)

        return Response(grouped)


class PlatformUpdateDetailView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        update = get_object_or_404(
            PlatformUpdate,
            slug=slug,
            is_clickable=True,
            is_published=True,
        )
        serialized = PlatformUpdateDetailSerializer(update)

        return Response(serialized.data)


class ActiveHeroAdvertisementView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now()
        advertisement = (
            HeroAdvertisement.objects
            .filter(is_active=True)
            .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
            .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
            .order_by("display_order", "-created_at")
            .first()
        )

        if not advertisement:
            return Response(None)

        serialized = HeroAdvertisementSerializer(
            advertisement,
            context={"request": request},
        )

        return Response(serialized.data)


class HeroAdvertisementDetailView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        now = timezone.now()
        advertisement = get_object_or_404(
            HeroAdvertisement.objects.prefetch_related("sections"),
            slug=slug,
            is_active=True,
        )

        if advertisement.starts_at and advertisement.starts_at > now:
            return Response({"detail": "Reklama nuk është publikuar ende."}, status=404)

        if advertisement.ends_at and advertisement.ends_at < now:
            return Response({"detail": "Reklama nuk është më aktive."}, status=404)

        serialized = HeroAdvertisementDetailSerializer(
            advertisement,
            context={"request": request},
        )

        return Response(serialized.data)
