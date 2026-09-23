from django.core.exceptions import ValidationError, PermissionDenied
from django.db import transaction
from accounts.models import Company
from .models import OfferCredit, PlatformCharge


def validate_credit_source(offer, reason, evidence):
    if reason not in OfferCredit.Reason.values or len((evidence or "").strip()) < 10:
        raise ValidationError("Välj ett bekräftat fel och dokumentera underlaget (minst 10 tecken).")
    if PlatformCharge.objects.filter(offer=offer, checkouts__status="pending").exists():
        raise ValidationError("Bankbetalningen måste först få ett verifierat slutresultat.")
    if reason == OfferCredit.Reason.JOB_CLOSED:
        raise ValidationError("Denna kredit skapas endast automatiskt efter verifierad betalning.")
    charge = PlatformCharge.objects.filter(offer=offer, kind="offer_fee", status="paid").first()
    if not charge or not (charge.amount > 0 or charge.fulfilled_at):
        raise ValidationError("Ingen betald eller förbrukad offert finns att ersätta.")
    if OfferCredit.objects.filter(source_offer=offer).exists():
        raise ValidationError("En ersättningskredit har redan utfärdats för denna offert.")
    if reason == OfferCredit.Reason.TECHNICAL_FAILURE and offer.versions.filter(is_signed=True).exists():
        raise ValidationError("Teknisk ersättning gäller en betald offert som inte kunde skickas.")


@transaction.atomic
def issue_credit(*, offer, reason, evidence, actor):
    if not actor.is_staff or not actor.has_perm("payments.issue_offer_credit"):
        raise PermissionDenied()
    Company.objects.select_for_update().get(pk=offer.company_id)
    validate_credit_source(offer, reason, evidence)
    return OfferCredit.objects.create(company=offer.company, source_offer=offer, reason=reason,
                                      evidence=evidence.strip(), issued_by=actor)


@transaction.atomic
def compensate_closed_offer(offer_id):
    """Lock in the same order as sending. Never compensate an already sent offer."""
    from offers.models import Offer
    from jobrequests.models import JobRequest
    candidate = Offer.objects.get(pk=offer_id)
    Company.objects.select_for_update().get(pk=candidate.company_id)
    job = JobRequest.objects.select_for_update().get(pk=candidate.job_request_id)
    offer = Offer.objects.select_for_update().get(pk=offer_id)
    if job.is_active and not job.is_deleted:
        return None
    if offer.versions.filter(is_signed=True).exists():
        return None
    if PlatformCharge.objects.filter(offer=offer, checkouts__status="pending").exists():
        return None
    charge = PlatformCharge.objects.filter(offer=offer, kind="offer_fee", status="paid", amount__gt=0).first()
    if not charge:
        return None
    credit, _ = OfferCredit.objects.get_or_create(source_offer=offer, defaults={
        "company_id": offer.company_id, "reason": OfferCredit.Reason.JOB_CLOSED,
        "evidence": f"Automatic: verified charge {charge.pk}; job {job.pk} closed; no signed offer.",
        "issued_by": None,
    })
    return credit


def compensate_closed_jobs():
    from .models import PlatformCharge
    from django.db.models import Q
    ids = PlatformCharge.objects.filter(kind="offer_fee", status="paid", amount__gt=0,
        offer__compensation_credit__isnull=True).filter(
        Q(offer__job_request__is_active=False) | Q(offer__job_request__is_deleted=True)
    ).values_list("offer_id", flat=True).distinct()
    return sum(compensate_closed_offer(pk) is not None for pk in ids)


def compensate_job_offers(job_id):
    ids = PlatformCharge.objects.filter(offer__job_request_id=job_id, kind="offer_fee",
        status="paid", amount__gt=0, offer__compensation_credit__isnull=True).values_list("offer_id", flat=True)
    for offer_id in ids:
        compensate_closed_offer(offer_id)
