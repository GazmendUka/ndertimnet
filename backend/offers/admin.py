from django.contrib import admin

from .models import OfferReview


@admin.register(OfferReview)
class OfferReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "customer", "rating", "recommended", "moderation_status", "created_at")
    list_filter = ("rating", "recommended", "moderation_status", "created_at")
    search_fields = ("company__company_name", "customer__email", "review_text")
    readonly_fields = ("offer", "company", "customer", "rating", "review_text", "image", "recommended", "created_at")
    list_editable = ("moderation_status",)
