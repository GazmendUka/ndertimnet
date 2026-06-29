from rest_framework import serializers

from .models import PlatformUpdate


class PlatformUpdateSerializer(serializers.ModelSerializer):
    detail_url = serializers.SerializerMethodField()

    class Meta:
        model = PlatformUpdate
        fields = [
            "id",
            "title",
            "date_label",
            "status",
            "is_new",
            "is_clickable",
            "slug",
            "summary",
            "detail_url",
            "display_order",
            "updated_at",
        ]

    def get_detail_url(self, obj):
        if not obj.is_clickable or not obj.slug:
            return None

        return f"/updates/{obj.slug}"


class PlatformUpdateDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformUpdate
        fields = [
            "id",
            "title",
            "date_label",
            "status",
            "is_new",
            "is_clickable",
            "slug",
            "summary",
            "body",
            "updated_at",
        ]
