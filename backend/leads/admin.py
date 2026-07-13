# backend/leads/admin.py 

from django.contrib import admin
from .models import LeadMatch, ArchivedJob


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
