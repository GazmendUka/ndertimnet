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


def visible_hero_advertisements():
    now = timezone.now()
    return (HeroAdvertisement.objects.select_related("company")
        .filter(is_active=True, review_status="approved")
        .filter(Q(company__isnull=True) | Q(company__is_active=True, company__user__is_active=True))
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now)))


class ActiveHeroAdvertisementView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Preserve admin priority; rotate equally ranked approved campaigns.
        eligible = visible_hero_advertisements()
        first = eligible.order_by("display_order", "pk").first()
        advertisement = (eligible.filter(display_order=first.display_order).order_by("?").first()
                         if first else None)

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
        advertisement = get_object_or_404(
            visible_hero_advertisements().prefetch_related("sections"), slug=slug)

        serialized = HeroAdvertisementDetailSerializer(
            advertisement,
            context={"request": request},
        )

        return Response(serialized.data)
