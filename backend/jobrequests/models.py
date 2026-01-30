# backend/jobrequests/models.py 

from django.db import models
from django.utils import timezone
from datetime import timedelta
from locations.models import City
from taxonomy.models import Profession


from accounts.models import Customer, Company


# ============================================================
# 🏆  AUDIT LOG – historik för ändringar och viktiga händelser
# ============================================================

class JobRequestAudit(models.Model):
    ACTION_CHOICES = [
        ("offer_sent", "Ofertë e dërguar"),
        ("offer_accepted", "Oferta u pranua"),
        ("offer_declined", "Oferta u refuzua"),
        ("job_closed", "Kërkesa u mbyll"),
        ("reopened_round_two", "Rihapja e rundit të dytë"),
        ("winner_selected", "Fituesi u përzgjodh"),
    ]

    job_request = models.ForeignKey(
        "JobRequest",
        on_delete=models.CASCADE,
        related_name="audit_logs"
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_company"
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Auditim i kërkesës"
        verbose_name_plural = "Auditime të kërkesave"

    def __str__(self):
        return f"{self.action} – {self.job_request.id}"


# ============================================================
# 🏗️  JOB REQUEST – den riktiga publicerade jobbannonsen
# ============================================================

class JobRequest(models.Model):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="job_requests",
        verbose_name="Klienti"
    )

    title = models.CharField(max_length=255, verbose_name="Titulli i punës")
    description = models.TextField(verbose_name="Përshkrimi")
    budget = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Buxheti €"
    )
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="job_requests",
        verbose_name="Qyteti"
    )

    profession = models.ForeignKey(
        Profession,
        on_delete=models.PROTECT,
        related_name="job_requests",
        verbose_name="Profesioni"
    )


    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Krijuar më")
    is_active = models.BooleanField(default=True, verbose_name="Aktive")
    max_offers = models.PositiveIntegerField(default=7, verbose_name="Numri maksimal i ofertave")
    last_offer_at = models.DateTimeField(null=True, blank=True, verbose_name="Data e ofertës së fundit")
    is_reopened = models.BooleanField(default=False, verbose_name="Rihapur")
    reopened_at = models.DateTimeField(null=True, blank=True, verbose_name="Rihapur më")

    # 🔁 Status / resultat
    is_completed = models.BooleanField(default=False, verbose_name="Përfunduar")

    accepted_company = models.ForeignKey(
        Company,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Kompania e pranuar"
    )
    accepted_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Çmimi i pranuar"
    )

    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Skadon më")

    # 🏆 Fitues
    winner_company = models.ForeignKey(
        Company,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="winner_jobs",
        verbose_name="Fituesi"
    )
    winner_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Çmimi fitues"
    )
    winner_offer = models.ForeignKey(
        "leads.LeadMatch",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="winning_offer",
        verbose_name="Oferta fituese"
    )

    def save(self, *args, **kwargs):
        """Vendos automatikisht datën e skadimit 40 ditë më vonë nëse nuk është vendosur."""
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=40)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.customer.user.email})"

    @property
    def offers_count(self):
        """Numri i kompanive që kanë dërguar ofertë."""
        return self.matches.count()

    @property
    def offers_left(self):
        """Sa oferta të lira kanë mbetur."""
        return max(self.max_offers - self.offers_count, 0)

    @property
    def extra_offers_added(self):
        """Numri i ofertave shtesë pas rihapjes."""
        return max(self.max_offers - 7, 0)

    class Meta:
        verbose_name = "Kërkesë për Punë"
        verbose_name_plural = "Kërkesa për Punë"


# ============================================================
# 🆕  JOB REQUEST DRAFT – används av multi-step formuläret
# ============================================================

class JobRequestDraft(models.Model):
    """
    Stegvis utkast som kunden fyller i (1–4)
    innan det blir en riktig JobRequest.
    """

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="jobrequest_drafts"
    )

    # Fält som fylls i under olika steg
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="jobrequest_drafts",
        verbose_name="Qyteti"
    )

    profession = models.ForeignKey(
        Profession,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="jobrequest_drafts",
        verbose_name="Profesioni"
    )


    # Multi-step state
    current_step = models.PositiveSmallIntegerField(default=1)
    is_submitted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Draft #{self.pk} – {self.customer.user.email} (step {self.current_step})"
