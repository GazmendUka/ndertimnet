# backend/leads/admin.py 

from django.contrib import admin
from .models import JobRequest, LeadMatch, ArchivedJob


@admin.register(JobRequest)
class JobRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "customer",
        "city",
        "profession",
        "budget",
        "max_offers",
        "is_reopened",
        "is_completed",
    )
    list_filter = (
        "is_active", 
        "is_reopened", 
        "is_completed"
        )
    search_fields = (
        "title",
        "description",
        "city__name",
        "profession__name",
        "customer__user__email",
    )
    ordering = ("-created_at",)

    fieldsets = (
        ("🧱 Informacione të Punës", {
            "fields": (
                "customer",
                "title",
                "description",
                "city",
                "profession",
                "budget",
            )
        }),
        ("💰 Ofertat", {
            "fields": (
                "max_offers",
                "last_offer_at",
                "is_reopened",
                "reopened_at",
                "is_completed",
                "accepted_company",
                "accepted_price",
            )
        }),
        ("📅 Data dhe Statusi", {
            "fields": ("created_at", "expires_at", "is_active")
        }),
    )

    readonly_fields = ("created_at", "last_offer_at", "reopened_at")


@admin.register(LeadMatch)
class LeadMatchAdmin(admin.ModelAdmin):
    list_display = ("id", "job_request", "company", "created_at")
    search_fields = ("job_request__title", "company__company_name")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)

    fieldsets = (
        ("🔗 Lidhja midis kompanisë dhe punës", {
            "fields": ("job_request", "company", "message")
        }),
        ("📅 Data", {
            "fields": ("created_at",)
        }),
    )


@admin.register(ArchivedJob)
class ArchivedJobAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "location", "price", "date_accepted", "company")
    search_fields = ("title", "location", "company__company_name")
    ordering = ("-date_accepted",)
    readonly_fields = ("date_accepted",)

    fieldsets = (
        ("📦 Punë e Arkivuar", {
            "fields": ("title", "description", "category", "location", "size", "price", "company")
        }),
        ("📅 Data e Pranimit", {
            "fields": ("date_accepted",)
        }),
    )
