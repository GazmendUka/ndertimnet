from rest_framework import serializers

from payments.models import (
    Payment,
    PaymentStatus,
)


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
    provider_display = serializers.CharField(source="get_provider_display", read_only=True)
    receipt_number = serializers.CharField(read_only=True)
    job_request = serializers.IntegerField(source="offer.job_request_id", read_only=True)
    job_title = serializers.CharField(source="offer.job_request.title", read_only=True)
    can_retry = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "receipt_number",
            "offer",
            "job_request",
            "job_title",
            "type",
            "type_display",
            "amount",
            "currency",
            "status",
            "status_display",
            "provider",
            "provider_display",
            "can_retry",
            "created_at",
            "updated_at",
            "paid_at",
        ]
        read_only_fields = fields

    def get_can_retry(self, obj):
        return obj.status in {PaymentStatus.FAILED, PaymentStatus.CANCELED}
