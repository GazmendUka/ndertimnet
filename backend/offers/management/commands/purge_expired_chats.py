from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone
from offers.models import Offer, OfferMessage, ChatReviewAccess
from leads.models import LeadMessage
from payments.billing import add_months


class Command(BaseCommand):
    help = "Delete closed chat histories older than six calendar months; dry-run unless --apply."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, **options):
        cutoff = add_months(timezone.now(), -6)
        ids = Offer.objects.filter(chat_retention_hold=False).filter(
            Q(status="rejected") | Q(job_request__completed_at__isnull=False) |
            Q(job_request__winner_offer__isnull=True, job_request__is_active=False)
        ).values_list("pk", flat=True)
        total = 0
        for pk in ids.iterator():
            with transaction.atomic():
                offer = Offer.objects.select_for_update().get(pk=pk)
                job = offer.job_request
                if offer.chat_retention_hold or not (offer.status == "rejected" or job.completed_at or (not job.winner_offer_id and not job.is_active)):
                    continue
                modern = OfferMessage.objects.filter(offer=offer)
                legacy = LeadMessage.objects.filter(lead__company=offer.company, lead__job_request=offer.job_request)
                latest = [v for v in (modern.aggregate(v=Max("created_at"))["v"], legacy.aggregate(v=Max("created_at"))["v"]) if v]
                if job.completed_at:
                    latest.append(job.completed_at)
                if not latest or max(latest) >= cutoff:
                    continue
                total += modern.count() + legacy.count()
                if options["apply"]:
                    modern.delete()
                    legacy.delete()
        if options["apply"]:
            ChatReviewAccess.objects.filter(accessed_at__lt=cutoff).delete()
        self.stdout.write(f"{'Deleted' if options['apply'] else 'Would delete'} {total} messages.")
