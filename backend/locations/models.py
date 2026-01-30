# backend/locations/models.py

from django.db import models

class City(models.Model):
    COUNTRY_CHOICES = (
        ("XK", "Kosovo"),
        ("AL", "Albania"),
    )

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    country = models.CharField(max_length=2, choices=COUNTRY_CHOICES)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("name", "country")

    def __str__(self):
        return f"{self.name} ({self.country})"
