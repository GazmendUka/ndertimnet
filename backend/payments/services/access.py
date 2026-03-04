# backend/payments/services/access.py

from payments.models import Payment, PaymentType, PaymentStatus
from offers.models import Offer


def has_offer_access(company, job_request) -> bool:
    """
    Returns True if the company has paid to unlock this lead.
    Unlocking a lead grants FULL access (job details + chat).
    """

    offer = Offer.objects.filter(
        company=company,
        job_request=job_request
    ).first()

    if not offer:
        return False

    return Payment.objects.filter(
        offer=offer,
        type=PaymentType.UNLOCK_LEAD,
        status=PaymentStatus.PAID,
    ).exists()


def has_chat_access(company, job_request) -> bool:
    """
    Chat access is now identical to lead access.
    """
    return has_offer_access(company, job_request)