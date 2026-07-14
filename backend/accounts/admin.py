from django.contrib import admin
from .models import Customer, Company
from .models import EmailVerificationToken


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "phone", "address", "city", "email_verified")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    list_filter = ("city", "country", "consent_job_publish")
    ordering = ("id",)
    readonly_fields = ("email_verified", "email_verified_at")

    fieldsets = (
        ("Informacioni i Klientit", {
            "fields": (
                "user",
                "phone",
                "address",
                "postal_code",
                "city",
                "country",
                "personal_number",
            )
        }),
        ("Pëlqimi", {
            "fields": (
                "consent_job_publish",
                "consent_job_publish_at",
                "consent_job_publish_ip",
            )
        }),
        ("Email", {
            "fields": ("email_verified", "email_verified_at")
        }),
    )

    @admin.display(boolean=True, description="Email verified")
    def email_verified(self, obj):
        return obj.user.email_verified

    @admin.display(description="Email verified at")
    def email_verified_at(self, obj):
        return obj.user.email_verified_at

    class Meta:
        verbose_name = "Klient"
        verbose_name_plural = "Klientë"


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company_name",
        "user_email",
        "org_number",
        "phone",
        "city",
        "is_verified",
        "is_active",
        "free_leads_remaining",
        "marketplace_access",
    )
    search_fields = (
        "company_name",
        "org_number",
        "phone",
        "user__email",
        "city__name",
    )
    list_filter = (
        "is_verified",
        "is_active",
        "vat_registered",
        "city",
        "professions",
    )
    ordering = ("id",)
    filter_horizontal = ("cities", "professions")
    readonly_fields = (
        "created_at",
        "updated_at",
        "marketplace_access",
        "can_send_offers_display",
        "can_unlock_leads_display",
        "can_be_verified_display",
    )

    fieldsets = (
        ("Informacioni i Kompanisë", {
            "fields": (
                "user",
                "company_name",
                "description",
                "phone",
                "website",
                "address",
                "city",
                "cities",
                "professions",
                "logo",
            )
        }),
        ("Organizata", {
            "fields": (
                "org_number",
                "organization_form",
                "vat_registered",
                "registration_document",
            )
        }),
        ("Verifikimi dhe Statusi", {
            "fields": (
                "is_verified",
                "verified_at",
                "is_active",
                "archived_at",
                "profile_step",
            )
        }),
        ("Leads och åtkomst", {
            "fields": (
                "free_leads_remaining",
                "marketplace_access",
                "can_send_offers_display",
                "can_unlock_leads_display",
                "can_be_verified_display",
            )
        }),
        ("Offerter", {
            "fields": ("default_offer_presentation",)
        }),
        ("System", {
            "fields": ("created_at", "updated_at")
        }),
    )

    @admin.display(description="Email")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(boolean=True, description="Marketplace access")
    def marketplace_access(self, obj):
        return obj.can_access_marketplace()

    @admin.display(boolean=True, description="Can send offers")
    def can_send_offers_display(self, obj):
        return obj.can_send_offers()

    @admin.display(boolean=True, description="Can unlock leads")
    def can_unlock_leads_display(self, obj):
        return obj.can_unlock_leads()

    @admin.display(boolean=True, description="Can be verified")
    def can_be_verified_display(self, obj):
        return obj.can_be_verified()

    class Meta:
        verbose_name = "Kompani"
        verbose_name_plural = "Kompanitë"

@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "is_used", "expires_at", "created_at", "used_at")
    list_filter = ("is_used",)
    search_fields = ("user__email", "token")
    ordering = ("-created_at",)
