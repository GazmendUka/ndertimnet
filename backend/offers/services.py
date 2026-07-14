from django.db import transaction
from django.utils import timezone

from jobrequests.models import JobRequest, JobRequestAudit
from leads.models import ArchivedJob
from payments.models import LeadAccess

from .models import Offer, OfferChatUnlock, OfferStatus, UnlockType


class OfferAcceptanceError(Exception):
    pass


def accept_offer(*, offer_id, customer):
    """Accept an offer and close its job in one transaction.

    This is the single source of truth used by both acceptance API routes.
    """
    with transaction.atomic():
        try:
            job_id = Offer.objects.only("job_request_id").get(pk=offer_id).job_request_id
        except Offer.DoesNotExist as exc:
            raise OfferAcceptanceError("Oferta nuk u gjet.") from exc

        job = JobRequest.objects.select_for_update().select_related(
            "city", "profession"
        ).get(pk=job_id)
        offer = Offer.objects.select_for_update().select_related(
            "company", "current_version"
        ).get(pk=offer_id, job_request=job)

        if job.customer_id != customer.id:
            raise OfferAcceptanceError("Kjo ofertë nuk është e juaja.")

        # Retrying the same successful request is safe and creates no duplicates.
        if job.winner_offer_id:
            if job.winner_offer_id == offer.id and offer.status == OfferStatus.ACCEPTED:
                return offer, job
            raise OfferAcceptanceError("Kjo kërkesë ka tashmë një ofertë fituese.")

        if offer.status == OfferStatus.REJECTED:
            raise OfferAcceptanceError("Nuk mund të pranoni një ofertë të refuzuar.")
        if not offer.current_version or not offer.current_version.is_signed:
            raise OfferAcceptanceError("Oferta duhet të jetë e nënshkruar para pranimit.")

        now = timezone.now()
        offer.status = OfferStatus.ACCEPTED
        offer.accepted_at = now
        offer.lead_unlocked = True
        offer.save(update_fields=["status", "accepted_at", "lead_unlocked", "updated_at"])

        Offer.objects.filter(job_request=job).exclude(id=offer.id).exclude(
            status__in=[OfferStatus.REJECTED, OfferStatus.DRAFT]
        ).update(
            status=OfferStatus.REJECTED,
            rejected_at=now,
            updated_at=now,
        )

        price = offer.current_version.price_amount
        job.winner_company = offer.company
        job.winner_price = price if price is not None else job.budget
        job.winner_offer = offer
        job.status = "completed"
        job.is_completed = True
        job.is_active = False
        job.save(update_fields=[
            "winner_company",
            "winner_price",
            "winner_offer",
            "status",
            "is_completed",
            "is_active",
            "updated_at",
        ])

        LeadAccess.objects.get_or_create(company=offer.company, job_request=job)
        OfferChatUnlock.objects.get_or_create(
            offer=offer,
            unlock_type=UnlockType.AFTER_ACCEPT,
            defaults={"amount": 0, "currency": "EUR", "created_by": customer},
        )

        ArchivedJob.objects.create(
            title=job.title,
            description=job.description,
            category=job.profession.name if job.profession else "",
            location=job.city.name,
            date_accepted=now,
            price=price if price is not None else (job.budget or 0),
            company=offer.company,
        )

        JobRequestAudit.objects.bulk_create([
            JobRequestAudit(
                job_request=job,
                company=offer.company,
                action="offer_accepted",
                message="Klienti pranoi ofertën.",
            ),
            JobRequestAudit(
                job_request=job,
                company=offer.company,
                action="winner_selected",
                message="Kompania u zgjodh si fituese.",
            ),
            JobRequestAudit(
                job_request=job,
                company=offer.company,
                action="job_closed",
                message="Kërkesa u mbyll pas pranimit të ofertës.",
            ),
        ])

        return offer, job
