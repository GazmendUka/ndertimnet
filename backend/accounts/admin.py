from django.contrib import admin, messages
from django.utils import timezone

from .emails import send_company_verified_email
from .models import Customer, Company
from .models import EmailVerificationToken
from locations.models import City
from taxonomy.models import Profession


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

    @admin.display(boolean=True, description="Email i verifikuar")
    def email_verified(self, obj):
        return obj.user.email_verified

    @admin.display(description="Email i verifikuar më")
    def email_verified_at(self, obj):
        return obj.user.email_verified_at

    class Meta:
        verbose_name = "Klient"
        verbose_name_plural = "Klientë"


class EVerifikuarFilter(admin.SimpleListFilter):
    title = "E verifikuar"
    parameter_name = "e_verifikuar"

    def lookups(self, request, model_admin):
        return (("po", "Po"), ("jo", "Jo"))

    def queryset(self, request, queryset):
        if self.value() == "po":
            return queryset.filter(is_verified=True)
        if self.value() == "jo":
            return queryset.filter(is_verified=False)
        return queryset


class AktiveFilter(admin.SimpleListFilter):
    title = "Aktive"
    parameter_name = "aktive"

    def lookups(self, request, model_admin):
        return (("po", "Po"), ("jo", "Jo"))

    def queryset(self, request, queryset):
        if self.value() == "po":
            return queryset.filter(is_active=True)
        if self.value() == "jo":
            return queryset.filter(is_active=False)
        return queryset


class TVSHFilter(admin.SimpleListFilter):
    title = "E regjistruar për TVSH"
    parameter_name = "tvsh"

    def lookups(self, request, model_admin):
        return (("po", "Po"), ("jo", "Jo"), ("pa_te_dhena", "Pa të dhëna"))

    def queryset(self, request, queryset):
        if self.value() == "po":
            return queryset.filter(vat_registered=True)
        if self.value() == "jo":
            return queryset.filter(vat_registered=False)
        if self.value() == "pa_te_dhena":
            return queryset.filter(vat_registered__isnull=True)
        return queryset


class QytetiFilter(admin.SimpleListFilter):
    title = "Qyteti"
    parameter_name = "qyteti"

    def lookups(self, request, model_admin):
        return City.objects.order_by("name").values_list("id", "name")

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(city_id=self.value())
        return queryset


class ProfesioniFilter(admin.SimpleListFilter):
    title = "Profesioni"
    parameter_name = "profesioni"

    def lookups(self, request, model_admin):
        return Profession.objects.order_by("name").values_list("id", "name")

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(professions__id=self.value()).distinct()
        return queryset


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    albanian_field_labels = {
        "user": "Përdoruesi",
        "company_name": "Emri i kompanisë",
        "description": "Përshkrimi",
        "phone": "Telefoni",
        "website": "Faqja e internetit",
        "address": "Adresa",
        "city": "Qyteti",
        "cities": "Zonat e shërbimit",
        "professions": "Profesionet",
        "logo": "Logo",
        "org_number": "Numri i biznesit",
        "organization_form": "Forma e organizimit",
        "vat_registered": "E regjistruar për TVSH",
        "registration_document": "Dokumenti i regjistrimit",
        "is_verified": "E verifikuar",
        "verified_at": "Verifikuar më",
        "is_active": "Aktive",
        "archived_at": "Arkivuar më",
        "profile_step": "Hapi i profilit",
        "free_leads_remaining": "Kërkesa falas të mbetura",
        "default_offer_presentation": "Prezantimi standard i ofertës",
        "created_at": "Krijuar më",
        "updated_at": "Përditësuar më",
    }

    list_display = (
        "id",
        "emri_i_kompanise",
        "email_i_perdoruesit",
        "numri_i_biznesit",
        "telefoni",
        "qyteti",
        "e_verifikuar",
        "aktive",
        "kerkesat_falas_te_mbetura",
        "gati_per_verifikim",
        "qasja_ne_treg",
    )
    search_fields = (
        "company_name",
        "org_number",
        "phone",
        "user__email",
        "city__name",
    )
    list_filter = (
        EVerifikuarFilter,
        AktiveFilter,
        TVSHFilter,
        QytetiFilter,
        ProfesioniFilter,
    )
    ordering = ("id",)
    filter_horizontal = ("cities", "professions")
    readonly_fields = (
        "created_at",
        "updated_at",
        "gati_per_verifikim",
        "fushat_qe_mungojne",
        "qasja_ne_treg",
        "mund_te_dergoje_oferta",
        "mund_te_hape_kerkesa",
        "mund_te_verifikohet",
    )
    actions = ("verifiko_kompanite_e_zgjedhura",)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        for field_name, label in self.albanian_field_labels.items():
            if field_name in form.base_fields:
                form.base_fields[field_name].label = label

        return form

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
                "gati_per_verifikim",
                "fushat_qe_mungojne",
                "is_verified",
                "verified_at",
                "is_active",
                "archived_at",
                "profile_step",
            )
        }),
        ("Kërkesat dhe qasja", {
            "fields": (
                "free_leads_remaining",
                "qasja_ne_treg",
                "mund_te_dergoje_oferta",
                "mund_te_hape_kerkesa",
                "mund_te_verifikohet",
            )
        }),
        ("Ofertat", {
            "fields": ("default_offer_presentation",)
        }),
        ("Sistemi", {
            "fields": ("created_at", "updated_at")
        }),
    )

    def save_model(self, request, obj, form, change):
        if obj.is_verified and not obj.verified_at:
            obj.verified_at = timezone.now()

        if not obj.is_verified:
            obj.verified_at = None

        super().save_model(request, obj, form, change)

    def get_missing_verification_fields(self, obj):
        missing = []

        if not obj.company_name:
            missing.append("emri i kompanisë")

        if not obj.org_number:
            missing.append("numri i biznesit")

        if not obj.phone:
            missing.append("telefoni")

        if not obj.has_service_area():
            missing.append("qyteti ose zona e shërbimit")

        if not obj.has_professions():
            missing.append("profesionet")

        if not obj.description or not obj.description.strip():
            missing.append("përshkrimi")

        if not obj.registration_document:
            missing.append("dokumenti i regjistrimit")

        return missing

    @admin.display(description="Emri i kompanisë")
    def emri_i_kompanise(self, obj):
        return obj.company_name

    @admin.display(description="Email")
    def email_i_perdoruesit(self, obj):
        return obj.user.email

    @admin.display(description="Numri i biznesit")
    def numri_i_biznesit(self, obj):
        return obj.org_number

    @admin.display(description="Telefoni")
    def telefoni(self, obj):
        return obj.phone

    @admin.display(description="Qyteti")
    def qyteti(self, obj):
        return obj.city

    @admin.display(boolean=True, description="E verifikuar")
    def e_verifikuar(self, obj):
        return obj.is_verified

    @admin.display(boolean=True, description="Aktive")
    def aktive(self, obj):
        return obj.is_active

    @admin.display(description="Kërkesa falas të mbetura")
    def kerkesat_falas_te_mbetura(self, obj):
        return obj.free_leads_remaining

    @admin.display(boolean=True, description="Gati për verifikim")
    def gati_per_verifikim(self, obj):
        return not self.get_missing_verification_fields(obj)

    @admin.display(description="Fushat që mungojnë")
    def fushat_qe_mungojne(self, obj):
        missing = self.get_missing_verification_fields(obj)
        if not missing:
            return "Asgjë nuk mungon"
        return ", ".join(missing)

    @admin.display(boolean=True, description="Qasje në treg")
    def qasja_ne_treg(self, obj):
        return obj.can_access_marketplace()

    @admin.display(boolean=True, description="Mund të dërgojë oferta")
    def mund_te_dergoje_oferta(self, obj):
        return obj.can_send_offers()

    @admin.display(boolean=True, description="Mund të hapë kërkesa")
    def mund_te_hape_kerkesa(self, obj):
        return obj.can_unlock_leads()

    @admin.display(boolean=True, description="Ka dokument për verifikim")
    def mund_te_verifikohet(self, obj):
        return obj.can_be_verified()

    @admin.action(description="Verifiko kompanitë e zgjedhura")
    def verifiko_kompanite_e_zgjedhura(self, request, queryset):
        verified_count = 0
        skipped_count = 0
        email_failed_count = 0

        companies = queryset.select_related("user").prefetch_related("cities", "professions")

        for company in companies:
            missing = self.get_missing_verification_fields(company)

            if missing:
                skipped_count += 1
                continue

            company.is_verified = True
            company.verified_at = company.verified_at or timezone.now()
            company.save(update_fields=["is_verified", "verified_at", "updated_at"])
            verified_count += 1

            try:
                send_company_verified_email(company.user)
            except Exception:
                email_failed_count += 1

        if verified_count:
            self.message_user(
                request,
                f"{verified_count} kompani u verifikuan me sukses.",
                messages.SUCCESS,
            )

        if skipped_count:
            self.message_user(
                request,
                (
                    f"{skipped_count} kompani nuk u verifikuan sepse "
                    "kanë fusha të paplotësuara."
                ),
                messages.WARNING,
            )

        if email_failed_count:
            self.message_user(
                request,
                (
                    f"Për {email_failed_count} kompani verifikimi u ruajt, "
                    "por email-i nuk u dërgua."
                ),
                messages.WARNING,
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
