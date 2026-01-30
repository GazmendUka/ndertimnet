# backend/payments/services/access.py

from payments.models import Payment, PaymentType, PaymentStatus


def has_offer_access(offer) -> bool:
    """
    Returns True if the company has paid (or been granted)
    access to the lead for this offer.
    """
    return Payment.objects.filter(
        offer=offer,
        type=PaymentType.UNLOCK_LEAD,
        status=PaymentStatus.PAID,
    ).exists()


def has_chat_access(offer) -> bool:
    """
    Returns True if the company has access to chat for this offer.
    This can be:
    - Paid early chat (5€)
    - Free chat after offer is accepted
    """
    return Payment.objects.filter(
        offer=offer,
        type=PaymentType.UNLOCK_CHAT,
        status=PaymentStatus.PAID,
    ).exists()
