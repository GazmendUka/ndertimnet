# backend/payments/models

from django.db import models
from django.conf import settings
from django.utils import timezone

from accounts.models import Company
from offers.models import Offer


# ======================================================
# PAYMENT ENUMS
# ======================================================

class PaymentType(models.TextChoices):
    UNLOCK_LEAD = "unlock_lead", "Unlock lead"
    UNLOCK_CHAT = "unlock_chat", "Unlock chat"
    JOB_PAYMENT = "job_payment", "Job payment"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    CANCELED = "canceled", "Canceled"
    REFUNDED = "refunded", "Refunded"


class PaymentProvider(models.TextChoices):
    INTERNAL = "internal", "Internal"
    RAIACCEPT = "raiaccept", "RaiAccept"
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
    - Pay an accepted fixed-price job

    Payments are ALWAYS linked to an Offer.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    payer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments_made",
        help_text="User who initiated the payment, when applicable.",
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

    provider_session_id = models.CharField(max_length=255, blank=True)
    provider_transaction_id = models.CharField(max_length=255, blank=True)
    checkout_url = models.URLField(max_length=1000, blank=True)
    failure_code = models.CharField(max_length=64, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
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
        if self.status != PaymentStatus.PAID:
            self.status = PaymentStatus.PAID
            self.paid_at = timezone.now()

        if provider_reference:
            self.provider_reference = provider_reference

        self.failure_code = ""
        self.save(update_fields=[
            "status",
            "paid_at",
            "provider_reference",
            "failure_code",
            "updated_at",
        ])

    def mark_failed(self, failure_code: str = ""):
        if self.status == PaymentStatus.PAID:
            return
        self.status = PaymentStatus.FAILED
        self.failure_code = (failure_code or "")[:64]
        self.save(update_fields=["status", "failure_code", "updated_at"])

    def mark_canceled(self, failure_code: str = "canceled"):
        if self.status == PaymentStatus.PAID:
            return
        self.status = PaymentStatus.CANCELED
        self.failure_code = (failure_code or "canceled")[:64]
        self.save(update_fields=["status", "failure_code", "updated_at"])

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

    @property
    def receipt_number(self) -> str:
        year = self.created_at.year if self.created_at else timezone.now().year
        return f"NDT-{year}-{self.pk:08d}" if self.pk else ""

    def __str__(self):
        return (
            f"{self.company} | {self.type} | "
            f"{self.amount} {self.currency} | {self.status}"
        )
