from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

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
        "company",
        "review_status",
        "link_type",
        "is_active",
        "display_order",
        "starts_at",
        "ends_at",
        "updated_at",
    )
    list_filter = ("review_status", "link_type", "is_active")
    search_fields = ("title", "company__company_name", "subtitle", "external_url", "sections__title", "sections__body")
    list_editable = ("is_active", "display_order")
    ordering = ("display_order", "-created_at")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [HeroAdvertisementSectionInline]
    readonly_fields = ("image_preview", "reviewed_at", "reviewed_by", "created_at")

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if obj and obj.company_id:
            fields.append("company")
        return fields

    @admin.display(description="Pamja e imazhit")
    def image_preview(self, obj):
        if obj.background_image:
            return format_html('<img src="{}" style="max-width:500px;max-height:250px" alt="">', obj.background_image.url)
        return "—"

    def save_model(self, request, obj, form, change):
        if "review_status" in form.changed_data:
            obj.reviewed_at = timezone.now()
            obj.reviewed_by = request.user
            obj.is_active = obj.review_status == "approved"
        super().save_model(request, obj, form, change)

    fieldsets = (
        ("Shqyrtimi i fushatës", {"fields": ("company", "review_status", "review_note", "duration_days",
             "reviewed_at", "reviewed_by", "created_at"),
             "description": "Vetëm fushatat e miratuara dhe aktive shfaqen në Hero. Miratimi fillon periudhën nëse datat janë bosh. Fushatat me të njëjtën renditje alternohen gjatë hapjes së faqes."}),
        ("Reklama në Hero", {
            "fields": (
                "title",
                "subtitle",
                "background_image",
                "image_preview",
                "cta_text",
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
