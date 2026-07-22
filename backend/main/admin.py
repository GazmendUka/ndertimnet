from django.contrib import admin

from .models import HeroAdvertisement, HeroAdvertisementSection, PlatformUpdate


@admin.register(PlatformUpdate)
class PlatformUpdateAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "date_label",
        "display_order",
        "is_new",
        "is_clickable",
        "is_published",
        "updated_at",
    )
    list_filter = ("status", "is_new", "is_clickable", "is_published")
    search_fields = ("title", "date_label", "summary", "body")
    list_editable = ("display_order", "is_new", "is_clickable", "is_published")
    ordering = ("status", "display_order", "-created_at")
    prepopulated_fields = {"slug": ("title",)}
    fieldsets = (
        ("Update", {
            "fields": (
                "title",
                "date_label",
                "status",
                "display_order",
                "is_new",
                "is_published",
            )
        }),
        ("Clickable detail page", {
            "fields": (
                "is_clickable",
                "slug",
                "summary",
                "body",
            )
        }),
    )

# Register your models here.


class HeroAdvertisementSectionInline(admin.StackedInline):
    model = HeroAdvertisementSection
    extra = 1
    max_num = 5
    fields = ("display_order", "title", "body")


@admin.register(HeroAdvertisement)
class HeroAdvertisementAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "link_type",
        "is_active",
        "display_order",
        "starts_at",
        "ends_at",
        "updated_at",
    )
    list_filter = ("link_type", "is_active")
    search_fields = ("title", "subtitle", "external_url", "sections__title", "sections__body")
    list_editable = ("is_active", "display_order")
    ordering = ("display_order", "-created_at")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [HeroAdvertisementSectionInline]
    fieldsets = (
        ("Reklama në Hero", {
            "fields": (
                "title",
                "subtitle",
                "background_image",
                "is_active",
                "display_order",
            ),
            "description": (
                "Për imazhin e sfondit përdorni një foto horizontale, "
                "të paktën 1920 x 900 px. Formatet e pranuara janë JPG, PNG ose WebP."
            ),
        }),
        ("Linku", {
            "fields": (
                "link_type",
                "slug",
                "external_url",
            ),
            "description": (
                "Nëse zgjidhni faqe të brendshme, linku krijohet automatikisht "
                "si /reklama/slug. Nëse zgjidhni link të jashtëm, plotësoni URL-në."
            ),
        }),
        ("Koha e publikimit", {
            "fields": (
                "starts_at",
                "ends_at",
            ),
            "description": "Lërini bosh nëse reklama nuk ka datë fillimi ose përfundimi.",
        }),
    )
