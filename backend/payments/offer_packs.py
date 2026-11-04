"""One-time, non-expiring offer packs; separate from compensation and monthly quota."""
from decimal import Decimal
from django.db.models import F, Sum
from .models import OfferPackPurchase, PaymentStatus

PACK_PRICE = Decimal("19.95")
PACK_OFFERS = 3
PACK_TERMS_VERSION = "2026-11-04-offer-pack-v1"
PACK_TERMS = "Paketa 3 oferta: 19,95 EUR, pagesë e vetme. Pa abonim dhe pa rinovim automatik. Ofertat nuk skadojnë. Aktivizohen vetëm pas konfirmimit të pagesës. Një ofertë konsumohet kur nënshkruhet dhe dërgohet; rishikimet nuk konsumojnë ofertë tjetër. Kontaktet dhe biseda hapen pas dërgimit të ofertës."

def available_packs(company):
    return OfferPackPurchase.objects.filter(charge__company=company, charge__status=PaymentStatus.PAID, offers_used__lt=F("offers")).order_by("signed_at", "pk")

def pack_remaining(company):
    return available_packs(company).aggregate(remaining=Sum(F("offers")-F("offers_used")))["remaining"] or 0
