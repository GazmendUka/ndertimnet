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
