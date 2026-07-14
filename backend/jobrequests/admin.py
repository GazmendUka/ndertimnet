from django.contrib import admin, messages
from django.db import transaction

from .emails import send_job_moderation_email
from .models import JobRequest, JobRequestModerationEvent
from offers.models import Offer


class JobRequestModerationEventInline(admin.TabularInline):
    model = JobRequestModerationEvent
    extra = 0
    can_delete = False
    readonly_fields = ("status", "note", "moderator", "created_at")

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class OfferInline(admin.TabularInline):
    model = Offer
    extra = 0
    can_delete = True
    fields = (
        "id",
        "company",
        "status",
        "round_number",
        "lead_unlocked",
        "current_version",
        "accepted_at",
        "rejected_at",
        "created_at",
    )
    readonly_fields = fields
    show_change_link = True
    verbose_name = "Ofertë"
    verbose_name_plural = "Ofertat"

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(JobRequest)
class JobRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "customer", "city", "moderation_status",
        "is_active", "submitted_at", "published_at",
    )
    list_filter = ("moderation_status", "is_active", "city", "submitted_at")
    ordering = ("-submitted_at", "-created_at")
    search_fields = ("title", "description", "customer__email")
    readonly_fields = (
        "customer", "submitted_at", "moderation_updated_at", "published_at",
        "created_at", "updated_at", "last_offer_at", "reopened_at", "deleted_at",
    )
    fieldsets = (
        ("Jobb", {"fields": (
            "customer", "title", "description", "city", "profession", "budget",
            "address", "postal_code",
        )}),
        ("Granskning", {"fields": (
            "moderation_status", "moderation_note", "submitted_at",
            "moderation_updated_at", "published_at",
        )}),
        ("Offerter och vinnare", {"fields": (
            "max_offers", "last_offer_at", "is_reopened", "reopened_at",
            "is_completed", "winner_company", "winner_price", "winner_offer",
        )}),
        ("Livscykel", {"fields": (
            "status", "is_active", "expires_at", "is_deleted", "deleted_at",
            "created_at", "updated_at",
        )}),
    )
    inlines = (OfferInline, JobRequestModerationEventInline)
    actions = ("approve_jobs", "request_changes", "reject_jobs", "block_jobs")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("customer", "city", "profession")

    def _moderate(self, request, queryset, status_value, default_note):
        updated = 0
        for job in queryset:
            with transaction.atomic():
                locked_job = JobRequest.objects.select_for_update().get(pk=job.pk)
                locked_job.apply_moderation(
                    status_value,
                    moderator=request.user,
                    note=default_note,
                )
                transaction.on_commit(lambda job=locked_job: self._send_email_safely(job))
                updated += 1
        self.message_user(request, f"{updated} jobb uppdaterades.", messages.SUCCESS)

    @staticmethod
    def _send_email_safely(job):
        try:
            send_job_moderation_email(job)
        except Exception:
            # Moderation must succeed even if the email provider is unavailable.
            pass

    @admin.action(description="Godkänn och publicera valda jobb")
    def approve_jobs(self, request, queryset):
        self._moderate(request, queryset, JobRequest.MODERATION_APPROVED, "Kërkesa u miratua.")

    @admin.action(description="Begär ändringar för valda jobb")
    def request_changes(self, request, queryset):
        self._moderate(request, queryset, JobRequest.MODERATION_CHANGES_REQUESTED, "Ju lutemi përditësoni kërkesën dhe dërgojeni përsëri.")

    @admin.action(description="Avslå valda jobb")
    def reject_jobs(self, request, queryset):
        self._moderate(request, queryset, JobRequest.MODERATION_REJECTED, "Kërkesa nuk plotëson kushtet e publikimit.")

    @admin.action(description="Blockera valda jobb")
    def block_jobs(self, request, queryset):
        self._moderate(request, queryset, JobRequest.MODERATION_BLOCKED, "Kërkesa u bllokua nga moderimi.")

    def save_model(self, request, obj, form, change):
        if not change:
            super().save_model(request, obj, form, change)
            return

        previous = JobRequest.objects.get(pk=obj.pk)
        new_status = obj.moderation_status
        note = obj.moderation_note

        # Save content fields first, then apply the transition consistently.
        obj.moderation_status = previous.moderation_status
        super().save_model(request, obj, form, change)

        if new_status != previous.moderation_status or note != previous.moderation_note:
            obj.apply_moderation(new_status, moderator=request.user, note=note)
            transaction.on_commit(lambda: self._send_email_safely(obj))


@admin.register(JobRequestModerationEvent)
class JobRequestModerationEventAdmin(admin.ModelAdmin):
    list_display = ("job_request", "status", "moderator", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("job_request__title", "job_request__customer__email", "note")
    readonly_fields = ("job_request", "status", "note", "moderator", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
