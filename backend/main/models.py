from django.db import models


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
    is_published = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("status", "display_order", "-created_at")
        verbose_name = "Platform update"
        verbose_name_plural = "Platform updates"

    def __str__(self):
        return self.title
