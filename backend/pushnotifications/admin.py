from django.contrib import admin

from .models import NotificationDevice, NotificationPreference


@admin.register(NotificationDevice)
class NotificationDeviceAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "platform", "firebase_project_id", "active", "last_seen_at")
    list_filter = ("platform", "firebase_project_id", "active")
    search_fields = ("user__email", "device_id")
    readonly_fields = ("token", "firebase_project_id", "created_at", "last_seen_at")


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "push_enabled", "chat_messages", "offer_updates", "payment_updates", "updated_at")
    list_filter = ("push_enabled", "chat_messages", "offer_updates", "payment_updates")
    search_fields = ("user__email",)
