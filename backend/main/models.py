from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify


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

        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            errors["ends_at"] = "Data e përfundimit duhet të jetë pas datës së fillimit."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
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
