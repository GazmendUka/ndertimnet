# NDERTIMNET/BACKEND/LEADS/MODELS.PY

from django.db import models
from django.utils import timezone

from accounts.models import Customer, Company
from jobrequests.models import JobRequest


# =============================================================================
# ⚠️ LEGACY MODULE (v1.0+)
# =============================================================================
# LeadMatch/LeadMessage fanns före offers.Offer-systemet.
#
# ✅ Ny source of truth:
# - offers.Offer (inkl lead_unlocked, signed/accepted/rejected)
# - offers.OfferMessage ersätter LeadMessage
#
# Denna fil behålls tills du:
# 1) migrerar winner_offer (jobrequests.JobRequest) helt till offers.Offer
# 2) migrerar chat/messages till offers.OfferMessage
# 3) tar bort all användning av LeadMatch i views/serializers
#
# Under tiden: håll LeadMatch isolerad och använd den inte för nya flöden.
# =============================================================================


# ------------------------------------------------------------
# 💼  LEAD MATCH (LEGACY: offert från ett företag)
# ------------------------------------------------------------
class LeadMatch(models.Model):
    """
    LEGACY offer-model.

    OBS: Denna modell ska inte vara source of truth framåt.
    Den kan fortfarande finnas kvar för gamla data / migrations.
    """

    STATUS_CHOICES = [
        ("pending", "Në pritje"),
        ("accepted", "E pranuar"),
        ("declined", "E refuzuar"),
    ]

    job_request = models.ForeignKey(
        JobRequest,
        on_delete=models.CASCADE,
        related_name="matches",
        verbose_name="Kërkesa për punë",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sent_offers",
        verbose_name="Kompania",
    )

    message = models.TextField(
        blank=True,
        null=True,
        verbose_name="Mesazhi i kompanisë",
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Çmimi i ofertës",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        verbose_name="Statusi i ofertës",
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Dërguar më",
        db_index=True,
    )

    round_number = models.PositiveIntegerField(
        default=1,
        verbose_name="Rundi",
        db_index=True,
    )

    # --------------------------------------------------------
    # 🔥 Legacy fields (chat/unlock m.m.)
    # --------------------------------------------------------
    can_chat = models.BooleanField(
        default=False,
        help_text="LEGACY: Företaget kan chatta med kunden via plattformen.",
    )

    customer_info_unlocked = models.BooleanField(
        default=False,
        help_text="LEGACY: Sant när kundens kontaktuppgifter är upplåsta.",
    )

    customer_info_unlocked_by_company = models.BooleanField(
        default=False,
        help_text="LEGACY: Sant när företaget manuellt köper premium-unlock (5€).",
    )

    WORKFLOW_STATUS_ACTIVE = "active"
    WORKFLOW_STATUS_IN_PROGRESS = "in_progress"
    WORKFLOW_STATUS_COMPLETED = "completed"
    WORKFLOW_STATUS_ARCHIVED = "archived"

    WORKFLOW_STATUS_CHOICES = [
        (WORKFLOW_STATUS_ACTIVE, "Active"),
        (WORKFLOW_STATUS_IN_PROGRESS, "In progress"),
        (WORKFLOW_STATUS_COMPLETED, "Completed"),
        (WORKFLOW_STATUS_ARCHIVED, "Archived"),
    ]

    workflow_status = models.CharField(
        max_length=20,
        choices=WORKFLOW_STATUS_CHOICES,
        default=WORKFLOW_STATUS_ACTIVE,
        db_index=True,
        help_text="LEGACY: Pipeline-status för leadet.",
    )

    def __str__(self):
        return f"{self.company.company_name} → {self.job_request.title} ({self.workflow_status})"

    class Meta:
        verbose_name = "Ofertë Kompanie (Legacy)"
        verbose_name_plural = "Oferta Kompanish (Legacy)"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["job_request", "company"]),
            models.Index(fields=["workflow_status"]),
            models.Index(fields=["status"]),
        ]


# ------------------------------------------------------------
# 🗂️  ARKIVA e punëve të fituara
# ------------------------------------------------------------
class ArchivedJob(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=100)
    date_accepted = models.DateTimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.title} – {self.price} €"

    class Meta:
        verbose_name = "Punë e Arkivuar"
        verbose_name_plural = "Punë të Arkivuara"
        ordering = ["-date_accepted"]
        indexes = [
            models.Index(fields=["company", "date_accepted"]),
        ]


# ------------------------------------------------------------
# 💬  MESAZHET (LEGACY) midis kompanisë dhe klientit
# ------------------------------------------------------------
class LeadMessage(models.Model):
    """
    LEGACY chat-message model.

    ✅ Ny modell: offers.OfferMessage
    Denna kan fasas ut senare med en datamigrering.
    """

    lead = models.ForeignKey(
        LeadMatch,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Oferta",
    )

    sender_company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_messages",
    )

    sender_customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_messages",
    )

    sender_type = models.CharField(
        max_length=20,
        choices=[("company", "Kompani"), ("customer", "Klient")],
        verbose_name="Lloji",
    )

    message = models.TextField(verbose_name="Mesazhi")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        if self.sender_type == "company" and self.sender_company:
            return f"{self.sender_company.company_name} → {self.lead.job_request.title}"
        if self.sender_type == "customer" and self.sender_customer:
            return f"{self.sender_customer.user.email} → {self.lead.job_request.title}"
        return f"Anonim → {self.lead.job_request.title}"

    class Meta:
        verbose_name = "Mesazh (Legacy)"
        verbose_name_plural = "Mesazhe (Legacy)"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["lead", "created_at"]),
        ]