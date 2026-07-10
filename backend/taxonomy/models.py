#backend/taxonomy/models.py

from django.db import models


class Industry(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Bransch"
        verbose_name_plural = "Branscher"

    def __str__(self):
        return self.name


class Profession(models.Model):
    industry = models.ForeignKey(
        Industry,
        on_delete=models.PROTECT,
        related_name="professions",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["industry__sort_order", "sort_order", "name"]

    def __str__(self):
        return self.name
