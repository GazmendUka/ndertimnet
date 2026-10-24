from django.contrib import admin

from .models import OfferReview


@admin.register(OfferReview)
class OfferReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "customer", "rating", "recommended", "moderation_status", "created_at")
    list_filter = ("rating", "recommended", "moderation_status", "created_at")
    search_fields = ("company__company_name", "customer__email", "review_text")
    readonly_fields = ("offer", "company", "customer", "rating", "review_text", "image", "recommended", "created_at")
    list_editable = ("moderation_status",)


from django import forms
from .models import Offer, OfferMessage, ChatReviewAccess


class ChatReviewPermissionMixin:
    def has_module_permission(self, request):
        return request.user.has_perm("offers.review_chat")

    def has_view_permission(self, request, obj=None):
        return request.user.has_perm("offers.review_chat")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OfferMessage)
class StoredChatAdmin(ChatReviewPermissionMixin, admin.ModelAdmin):
    list_display = ("id", "offer", "sender_type", "created_at")
    list_filter = ("sender_type",)
    search_fields = ("=offer__id",)
    readonly_fields = tuple(field.name for field in OfferMessage._meta.fields)

    def has_change_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        if self.has_view_permission(request):
            ChatReviewAccess.objects.create(reviewer=request.user, action="list")
        return super().changelist_view(request, extra_context)

    def change_view(self, request, object_id, form_url="", extra_context=None):
        if self.has_view_permission(request):
            message = OfferMessage.objects.filter(pk=object_id).first()
            if message:
                ChatReviewAccess.objects.create(reviewer=request.user, offer=message.offer)
        return super().change_view(request, object_id, form_url, extra_context)


class RetentionHoldForm(forms.ModelForm):
    class Meta:
        model = Offer
        fields = ("chat_retention_hold", "chat_retention_reason")

    def clean(self):
        data = super().clean()
        if data.get("chat_retention_hold") and not data.get("chat_retention_reason", "").strip():
            self.add_error("chat_retention_reason", "Ange skälet till det pågående ärendet.")
        return data


@admin.register(Offer)
class ChatRetentionAdmin(ChatReviewPermissionMixin, admin.ModelAdmin):
    form = RetentionHoldForm
    list_display = ("id", "company", "status", "chat_retention_hold")
    list_filter = ("chat_retention_hold", "status")
    readonly_fields = ("company", "job_request", "status")
    fields = ("company", "job_request", "status", "chat_retention_hold", "chat_retention_reason")

    def has_change_permission(self, request, obj=None):
        return self.has_view_permission(request, obj)


@admin.register(ChatReviewAccess)
class ChatReviewAccessAdmin(ChatReviewPermissionMixin, admin.ModelAdmin):
    list_display = ("reviewer", "offer", "action", "accessed_at")
    readonly_fields = tuple(field.name for field in ChatReviewAccess._meta.fields)

    def has_change_permission(self, request, obj=None):
        return False


from django.db import transaction
from django.utils import timezone
from django.utils.html import format_html_join
from .models import ChatReport


class ChatReportForm(forms.ModelForm):
    class Meta:
        model = ChatReport
        fields = ("status", "admin_note")

    def clean(self):
        data = super().clean()
        if self.instance.pk and data.get('status') == ChatReport.Status.PENDING:
            other = ChatReport.objects.filter(reporter_id=self.instance.reporter_id, status=ChatReport.Status.PENDING).exclude(pk=self.instance.pk)
            other = other.filter(message_id=self.instance.message_id) if self.instance.message_id else other.filter(offer_id=self.instance.offer_id, message__isnull=True)
            if other.exists():
                self.add_error('status', 'Ekziston tashmë një raport i hapur për këtë mesazh ose bisedë.')
        return data


@admin.register(ChatReport)
class ChatReportAdmin(ChatReviewPermissionMixin, admin.ModelAdmin):
    form = ChatReportForm
    list_display = ("id", "offer", "reason", "status", "created_at", "reviewed_at")
    list_filter = ("status", "reason", "created_at")
    search_fields = ("=offer__id", "=id")
    readonly_fields = ("offer", "reporter", "reported_user", "message", "reported_message", "conversation_messages", "reason", "details", "created_at", "reviewed_at", "reviewed_by")
    fields = readonly_fields + ("status", "admin_note")
    actions = ("mark_reviewed", "dismiss_reports", "hide_reported_messages")

    def has_change_permission(self, request, obj=None):
        return request.user.has_perm("offers.review_chat") and request.user.has_perm("offers.change_chatreport")

    def changelist_view(self, request, extra_context=None):
        if self.has_view_permission(request):
            ChatReviewAccess.objects.create(reviewer=request.user, action="report_list")
        return super().changelist_view(request, extra_context)

    @admin.display(description="Mesazhi i raportuar")
    def reported_message(self, obj):
        return obj.message.message if obj.message_id else "Raportim për bisedën / përdoruesin."

    @admin.display(description="Mesazhet e fundit (deri në 20 për secilin historik)")
    def conversation_messages(self, obj):
        from leads.models import LeadMessage
        modern = list(OfferMessage.objects.filter(offer_id=obj.offer_id).order_by('-created_at')[:20])
        legacy = list(LeadMessage.objects.filter(lead__company_id=obj.offer.company_id, lead__job_request_id=obj.offer.job_request_id).order_by('-created_at')[:20])
        return format_html_join('', '<p style="white-space:pre-wrap;overflow-wrap:anywhere">{} · {} · {}: {}</p>',
            ((m.created_at, 'Arkiv' if isinstance(m, LeadMessage) else 'Bisedë', m.sender_type, m.message)
             for m in sorted(modern + legacy, key=lambda m: m.created_at))) or 'Nuk ka mesazhe.'

    def change_view(self, request, object_id, form_url="", extra_context=None):
        if self.has_view_permission(request):
            report = ChatReport.objects.filter(pk=object_id).first()
            if report:
                ChatReviewAccess.objects.create(reviewer=request.user, offer=report.offer, action="report")
        return super().change_view(request, object_id, form_url, extra_context)

    def save_model(self, request, obj, form, change):
        if "status" in form.changed_data:
            obj.reviewed_at = timezone.now() if obj.status != ChatReport.Status.PENDING else None
            obj.reviewed_by = request.user if obj.status != ChatReport.Status.PENDING else None
        super().save_model(request, obj, form, change)

    @admin.action(description="Shëno si të shqyrtuara", permissions=["change"])
    def mark_reviewed(self, request, queryset):
        queryset.update(status=ChatReport.Status.REVIEWED, reviewed_at=timezone.now(), reviewed_by=request.user)

    @admin.action(description="Mbyll pa veprim", permissions=["change"])
    def dismiss_reports(self, request, queryset):
        queryset.update(status=ChatReport.Status.DISMISSED, reviewed_at=timezone.now(), reviewed_by=request.user)

    @admin.action(description="Fshih mesazhet e raportuara dhe shëno si të shqyrtuara", permissions=["change"])
    def hide_reported_messages(self, request, queryset):
        with transaction.atomic():
            OfferMessage.objects.filter(pk__in=queryset.values("message_id")).update(is_hidden=True)
            queryset.filter(message__isnull=False).update(status=ChatReport.Status.REVIEWED, reviewed_at=timezone.now(), reviewed_by=request.user)
