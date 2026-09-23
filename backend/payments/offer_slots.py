"""All callers hold the JobRequest row lock before locking an Offer.

A pending bank outcome reserves a place until verified, including abandoned browsers.
A verified failure releases it; a successful payment retains it for sending.
"""
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from offers.models import Offer


def occupied_offers(job):
    return Offer.objects.filter(job_request=job).filter(
        Q(versions__is_signed=True) |
        Q(platform_charges__kind="offer_fee", platform_charges__status="paid", compensation_credit__isnull=True) |
        Q(platform_charges__kind="offer_fee", platform_charges__checkouts__status="pending", compensation_credit__isnull=True)
    ).distinct()


def require_offer_slot(offer, job):
    if hasattr(offer, "compensation_credit"):
        raise ValidationError({"detail": "Kjo ofertë është kompensuar me kredit për një kërkesë tjetër.", "code": "offer_compensated"})
    if offer.versions.filter(is_signed=True).exists():
        return
    occupied = occupied_offers(job)
    if occupied.filter(pk=offer.pk).exists():
        return
    if occupied.count() >= job.max_offers:
        raise ValidationError({"detail": "Të gjitha vendet janë zënë ose rezervuar për pagesë. Nuk u krye pagesë. Provoni më vonë.", "code": "offer_limit_reached"})
