from offers.models import Offer


def has_offer_access(company, job_request) -> bool:
    """Direct contact access starts after a paid/included offer is sent."""
    offer = Offer.objects.filter(company=company, job_request=job_request).first()
    return bool(offer and offer.can_view_lead_details())


def has_chat_access(company, job_request) -> bool:
    offer = Offer.objects.filter(company=company, job_request=job_request).first()
    return bool(offer and offer.can_chat())
