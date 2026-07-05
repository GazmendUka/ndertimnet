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
    list_display = ("id", "company_name", "org_number", "phone")
    search_fields = ("company_name", "org_number", "phone")
    ordering = ("id",)

    fieldsets = (
        ("🏢 Informacioni i Kompanisë", {
            "fields": ("user", "company_name", "org_number", "phone")
        }),
    )

    class Meta:
        verbose_name = "Kompani"
        verbose_name_plural = "Kompanitë"

@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "is_used", "expires_at", "created_at", "used_at")
    list_filter = ("is_used",)
    search_fields = ("user__email", "token")
    ordering = ("-created_at",)
