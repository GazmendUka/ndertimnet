from django.db import transaction
from django.utils import timezone

from jobrequests.models import JobRequest, JobRequestAudit
from leads.models import ArchivedJob
from payments.models import LeadAccess

from .models import Offer, OfferChatUnlock, OfferStatus, UnlockType


class OfferAcceptanceError(Exception):
    pass


def notify_decision(offer, decision, version_id):
    from pushnotifications.services import schedule_push_notification
    schedule_push_notification(user=offer.company.user, category="offer_updates",
        title="Përditësim i ofertës",
        body="Klienti e pranoi ofertën tuaj." if decision == "accept" else "Klienti nuk e pranoi ofertën tuaj.",
        data={"type": f"offer_{decision}", "offer_id": offer.pk, "path": f"/company/offers/{offer.pk}"},
        event_key=f"decision:{offer.pk}:{version_id}:{decision}")


def accept_offer(*, offer_id, customer, version_id=None):
    """Accept an offer and close its job in one transaction.

    This is the single source of truth used by both acceptance API routes.
    """
    with transaction.atomic():
        try:
            job_id = Offer.objects.only("job_request_id").get(pk=offer_id).job_request_id
        except Offer.DoesNotExist as exc:
            raise OfferAcceptanceError("Oferta nuk u gjet.") from exc

        job = JobRequest.objects.select_for_update(of=("self",)).select_related(
            "city", "profession"
        ).get(pk=job_id)
        offer = Offer.objects.select_for_update(of=("self",)).select_related(
            "company", "current_version"
        ).get(pk=offer_id, job_request=job)

        if job.customer_id != customer.id:
            raise OfferAcceptanceError("Kjo ofertë nuk është e juaja.")

        # Retrying the same successful request is safe and creates no duplicates.
        if job.winner_offer_id:
            if job.winner_offer_id == offer.id and offer.status == OfferStatus.ACCEPTED:
                if version_id is None or version_id == offer.accepted_version_id:
                    return offer, job
                version = offer.customer_version()
                if not version or version.pk != version_id or version.customer_rejected_at:
                    raise OfferAcceptanceError("Versioni ka ndryshuar. Hapni ofertën përsëri.")
                offer.accepted_version = version
                offer.save(update_fields=["accepted_version", "updated_at"])
                version.customer_accepted_at = timezone.now()
                version.save(update_fields=["customer_accepted_at"])
                job.winner_price = version.estimated_total
                job.save(update_fields=["winner_price", "updated_at"])
                JobRequestAudit.objects.create(job_request=job, company=offer.company,
                    action="offer_accepted", message=f"Klienti pranoi ndryshimin v{version.version_number}.")
                from jobrequests.activity import record_customer_activity
                record_customer_activity(job.pk)
                notify_decision(offer, "accept", version.pk)
                return offer, job
            raise OfferAcceptanceError("Kjo kërkesë ka tashmë një ofertë fituese.")

        if version_id is not None and version_id != offer.current_version_id:
            raise OfferAcceptanceError("Versioni ka ndryshuar. Hapni ofertën përsëri.")
        if not job.is_active or job.is_deleted:
            raise OfferAcceptanceError("Kërkesa nuk është aktive.")
        if offer.status == OfferStatus.REJECTED:
            raise OfferAcceptanceError("Nuk mund të pranoni një ofertë të refuzuar.")
        if not offer.current_version or not offer.current_version.is_signed:
            raise OfferAcceptanceError("Oferta duhet të jetë e nënshkruar para pranimit.")

        now = timezone.now()
        offer.status = OfferStatus.ACCEPTED
        offer.accepted_at = now
        offer.accepted_version = offer.current_version
        offer.current_version.customer_accepted_at = now
        offer.current_version.save(update_fields=["customer_accepted_at"])
        offer.lead_unlocked = True
        offer.save(update_fields=["status", "accepted_at", "accepted_version", "lead_unlocked", "updated_at"])

        Offer.objects.filter(job_request=job).exclude(id=offer.id).exclude(
            status__in=[OfferStatus.REJECTED, OfferStatus.DRAFT]
        ).update(
            status=OfferStatus.REJECTED,
            rejected_at=now,
            updated_at=now,
        )

        price = offer.current_version.estimated_total
        job.winner_company = offer.company
        job.winner_price = price if price is not None else job.budget
        job.winner_offer = offer
        job.status = "in_progress"
        job.is_completed = False
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

        from payments.credits import compensate_job_offers
        transaction.on_commit(lambda: compensate_job_offers(job.pk), robust=True)
        notify_decision(offer, "accept", offer.accepted_version_id)
        return offer, job


def decide_version(*, offer_id, customer, version_id, decision):
    from jobrequests.activity import record_customer_activity
    if decision == "accept":
        offer, _ = accept_offer(offer_id=offer_id, customer=customer, version_id=version_id)
        record_customer_activity(offer.job_request_id)
        return offer
    with transaction.atomic():
        job_id = Offer.objects.values_list("job_request_id", flat=True).get(pk=offer_id)
        job = JobRequest.objects.select_for_update().get(pk=job_id)
        offer = Offer.objects.select_for_update().get(pk=offer_id)
        if job.customer_id != customer.pk:
            raise OfferAcceptanceError("Kjo ofertë nuk është e juaja.")
        version = offer.versions.filter(pk=version_id, is_signed=True).first()
        latest = offer.versions.filter(is_signed=True).first()
        if not version or not latest or version.pk != latest.pk or version.pk == offer.accepted_version_id:
            raise OfferAcceptanceError("Versioni nuk mund të refuzohet. Hapni ofertën përsëri.")
        if not version.customer_rejected_at:
            version.customer_rejected_at = timezone.now()
            version.save(update_fields=["customer_rejected_at"])
            notify_decision(offer, "reject", version.pk)
        if offer.status != OfferStatus.ACCEPTED:
            offer.status = OfferStatus.REJECTED
            offer.rejected_at = timezone.now()
            offer.save(update_fields=["status", "rejected_at", "updated_at"])
        record_customer_activity(job.pk)
        return offer
