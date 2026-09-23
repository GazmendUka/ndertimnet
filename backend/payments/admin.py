# payments/admin.py

from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "payer_user",
        "offer",
        "type",
        "amount",
        "currency",
        "status",
        "provider",
        "provider_reference",
        "created_at",
        "updated_at",
        "paid_at",
    )

    list_filter = (
        "type",
        "status",
        "provider",
    )

    search_fields = (
        "company__company_name",
        "payer_user__email",
        "offer__id",
        "provider_reference",
    )

    readonly_fields = (
        "provider_reference",
        "provider_session_id",
        "provider_transaction_id",
        "checkout_url",
        "failure_code",
        "created_at",
        "updated_at",
        "paid_at",
    )

    ordering = ("-created_at",)
    list_per_page = 25


from .models import BillingSubscription, BillingPeriod, PlatformCharge, PlatformCheckout

class ReadOnlyBillingAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return {
            BillingSubscription: ("id", "company", "plan_code", "monthly_price", "started_at", "ends_at"),
            BillingPeriod: ("id", "subscription", "number", "starts_at", "ends_at", "offers_used"),
            PlatformCharge: ("id", "payer", "kind", "amount", "status", "paid_at"),
            PlatformCheckout: ("id", "charge", "amount", "order_id", "status", "created_at"),
        }[self.model]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

for billing_model in (BillingSubscription, BillingPeriod, PlatformCharge):
    admin.site.register(billing_model, ReadOnlyBillingAdmin)


from django import forms
from .models import OfferCredit
from .credits import validate_credit_source
from django.db import transaction
from accounts.models import Company

class CreditGrantForm(forms.ModelForm):
    class Meta:
        model = OfferCredit
        fields = ("source_offer", "reason", "evidence")

    def clean(self):
        data = super().clean()
        if not self.instance.pk and data.get("source_offer") and data.get("reason"):
            validate_credit_source(data["source_offer"], data["reason"], data.get("evidence", ""))
        return data


@admin.register(OfferCredit)
class OfferCreditAdmin(admin.ModelAdmin):
    form = CreditGrantForm
    list_display = ("id", "company", "source_offer", "reason", "created_at", "redeemed_offer")
    raw_id_fields = ("source_offer",)

    def has_add_permission(self, request):
        return request.user.has_perm("payments.issue_offer_credit")

    def has_view_permission(self, request, obj=None):
        return request.user.has_perm("payments.issue_offer_credit")

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_fields(self, request, obj=None):
        return ("source_offer", "reason", "evidence") if obj is None else tuple(f.name for f in self.model._meta.fields)

    def get_readonly_fields(self, request, obj=None):
        return () if obj is None else self.get_fields(request, obj)

    @transaction.atomic
    def save_model(self, request, obj, form, change):
        Company.objects.select_for_update().get(pk=obj.source_offer.company_id)
        validate_credit_source(obj.source_offer, obj.reason, obj.evidence)
        obj.company = obj.source_offer.company
        obj.issued_by = request.user
        obj.save()


@admin.register(PlatformCheckout)
class CheckoutReviewAdmin(ReadOnlyBillingAdmin):
    list_display = ("id", "charge", "amount", "order_id", "status", "created_at", "last_checked_at", "reconciliation_note")
    list_filter = ("status",)
    search_fields = ("order_id", "transaction_id", "charge__payer__email")
    actions = ("verify_with_bank",)

    def get_list_display(self, request):
        return self.list_display

    def has_reconcile_permission(self, request):
        return request.user.has_perm("payments.change_platformcheckout")

    @admin.action(description="Kontrollera valda väntande betalningar hos banken", permissions=["reconcile"])
    def verify_with_bank(self, request, queryset):
        from .reconciliation import reconcile_checkout
        for attempt in queryset.filter(status="pending")[:20]:
            result = reconcile_checkout(attempt.pk)
            self.log_change(request, attempt, "Bank reconciliation: " + result)
            self.message_user(request, f"#{attempt.pk}: {result}")
