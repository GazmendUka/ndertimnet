# payments/admin.py

from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "offer",
        "type",
        "amount",
        "currency",
        "status",
        "provider",
        "created_at",
        "paid_at",
    )

    list_filter = (
        "type",
        "status",
        "provider",
    )

    search_fields = (
        "company__company_name",
        "offer__id",
        "provider_reference",
    )

    readonly_fields = (
        "created_at",
        "paid_at",
    )

    ordering = ("-created_at",)
    list_per_page = 25

