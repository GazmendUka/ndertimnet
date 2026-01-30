from rest_framework import serializers

from payments.models import (
    Payment,
    PaymentType,
    PaymentStatus,
)
from offers.models import Offer


# ======================================================
# PAYMENT SERIALIZER (READ)
# ======================================================

class PaymentSerializer(serializers.ModelSerializer):
    """
    Read-only serializer.
    Used for:
    - Payment history
    - Responses after creating a payment
    """

    type_display = serializers.CharField(source="get_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "offer",
            "type",
            "type_display",
            "amount",
            "currency",
            "status",
            "status_display",
            "provider",
            "created_at",
            "paid_at",
        ]
        read_only_fields = fields
