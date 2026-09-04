from rest_framework import serializers

from .models import NotificationDevice, NotificationPreference


class DeviceRegistrationSerializer(serializers.Serializer):
    token = serializers.CharField(min_length=20, max_length=512, trim_whitespace=True)
    device_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    platform = serializers.ChoiceField(choices=NotificationDevice.Platform.choices)


class DeviceUnregisterSerializer(serializers.Serializer):
    device_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    token = serializers.CharField(max_length=512, required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("device_id") and not attrs.get("token"):
            raise serializers.ValidationError("device_id or token is required")
        return attrs


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    active_devices = serializers.SerializerMethodField()

    class Meta:
        model = NotificationPreference
        fields = [
            "push_enabled",
            "chat_messages",
            "offer_updates",
            "payment_updates",
            "active_devices",
            "updated_at",
        ]
        read_only_fields = ["active_devices", "updated_at"]

    def get_active_devices(self, obj):
        return obj.user.notification_devices.filter(active=True).count()
