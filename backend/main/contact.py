"""Public contact form; sends only to the server-configured support inbox."""
import logging

from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.db import DatabaseError
from rest_framework import permissions, serializers, views
from rest_framework.exceptions import Throttled
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from .contact_limits import reserve_contact_attempt

logger = logging.getLogger(__name__)


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField(max_length=254)
    message = serializers.CharField(min_length=10, max_length=5000)

    def validate_name(self, value):
        if any(ord(char) < 32 for char in value):
            raise serializers.ValidationError("Emri nuk është i vlefshëm.")
        return value


class ContactView(views.APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = []

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            wait = reserve_contact_attempt(data["email"])
        except DatabaseError:
            # Fail closed: no outgoing mail if the shared quota cannot be checked.
            logger.warning("Contact submission protection unavailable")
            return Response({"detail": "Ju lutem provoni përsëri më vonë."}, status=503)
        if wait is not None:
            raise Throttled(wait=wait, detail="Ju lutem provoni përsëri më vonë.")
        try:
            connection = get_connection(backend=settings.CONTACT_EMAIL_BACKEND)
            sent = EmailMessage(
                subject="Ndertimnet – Mesazh nga formulari i kontaktit",
                body=f"Emri: {data['name']}\nEmail: {data['email']}\n\n{data['message']}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[settings.CONTACT_RECIPIENT_EMAIL],
                reply_to=[data["email"]],
                connection=connection,
            ).send(fail_silently=False)
            if sent != 1:
                raise RuntimeError("Contact transport did not accept the message")
        except Exception:
            # Provider errors may contain submitted content or credentials: never log them.
            logger.warning("Contact message delivery could not be confirmed")
            return Response(
                {"detail": "Dërgimi nuk mund të konfirmohej. Ju lutem provoni përsëri më vonë."},
                status=503,
            )
        return Response({"accepted": True}, status=200)
