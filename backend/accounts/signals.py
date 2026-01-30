# backend/accounts/signals.py

from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from .models import Company


@receiver(m2m_changed, sender=Company.professions.through)
def company_professions_changed(sender, instance, **kwargs):
    instance.profile_step = instance.calculate_profile_step()
    instance.save(update_fields=["profile_step"])


# 🔥 NY
@receiver(m2m_changed, sender=Company.cities.through)
def company_cities_changed(sender, instance, **kwargs):
    instance.profile_step = instance.calculate_profile_step()
    instance.save(update_fields=["profile_step"])

