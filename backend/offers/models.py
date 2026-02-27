# backend/offers/models.py

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import hashlib


# =============================================================================
# ENUMS
# =============================================================================

class OfferStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SIGNED = "signed", "Signed"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    LOCKED = "locked", "Locked"


class PriceType(models.TextChoices):
    FIXED = "fixed", "Fast pris"
    HOURLY = "hourly", "Timpris"


class UnlockType(models.TextChoices):
    EARLY = "early", "Early (före accept)"
    AFTER_ACCEPT = "after_accept", "After accept (gratis)"


# =============================================================================
# OFFER (🔥 SOURCE OF TRUTH)
# =============================================================================

class Offer(models.Model):
    company = models.ForeignKey(
        "accounts.Company",
        on_delete=models.CASCADE,
        related_name="offers"
    )

    job_request = models.ForeignKey(
        "jobrequests.JobRequest",
        on_delete=models.CASCADE,
        related_name="offers"
    )

    status = models.CharField(
        max_length=20,
        choices=OfferStatus.choices,
        default=OfferStatus.DRAFT,
        db_index=True,
    )

    round_number = models.PositiveSmallIntegerField(default=1, db_index=True)

    # 🔥 Lead access – SINGLE SOURCE OF TRUTH
    lead_unlocked = models.BooleanField(
        default=False,
        help_text="Whether the company has unlocked access to this lead"
    )

    current_version = models.ForeignKey(
        "offers.OfferVersion",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )

    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "job_request"],
                name="unique_offer_per_company_job",
            )
        ]
        indexes = [
            models.Index(fields=["job_request", "status"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self):
        return f"Offer #{self.id} ({self.status})"

    # ------------------------------------------------------------------
    # BUSINESS LOGIC
    # ------------------------------------------------------------------

    def is_locked(self) -> bool:
        return self.status in {OfferStatus.ACCEPTED, OfferStatus.LOCKED}

    def can_view_lead_details(self) -> bool:
        return bool(self.lead_unlocked)

    def clean(self):
        # Non-draft must have version
        if self.status != OfferStatus.DRAFT and not self.current_version:
            raise ValidationError("Offer must have current_version when not draft.")

        # Cannot accept unsigned
        if self.status == OfferStatus.ACCEPTED:
            if not self.current_version or not self.current_version.is_signed:
                raise ValidationError("Cannot accept unsigned offer.")

        # Prevent modifying accepted offer
        if self.pk:
            original = Offer.objects.filter(pk=self.pk).first()
            if original and original.status == OfferStatus.ACCEPTED and self.status != OfferStatus.ACCEPTED:
                raise ValidationError("Accepted offer cannot change status.")

    def save(self, *args, **kwargs):
        self.full_clean()

        # Auto-set timestamps
        if self.status == OfferStatus.ACCEPTED and not self.accepted_at:
            self.accepted_at = timezone.now()

        if self.status == OfferStatus.REJECTED and not self.rejected_at:
            self.rejected_at = timezone.now()

        super().save(*args, **kwargs)


# =============================================================================
# OFFER VERSION
# =============================================================================

class OfferVersion(models.Model):
    offer = models.ForeignKey(
        "offers.Offer",
        on_delete=models.CASCADE,
        related_name="versions"
    )

    version_number = models.PositiveIntegerField()

    presentation_text = models.TextField(blank=True, default="")

    can_start_from = models.DateField(null=True, blank=True)
    duration_text = models.CharField(max_length=120, blank=True, default="")

    price_type = models.CharField(
        max_length=20,
        choices=PriceType.choices,
        default=PriceType.FIXED
    )

    price_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    currency = models.CharField(max_length=10, default="EUR")

    includes_text = models.TextField(blank=True, default="")
    excludes_text = models.TextField(blank=True, default="")
    payment_terms = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("offer", "version_number")]
        ordering = ["-version_number"]
        indexes = [
            models.Index(fields=["offer", "version_number"]),
        ]

    def __str__(self):
        return f"OfferVersion offer={self.offer_id} v{self.version_number}"

    def save(self, *args, **kwargs):
        if self.is_signed and not self.signed_at:
            self.signed_at = timezone.now()
        super().save(*args, **kwargs)


# =============================================================================
# SIGNATURE
# =============================================================================

class OfferSignature(models.Model):
    offer_version = models.OneToOneField(
        "offers.OfferVersion",
        on_delete=models.CASCADE,
        related_name="signature"
    )

    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    personnummer_hash = models.CharField(max_length=64)
    personnummer_masked = models.CharField(max_length=32)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    signed_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Signature offer={self.offer_version.offer_id} v{self.offer_version.version_number}"

    @staticmethod
    def hash_personnummer(pn: str) -> str:
        return hashlib.sha256((pn or "").strip().encode("utf-8")).hexdigest()

    @staticmethod
    def mask_personnummer(pn: str) -> str:
        pn_norm = (pn or "").strip()
        last4 = pn_norm[-4:] if len(pn_norm) >= 4 else pn_norm
        return f"******-{last4}"


# =============================================================================
# CHAT UNLOCK (PREPARED FOR PAYMENT)
# =============================================================================

class OfferChatUnlock(models.Model):
    offer = models.ForeignKey(
        "offers.Offer",
        on_delete=models.CASCADE,
        related_name="chat_unlocks"
    )

    unlock_type = models.CharField(max_length=20, choices=UnlockType.choices)

    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="EUR")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    payment_reference = models.CharField(max_length=128, blank=True, default="")

    class Meta:
        unique_together = [("offer", "unlock_type")]
        indexes = [
            models.Index(fields=["offer", "unlock_type"]),
        ]

    def __str__(self):
        return f"ChatUnlock offer={self.offer_id} {self.unlock_type} {self.amount}{self.currency}"


# =============================================================================
# CHAT MESSAGE (REPLACES LeadMessage)
# =============================================================================

class OfferMessage(models.Model):
    offer = models.ForeignKey(
        "offers.Offer",
        on_delete=models.CASCADE,
        related_name="messages"
    )

    sender_company = models.ForeignKey(
        "accounts.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_offer_messages",
    )

    sender_customer = models.ForeignKey(
        "accounts.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_offer_messages",
    )

    sender_type = models.CharField(
        max_length=20,
        choices=[("company", "Kompani"), ("customer", "Klient")],
    )

    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["offer", "created_at"]),
        ]

    def clean(self):
        if self.sender_type == "company" and not self.sender_company:
            raise ValidationError("Company sender must have sender_company.")
        if self.sender_type == "customer" and not self.sender_customer:
            raise ValidationError("Customer sender must have sender_customer.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"OfferMessage offer={self.offer_id} ({self.sender_type})"