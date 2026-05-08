# backend/accounts/models.py

from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)
from django.db import models
from django.utils import timezone
import uuid
from django.conf import settings

from locations.models import City
from taxonomy.models import Profession


# ======================================================
# USER
# ======================================================

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Användare måste ha en e-postadress")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")

        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("customer", "Customer"),
        ("company", "Company"),
        ("admin", "Admin"),
    )

    email = models.EmailField(unique=True)

    first_name = models.CharField(
        max_length=100,
        blank=True
    )

    last_name = models.CharField(
        max_length=100,
        blank=True
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="customer"
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(
        default=timezone.now
    )

    email_verified = models.BooleanField(default=False)

    email_verified_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"


# ======================================================
# CUSTOMER
# ======================================================

class Customer(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="customer_profile",
        verbose_name="Përdoruesi"
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
        null=True
    )

    address = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    postal_code = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    city = models.ForeignKey(
        City,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers"
    )

    country = models.CharField(
        max_length=2,
        blank=True,
        null=True
    )

    personal_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Kosovë: 13 shifra | Shqipëri: 1 shkronjë + 9 shifra"
    )

    consent_job_publish = models.BooleanField(default=False)

    consent_job_publish_at = models.DateTimeField(
        blank=True,
        null=True
    )

    consent_job_publish_ip = models.GenericIPAddressField(
        blank=True,
        null=True
    )

    def __str__(self):
        return self.user.email

    class Meta:
        verbose_name = "Klient"
        verbose_name_plural = "Klientë"


# ======================================================
# COMPANY
# ======================================================

class Company(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.PROTECT,
        related_name="company_profile",
        verbose_name="Përdoruesi"
    )

    company_name = models.CharField(max_length=255)

    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="companies",
        null=True,
        blank=True
    )

    cities = models.ManyToManyField(
        City,
        blank=True,
        related_name="company_service_areas"
    )

    description = models.TextField(blank=True)

    phone = models.CharField(
        max_length=30,
        blank=True
    )

    website = models.URLField(blank=True)

    address = models.CharField(
        max_length=255,
        blank=True
    )

    logo = models.ImageField(
        upload_to="company_logos/",
        blank=True,
        null=True
    )

    org_number = models.CharField(
        max_length=50,
        blank=True
    )

    organization_form = models.CharField(
        max_length=50,
        blank=True
    )

    vat_registered = models.BooleanField(null=True)

    professions = models.ManyToManyField(
        Profession,
        blank=True,
        related_name="companies"
    )

    registration_document = models.FileField(
        upload_to="company_documents/",
        null=True,
        blank=True
    )

    is_verified = models.BooleanField(default=False)

    verified_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # 🔹 Endast onboarding/navigation
    # EJ security/access längre
    profile_step = models.IntegerField(
        default=0,
        db_index=True
    )

    is_active = models.BooleanField(default=True)

    archived_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    default_offer_presentation = models.TextField(
        blank=True,
        default=""
    )

    # ===========================
    # PAYMENTS / LEADS
    # ===========================

    free_leads_remaining = models.PositiveIntegerField(
        default=25,
        help_text="Number of free lead unlocks remaining for the company"
    )

    # ======================================================
    # PROFILE REQUIREMENTS
    # ======================================================

    REQUIRED_PROFILE_FIELDS = {
        "description": 20,
        "professions": 20,
        "city": 15,
        "phone": 15,
    }

    QUALITY_PROFILE_FIELDS = {
        "logo": 10,
        "registration_document": 10,
        "website": 5,
        "portfolio": 5,
    }

    # ======================================================
    # HELPERS
    # ======================================================

    def has_service_area(self):
        return bool(
            self.city_id or self.cities.exists()
        )

    def has_professions(self):
        return self.professions.exists()

    def has_portfolio(self):
        """
        Förberedd för framtida gallery/portfolio-system.
        """
        return False

    # ======================================================
    # ACCESS METHODS (BLOCKING)
    # ======================================================

    def can_access_marketplace(self):
        return bool(
            self.description and self.description.strip()
            and self.has_professions()
            and self.has_service_area()
            and self.phone and self.phone.strip()
        )

    def can_send_offers(self):
        return self.can_access_marketplace()

    def can_unlock_leads(self):
        return self.can_access_marketplace()

    def can_access_chat(self):
        return self.can_access_marketplace()

    def can_be_verified(self):
        return bool(self.registration_document)

    # ======================================================
    # FEEDBACK METHODS
    # ======================================================

    def get_missing_requirements(self):
        missing = []

        if not (self.description and self.description.strip()):
            missing.append({
                "field": "description",
                "message": (
                    "Shto një përshkrim të kompanisë "
                    "për të marrë qasje në kërkesat e punës."
                ),
            })

        if not self.has_professions():
            missing.append({
                "field": "professions",
                "message": (
                    "Zgjidh të paktën një profesion "
                    "për të marrë qasje në kërkesat e punës."
                ),
            })

        if not self.has_service_area():
            missing.append({
                "field": "city",
                "message": (
                    "Zgjidh qytetin ose zonën ku operon kompania "
                    "për të marrë qasje në kërkesat e punës."
                ),
            })

        if not (self.phone and self.phone.strip()):
            missing.append({
                "field": "phone",
                "message": (
                    "Shto numrin e telefonit "
                    "për të marrë qasje në kërkesat e punës."
                ),
            })

        return missing

    def get_recommended_improvements(self):
        improvements = []

        if not self.logo:
            improvements.append({
                "field": "logo",
                "message": (
                    "Ngarko logon për një prezantim më profesional."
                ),
            })

        if not self.registration_document:
            improvements.append({
                "field": "registration_document",
                "message": (
                    "Ngarko dokumentin e biznesit "
                    "për më shumë besueshmëri."
                ),
            })

        if not self.website:
            improvements.append({
                "field": "website",
                "message": (
                    "Shto faqen e internetit të kompanisë."
                ),
            })

        if not self.has_portfolio():
            improvements.append({
                "field": "portfolio",
                "message": (
                    "Shto foto ose projekte të përfunduara "
                    "për të rritur besueshmërinë."
                ),
            })

        return improvements

    # ======================================================
    # PROFILE COMPLETION
    # ======================================================

    def get_profile_completion(self):
        score = 0

        # ===========================
        # REQUIRED = 70%
        # ===========================

        if self.description and self.description.strip():
            score += self.REQUIRED_PROFILE_FIELDS["description"]

        if self.has_professions():
            score += self.REQUIRED_PROFILE_FIELDS["professions"]

        if self.has_service_area():
            score += self.REQUIRED_PROFILE_FIELDS["city"]

        if self.phone and self.phone.strip():
            score += self.REQUIRED_PROFILE_FIELDS["phone"]

        # ===========================
        # QUALITY = 30%
        # ===========================

        if self.logo:
            score += self.QUALITY_PROFILE_FIELDS["logo"]

        if self.registration_document:
            score += self.QUALITY_PROFILE_FIELDS["registration_document"]

        if self.website:
            score += self.QUALITY_PROFILE_FIELDS["website"]

        if self.has_portfolio():
            score += self.QUALITY_PROFILE_FIELDS["portfolio"]

        return min(score, 100)

    # ======================================================
    # ONBOARDING STEP
    # ======================================================

    def calculate_profile_step(self):
        """
        Endast onboarding-step.
        Inte security/access längre.
        """

        step = 0

        if self.description and self.description.strip():
            step = 1

        if step >= 1 and self.has_professions():
            step = 2

        if step >= 2 and self.has_service_area():
            step = 3

        if step >= 3 and self.phone and self.phone.strip():
            step = 4

        return step

    def save(self, *args, **kwargs):
        self.profile_step = self.calculate_profile_step()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.company_name

    def can_unlock_free_lead(self):
        return self.free_leads_remaining > 0


# ======================================================
# EMAIL TOKEN
# ======================================================

class EmailVerificationToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification_tokens",
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True
    )

    expires_at = models.DateTimeField()

    is_used = models.BooleanField(
        default=False,
        db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    used_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-created_at"]

    def mark_used(self):
        if not self.is_used:
            self.is_used = True
            self.used_at = timezone.now()

            self.save(update_fields=[
                "is_used",
                "used_at"
            ])

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"{self.user_id} • {self.token} • used={self.is_used}"