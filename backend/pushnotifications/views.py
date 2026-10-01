from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NotificationDevice, NotificationPreference
from .serializers import (
    DeviceRegistrationSerializer,
    DeviceUnregisterSerializer,
    NotificationPreferenceSerializer,
)


class DeviceRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeviceRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        device, created = NotificationDevice.objects.update_or_create(
            token=data["token"],
            defaults={
                "user": request.user,
                "device_id": data.get("device_id", ""),
                "platform": data["platform"],
                "active": True,
            },
        )
        if device.device_id:
            NotificationDevice.objects.filter(
                user=request.user,
                device_id=device.device_id,
                platform=device.platform,
            ).exclude(pk=device.pk).update(active=False)

        preference, _ = NotificationPreference.objects.get_or_create(user=request.user)
        if not preference.push_enabled:
            preference.push_enabled = True
            preference.save(update_fields=["push_enabled", "updated_at"])

        return Response(
            {"registered": True, "platform": device.platform},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DeviceUnregisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeviceUnregisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        filters = Q(user=request.user)
        if data.get("device_id"):
            filters &= Q(device_id=data["device_id"])
        else:
            filters &= Q(token=data["token"])
        updated = NotificationDevice.objects.filter(filters).update(active=False)
        return Response({"unregistered": updated})


class NotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, user):
        preference, _ = NotificationPreference.objects.get_or_create(user=user)
        return preference

    def get(self, request):
        return Response(NotificationPreferenceSerializer(self.get_object(request.user)).data)

    def patch(self, request):
        preference = self.get_object(request.user)
        serializer = NotificationPreferenceSerializer(
            preference,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if not serializer.instance.push_enabled:
            request.user.notification_devices.filter(active=True).update(active=False)
        return Response(serializer.data)
