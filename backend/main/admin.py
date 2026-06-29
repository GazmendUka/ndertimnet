from django.contrib import admin

from .models import PlatformUpdate


@admin.register(PlatformUpdate)
class PlatformUpdateAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "date_label",
        "display_order",
        "is_new",
        "is_published",
        "updated_at",
    )
    list_filter = ("status", "is_new", "is_published")
    search_fields = ("title", "date_label")
    list_editable = ("display_order", "is_new", "is_published")
    ordering = ("status", "display_order", "-created_at")

# Register your models here.
