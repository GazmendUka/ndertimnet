# backend/accounts/models.py

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
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
        user = self.model(email=email, **extra_fields)
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
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="customer")

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"


# ======================================================
# CUSTOMER  🔥 DU HADE TAGIT BORT DENNA
# ======================================================

class Customer(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="customer_profile",
        verbose_name="Përdoruesi"
    )
    phone = models.CharField(max_length=30, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)

    personal_number = models.CharField(
        max_length=13,
        blank=True,
        null=True,
        help_text="YYYYMMDD-XXXX"
    )

    consent_job_publish = models.BooleanField(default=False)
    consent_job_publish_at = models.DateTimeField(blank=True, null=True)
    consent_job_publish_ip = models.GenericIPAddressField(blank=True, null=True)

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
    phone = models.CharField(max_length=30, blank=True)
    website = models.URLField(blank=True)
    address = models.CharField(max_length=255, blank=True)

    logo = models.ImageField(
        upload_to="company_logos/",
        blank=True,
        null=True
    )

    org_number = models.CharField(max_length=50, blank=True)
    organization_form = models.CharField(max_length=50, blank=True)
    vat_registered = models.BooleanField(null=True)

    professions = models.ManyToManyField(
        Profession,
        blank=True,
        related_name="companies"
    )

    profile_step = models.IntegerField(default=0, db_index=True)

    is_active = models.BooleanField(default=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    default_offer_presentation = models.TextField(blank=True, default="")

    # ===========================
    # PAYMENTS / LEADS
    # ===========================
    free_leads_remaining = models.PositiveIntegerField(
        default=25,
        help_text="Number of free lead unlocks remaining for the company"
    )


    # ===========================
    # AUTO PROFILE STEP
    # ===========================
    def calculate_profile_step(self):
        step = 0

        # Step 1
        if self.description and self.professions.exists():
            step = 1

        # Step 2 (FIX)
        if step >= 1 and (self.city or self.cities.exists()):
            step = 2

        # Step 3
        if step >= 2 and self.logo:
            step = 3

        # Step 4
        if step >= 3:
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
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def mark_used(self):
        if not self.is_used:
            self.is_used = True
            self.used_at = timezone.now()
            self.save(update_fields=["is_used", "used_at"])

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"{self.user_id} • {self.token} • used={self.is_used}"
