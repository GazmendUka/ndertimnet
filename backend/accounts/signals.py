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


from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Customer

User = get_user_model()

@receiver(post_save, sender=User)
def create_customer(sender, instance, created, **kwargs):
    if created and instance.role == "customer":
        Customer.objects.get_or_create(user=instance)