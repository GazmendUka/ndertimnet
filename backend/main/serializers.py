from rest_framework import serializers

from .models import HeroAdvertisement, HeroAdvertisementSection, PlatformUpdate


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

        return f"/perditesime/{obj.slug}"


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


class HeroAdvertisementSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroAdvertisementSection
        fields = [
            "id",
            "title",
            "body",
            "display_order",
        ]


class HeroAdvertisementSerializer(serializers.ModelSerializer):
    background_image_url = serializers.SerializerMethodField()
    target_url = serializers.SerializerMethodField()

    class Meta:
        model = HeroAdvertisement
        fields = [
            "id",
            "title",
            "subtitle",
            "slug",
            "background_image_url",
            "link_type",
            "external_url",
            "target_url",
        ]

    def get_background_image_url(self, obj):
        if not obj.background_image:
            return ""

        request = self.context.get("request")
        url = obj.background_image.url

        if request:
            return request.build_absolute_uri(url)

        return url

    def get_target_url(self, obj):
        return obj.target_url


class HeroAdvertisementDetailSerializer(HeroAdvertisementSerializer):
    sections = HeroAdvertisementSectionSerializer(many=True, read_only=True)

    class Meta(HeroAdvertisementSerializer.Meta):
        fields = HeroAdvertisementSerializer.Meta.fields + [
            "sections",
            "updated_at",
        ]
