"""Business aggregates only: no identities, descriptions or tracking cookies."""
from datetime import timedelta
from decimal import Decimal
from django.db.models import Count, Min, Q, Sum
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from jobrequests.models import JobRequest, JobRequestDraft
from offers.models import Offer
from payments.models import PlatformCharge


def marketplace_metrics(days=30):
    since = timezone.now() - timedelta(days=days)
    jobs = JobRequest.objects.filter(created_at__gte=since, is_deleted=False)
    drafts = JobRequestDraft.objects.filter(created_at__gte=since)
    published = jobs.filter(moderation_status=JobRequest.MODERATION_APPROVED)
    sent = Offer.objects.filter(job_request__in=published, versions__is_signed=True).distinct()
    published_count = published.count()
    covered = published.filter(offers__in=sent).distinct().count()
    # signed_at measures the first actual send, not creation of an offer draft.
    delays = []
    for job in published.annotate(first_offer=Min("offers__versions__signed_at", filter=Q(offers__versions__is_signed=True))):
        if job.first_offer and job.published_at and job.first_offer >= job.published_at:
            delays.append((job.first_offer - job.published_at).total_seconds() / 3600)
    accepted = published.filter(winner_offer__isnull=False).count()
    complete = published.filter(is_completed=True).count()
    charges = PlatformCharge.objects.filter(offer__in=sent, status="paid", currency="EUR")
    fees = charges.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    draft_total = drafts.count()
    submitted = drafts.filter(is_submitted=True).count()
    return {
        "window_days": days, "since": since.isoformat(), "generated_at": timezone.now().isoformat(),
        "drafts_started": draft_total, "drafts_submitted": submitted,
        "draft_submission_percent": round(100 * submitted / draft_total, 1) if draft_total else None,
        "drafts_with_linked_job": drafts.filter(submitted_job__isnull=False).count(),
        "jobs_created": jobs.count(), "jobs_published": published_count,
        "jobs_with_offer": covered, "offer_coverage_percent": round(100 * covered / published_count, 1) if published_count else None,
        "mean_hours_to_first_offer": round(sum(delays) / len(delays), 2) if delays else None,
        "first_offer_sample_size": len(delays), "offers_sent": sent.count(),
        "jobs_with_accepted_offer": accepted, "jobs_completed": complete,
        "offer_fees_eur": str(fees),
        "offer_fees_per_won_job_eur": str(round(fees / accepted, 2)) if accepted else None,
        "returning_companies": sent.values("company_id").annotate(jobs=Count("job_request", distinct=True)).filter(jobs__gte=2).count(),
        "notes": ["Job cohort: jobs created in this window; outcomes may happen later.",
                  "Draft cohort excludes anonymous browser drafts. Deleted records are excluded.",
                  "Fees exclude subscriptions, credits and refunds; not total acquisition cost.",
                  "Historical drafts may lack a linked job. No visitor tracking is installed."],
    }


class MarketplaceMetricsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({"detail": "Administrator access required."}, status=403)
        value = request.query_params.get("days", "30")
        if value not in ("7", "30", "90", "365"):
            return Response({"detail": "days must be 7, 30, 90 or 365"}, status=400)
        return Response(marketplace_metrics(int(value)))
