from django.contrib import admin

from .models import Industry, Profession


@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order", "is_active")
    list_filter = ("is_active",)
    list_editable = ("sort_order", "is_active")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order", "name")


@admin.register(Profession)
class ProfessionAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "slug", "sort_order", "is_active")
    list_filter = ("industry", "is_active")
    list_editable = ("sort_order", "is_active")
    search_fields = ("name", "slug", "industry__name")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("industry__sort_order", "sort_order", "name")
