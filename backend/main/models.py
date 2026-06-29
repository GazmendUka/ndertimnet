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
