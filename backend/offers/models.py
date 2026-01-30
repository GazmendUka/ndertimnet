#backend/offers/models.py

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import hashlib


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


class Offer(models.Model):
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="offers")
    job_request = models.ForeignKey("jobrequests.JobRequest", on_delete=models.CASCADE, related_name="offers")

    status = models.CharField(max_length=20, choices=OfferStatus.choices, default=OfferStatus.DRAFT)
    # ===========================
    # LEAD ACCESS
    # ===========================
    lead_unlocked = models.BooleanField(
        default=False,
        help_text="Whether the company has unlocked access to this lead"
    )


    current_version = models.ForeignKey(
        "offers.OfferVersion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_locked(self) -> bool:
        return self.status in {OfferStatus.ACCEPTED, OfferStatus.LOCKED}

    def clean(self):
        # En offert ska alltid ha en current_version när den inte är draft (när vi väl börjar använda den)
        if self.status in {OfferStatus.SIGNED, OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.LOCKED} and not self.current_version:
            raise ValidationError("Offer must have current_version when status is not draft.")
        if self.status == OfferStatus.ACCEPTED:
            if not self.current_version or not self.current_version.is_signed:
                raise ValidationError("Cannot accept unsigned offer.")

    def __str__(self):
        return f"Offer #{self.id} ({self.status})"
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "job_request"],
                name="unique_offer_per_company_job",
            )
        ]

    def can_view_lead_details(self) -> bool:
        return self.lead_unlocked



class OfferVersion(models.Model):
    offer = models.ForeignKey("offers.Offer", on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()

    # Steg 1
    presentation_text = models.TextField(blank=True, default="")

    # Steg 2
    can_start_from = models.DateField(null=True, blank=True)
    duration_text = models.CharField(max_length=120, blank=True, default="")  # "3-5 dagar", "2 veckor", etc.

    # Steg 3
    price_type = models.CharField(max_length=20, choices=PriceType.choices, default=PriceType.FIXED)
    price_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="EUR")

    includes_text = models.TextField(blank=True, default="")
    excludes_text = models.TextField(blank=True, default="")
    payment_terms = models.TextField(blank=True, default="")

    # Meta
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Sign-state per version
    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"OfferVersion offer={self.offer_id} v{self.version_number}"

    class Meta:
        unique_together = [("offer", "version_number")]
        ordering = ["-version_number"]


class OfferSignature(models.Model):
    """
    Signering kopplad till en specifik version.
    OBS: Personnummer är känsligt. Rekommendation: lagra krypterat.
    Här lagrar vi:
      - personnummer_hash (för verifiering / integritet)
      - personnummer_masked (för visning i UI/PDF, t.ex. ******-1234)

    Om ni vill ha full PN i PDF: lagra krypterad PN separat (se kommentar längre ner).
    """
    offer_version = models.OneToOneField("offers.OfferVersion", on_delete=models.CASCADE, related_name="signature")
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    personnummer_hash = models.CharField(max_length=64)  # sha256 hex
    personnummer_masked = models.CharField(max_length=32)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    signed_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Signature offer={self.offer_version.offer_id} v{self.offer_version.version_number}"

    @staticmethod
    def hash_personnummer(pn: str) -> str:
        pn_norm = (pn or "").strip()
        return hashlib.sha256(pn_norm.encode("utf-8")).hexdigest()

    @staticmethod
    def mask_personnummer(pn: str) -> str:
        pn_norm = (pn or "").strip()
        last4 = pn_norm[-4:] if len(pn_norm) >= 4 else pn_norm
        return f"******-{last4}"


class OfferChatUnlock(models.Model):
    """
    Chat-upplåsning.
    - EARLY: 5€ före accept, endast chat (ingen kontaktinfo)
    - AFTER_ACCEPT: 0€ (auto) efter accept, full chat
    """
    offer = models.ForeignKey("offers.Offer", on_delete=models.CASCADE, related_name="chat_unlocks")
    unlock_type = models.CharField(max_length=20, choices=UnlockType.choices)

    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="EUR")

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # koppling till payment (om ni har payments app)
    payment_reference = models.CharField(max_length=128, blank=True, default="")

    class Meta:
        unique_together = [("offer", "unlock_type")]

    def __str__(self):
        return f"ChatUnlock offer={self.offer_id} {self.unlock_type} {self.amount}{self.currency}"
