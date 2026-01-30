from django.contrib import admin
from .models import Customer, Company
from .models import EmailVerificationToken


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "phone", "address")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    ordering = ("id",)

    fieldsets = (
        ("👤 Informacioni i Klientit", {
            "fields": ("user", "phone", "address")
        }),
    )

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