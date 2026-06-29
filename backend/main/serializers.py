from rest_framework import serializers

from .models import PlatformUpdate


class PlatformUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformUpdate
        fields = [
            "id",
            "title",
            "date_label",
            "status",
            "is_new",
            "display_order",
            "updated_at",
        ]
