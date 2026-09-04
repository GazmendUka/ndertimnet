# payments/admin.py

from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "payer_user",
        "offer",
        "type",
        "amount",
        "currency",
        "status",
        "provider",
        "provider_reference",
        "created_at",
        "updated_at",
        "paid_at",
    )

    list_filter = (
        "type",
        "status",
        "provider",
    )

    search_fields = (
        "company__company_name",
        "payer_user__email",
        "offer__id",
        "provider_reference",
    )

    readonly_fields = (
        "provider_reference",
        "provider_session_id",
        "provider_transaction_id",
        "checkout_url",
        "failure_code",
        "created_at",
        "updated_at",
        "paid_at",
    )

    ordering = ("-created_at",)
    list_per_page = 25
