# backend/payments/models

from django.db import models
from django.utils import timezone

from accounts.models import Company
from offers.models import Offer


# ======================================================
# PAYMENT ENUMS
# ======================================================

class PaymentType(models.TextChoices):
    UNLOCK_LEAD = "unlock_lead", "Unlock lead"
    UNLOCK_CHAT = "unlock_chat", "Unlock chat"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class PaymentProvider(models.TextChoices):
    INTERNAL = "internal", "Internal"
    STRIPE = "stripe", "Stripe"
    MANUAL = "manual", "Manual"


# ======================================================
# PAYMENT MODEL
# ======================================================

class LeadAccess(models.Model):
    """
    Represents that a company has unlocked a job request (lead).
    Independent of Offer.
    """

    company = models.ForeignKey(
        "accounts.Company",
        on_delete=models.CASCADE,
        related_name="lead_accesses",
    )

    job_request = models.ForeignKey(
        "jobrequests.JobRequest",
        on_delete=models.CASCADE,
        related_name="lead_accesses",
    )

    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("company", "job_request")
        ordering = ["-unlocked_at"]

    def __str__(self):
        return f"{self.company} unlocked {self.job_request}"

class Payment(models.Model):
    """
    Represents a single payment attempt / transaction.

    One payment = one business action:
    - Unlock lead
    - Unlock chat

    Payments are ALWAYS linked to an Offer.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    offer = models.ForeignKey(
        Offer,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    type = models.CharField(
        max_length=20,
        choices=PaymentType.choices,
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Amount charged. Can be 0 for free unlocks."
    )

    currency = models.CharField(
        max_length=10,
        default="EUR"
    )

    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )

    provider = models.CharField(
        max_length=20,
        choices=PaymentProvider.choices,
        default=PaymentProvider.INTERNAL
    )

    provider_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text="Reference ID from payment provider (Stripe session ID, etc.)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # One unlock per offer + type
            models.UniqueConstraint(
                fields=["offer", "type"],
                name="unique_payment_per_offer_type"
            )
        ]

    # ==================================================
    # STATE HELPERS
    # ==================================================

    def mark_paid(self, provider_reference: str | None = None):
        """
        Marks payment as paid and sets paid_at timestamp.
        Used for:
        - free unlocks
        - webhook confirmations
        """
        self.status = PaymentStatus.PAID
        self.paid_at = timezone.now()

        if provider_reference:
            self.provider_reference = provider_reference

        self.save(update_fields=["status", "paid_at", "provider_reference"])

    def mark_failed(self):
        self.status = PaymentStatus.FAILED
        self.save(update_fields=["status"])

    def is_paid(self) -> bool:
        return self.status == PaymentStatus.PAID

    # ==================================================
    # BUSINESS HELPERS
    # ==================================================

    def applies_unlock(self) -> bool:
        """
        Whether this payment grants access (lead or chat).
        """
        return self.is_paid()

    def __str__(self):
        return (
            f"{self.company} | {self.type} | "
            f"{self.amount} {self.currency} | {self.status}"
        )
