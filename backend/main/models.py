from django.core.exceptions import ValidationError
from django.db import models
from django.conf import settings
from django.core.validators import URLValidator
from django.utils import timezone
from datetime import timedelta
from django.utils.text import slugify


class ContactSubmissionGuard(models.Model):
    """One locked row shared by all workers; no message text or raw addresses."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    attempts = models.JSONField(default=list)


class PlatformUpdate(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "Në zhvillim"
        PLANNED = "planned", "Në plan"
        DONE = "done", "Të publikuara"

    title = models.CharField(max_length=180)
    date_label = models.CharField(max_length=80)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    is_new = models.BooleanField(default=False)
    is_clickable = models.BooleanField(default=False)
    slug = models.SlugField(max_length=220, unique=True, null=True, blank=True)
    summary = models.TextField(blank=True)
    body = models.TextField(blank=True)
    is_published = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("status", "display_order", "-created_at")
        verbose_name = "Përditësim platforme"
        verbose_name_plural = "Përditësime platforme"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.is_clickable and not self.slug:
            base_slug = slugify(self.title) or "update"
            slug = base_slug
            counter = 2

            while PlatformUpdate.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            self.slug = slug

        if not self.is_clickable:
            self.slug = None

        super().save(*args, **kwargs)


class HeroAdvertisement(models.Model):
    class LinkType(models.TextChoices):
        INTERNAL = "internal", "Faqe e brendshme"
        EXTERNAL = "external", "Link i jashtëm"

    class ReviewStatus(models.TextChoices):
        PENDING = "pending", "Në pritje të miratimit"
        APPROVED = "approved", "E miratuar"
        REJECTED = "rejected", "E refuzuar"
        PAUSED = "paused", "E pezulluar"
        WITHDRAWN = "withdrawn", "E tërhequr"

    company = models.ForeignKey("accounts.Company", null=True, blank=True,
        on_delete=models.CASCADE, related_name="marketing_campaigns", verbose_name="Kompania")
    review_status = models.CharField("Shqyrtimi", max_length=16,
        choices=ReviewStatus.choices, default=ReviewStatus.APPROVED)
    review_note = models.TextField("Arsyeja / komenti për kompaninë", blank=True, max_length=2000)
    reviewed_at = models.DateTimeField(null=True, blank=True, editable=False)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="reviewed_campaigns", editable=False)
    duration_days = models.PositiveSmallIntegerField("Ditët e kërkuara",
        choices=[(3, "3 ditë"), (7, "7 ditë"), (14, "14 ditë")], default=7)
    cta_text = models.CharField("Teksti i butonit", max_length=40, default="Mëso më shumë")

    title = models.CharField("Titulli", max_length=180)
    subtitle = models.CharField("Nëntitulli", max_length=260, blank=True)
    slug = models.SlugField("Slug", max_length=220, unique=True, blank=True)
    background_image = models.ImageField(
        "Imazhi i sfondit",
        upload_to="hero_advertisements/%Y/%m/",
        help_text=(
            "Rekomandohet imazh horizontal të paktën 1920 x 900 px. "
            "Formatet e pranuara: JPG, PNG ose WebP."
        ),
    )
    link_type = models.CharField(
        "Lloji i linkut",
        max_length=20,
        choices=LinkType.choices,
        default=LinkType.INTERNAL,
    )
    external_url = models.URLField("Link i jashtëm", blank=True)
    is_active = models.BooleanField("Aktive", default=False)
    starts_at = models.DateTimeField("Fillon më", null=True, blank=True)
    ends_at = models.DateTimeField("Përfundon më", null=True, blank=True)
    display_order = models.PositiveIntegerField("Renditja", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("display_order", "-created_at")
        verbose_name = "Reklamë hero"
        verbose_name_plural = "Reklama hero"

    def __str__(self):
        return self.title

    def clean(self):
        errors = {}

        if self.link_type == self.LinkType.EXTERNAL and not self.external_url:
            errors["external_url"] = "Plotësoni linkun e jashtëm."

        if self.company_id:
            if self.link_type != self.LinkType.EXTERNAL:
                errors["link_type"] = "Fushatat e kompanive duhet të kenë link të jashtëm."
            try:
                URLValidator(schemes=["http", "https"])(self.external_url)
            except ValidationError:
                errors["external_url"] = "Përdorni një link të vlefshëm HTTP ose HTTPS."
            if self.review_status == self.ReviewStatus.REJECTED and not self.review_note.strip():
                errors["review_note"] = "Shkruani arsyen e refuzimit për kompaninë."

        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            errors["ends_at"] = "Data e përfundimit duhet të jetë pas datës së fillimit."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.company_id:
            if self.review_status != self.ReviewStatus.APPROVED:
                self.is_active = False
            else:
                if not self.starts_at:
                    self.starts_at = timezone.now()
                if not self.ends_at:
                    self.ends_at = self.starts_at + timedelta(days=self.duration_days)
        if not self.slug:
            base_slug = slugify(self.title) or "reklame"
            slug = base_slug
            counter = 2

            while HeroAdvertisement.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            self.slug = slug

        super().save(*args, **kwargs)

    @property
    def internal_url(self):
        return f"/reklama/{self.slug}"

    @property
    def target_url(self):
        if self.link_type == self.LinkType.EXTERNAL and self.external_url:
            return self.external_url

        return self.internal_url


class HeroAdvertisementSection(models.Model):
    advertisement = models.ForeignKey(
        HeroAdvertisement,
        related_name="sections",
        on_delete=models.CASCADE,
        verbose_name="Reklama",
    )
    title = models.CharField("Titulli i seksionit", max_length=160, blank=True)
    body = models.TextField(
        "Teksti",
        help_text=(
            "Përdorni rreshta bosh për paragrafe. "
            "Rreshtat që fillojnë me '-' shfaqen si listë."
        ),
    )
    display_order = models.PositiveIntegerField("Renditja", default=0)

    class Meta:
        ordering = ("display_order", "id")
        verbose_name = "Tekst reklame"
        verbose_name_plural = "Tekste reklame"

    def __str__(self):
        return self.title or f"Tekst {self.display_order + 1}"
