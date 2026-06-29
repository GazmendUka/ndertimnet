from rest_framework import permissions, views
from rest_framework.response import Response

from .models import PlatformUpdate
from .serializers import PlatformUpdateSerializer


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
