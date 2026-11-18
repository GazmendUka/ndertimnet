"""Explicit account confirmation for the isolated staging database only."""
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def enabled():
    # A copied environment flag must never enable this on the production API.
    # staging_settings separately validates the designated DB and blocks delivery.
    return (settings.SETTINGS_MODULE == "ndertimnet.staging_settings"
            and getattr(settings, "STAGING_ACCOUNT_CONFIRMATION_ENABLED", False) is True)


class ConfirmStagingAccountView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        if not enabled():
            return Response(status=404)
        from .models import User
        user = User.objects.select_for_update().get(pk=request.user.pk)
        if not user.is_active or hasattr(user, "deletion_request"):
            return Response({"detail": "Llogaria nuk mund të konfirmohet."}, status=400)
        if not user.email_verified:
            user.email_verified = True
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email_verified", "email_verified_at"])
        # Never approve a company, reactivate an account or grant quota/payment.
        return Response({"detail": "Llogaria testuese u konfirmua.", "test_account": True})
