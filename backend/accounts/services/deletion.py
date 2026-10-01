"""Account erasure with a review queue for protected business records.

No retention period is invented here. Accounts with contracts, charges or other
protected references need a documented retention decision before final erasure.
"""
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from accounts.models import User, Company, AccountDeletionRequest, AccountFileErasure, EmailVerificationToken
from offers.models import Offer
from payments.models import PlatformCharge, BillingSubscription, Payment
from leads.models import LeadMatch, LeadMessage, ArchivedJob


@transaction.atomic
def request_deletion(user):
    user = User.objects.select_for_update().get(pk=user.pk)
    if user.is_staff or user.is_superuser:
        raise PermissionDenied("Llogaritë administrative menaxhohen nga administratori.")
    request, _ = AccountDeletionRequest.objects.get_or_create(user=user)
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
    EmailVerificationToken.objects.filter(user=user).delete()
    user.notification_devices.all().delete()
    from pushnotifications.models import NotificationEvent
    NotificationEvent.objects.filter(user=user).delete()
    user.is_active = False
    user.email_verified = False
    user.email_verified_at = None
    user.set_unusable_password()
    user.save(update_fields=["is_active", "email_verified", "email_verified_at", "password"])
    Company.objects.filter(user=user).update(is_active=False, archived_at=timezone.now())
    from jobrequests.models import JobRequest
    JobRequest.objects.filter(customer=user, winner_offer__isnull=True).update(is_active=False)
    return request


def erase_file(file_id):
    """A durable file task also supports removal of individual portfolio items."""
    with transaction.atomic():
        file = AccountFileErasure.objects.select_for_update().get(pk=file_id)
        if file.completed_at:
            return
        try:
            default_storage.delete(file.name)
        except Exception:
            return
        file.name = ""
        file.completed_at = timezone.now()
        file.save(update_fields=["name", "completed_at"])


def process_deletion(request_id):
    with transaction.atomic():
        request = AccountDeletionRequest.objects.select_for_update().get(pk=request_id)
        if request.status == "completed":
            return
        if request.user_id:
            user = User.objects.select_for_update().get(pk=request.user_id)
            # Do not cascade through anyone's business history without a retention review.
            related_offers = Offer.objects.filter(Q(company__user=user) | Q(job_request__customer=user))
            protected = (related_offers.exists() or PlatformCharge.objects.filter(payer=user).exists()
                         or BillingSubscription.objects.filter(company__user=user).exists()
                         or Payment.objects.filter(Q(payer_user=user) | Q(company__user=user)).exists()
                         or LeadMatch.objects.filter(Q(company__user=user) | Q(job_request__customer=user)).exists()
                         or LeadMessage.objects.filter(Q(sender_company__user=user) | Q(sender_customer__user=user)).exists()
                         or ArchivedJob.objects.filter(company__user=user).exists())
            if protected:
                request.status, request.reason = "needs_review", "business_records_require_retention_review"
                request.save(update_fields=["status", "reason"])
                return
            try:
                with transaction.atomic():
                    company = Company.objects.filter(user=user).first()
                    if company:
                        names = [company.logo.name, company.registration_document.name]
                        names += list(company.portfolio_projects.values_list("image", flat=True))
                        AccountFileErasure.objects.bulk_create([AccountFileErasure(request=request, name=n) for n in names if n])
                        company.delete()
                    user.delete()
            except ProtectedError:
                request.status, request.reason = "needs_review", "protected_related_records"
                request.save(update_fields=["status", "reason"])
                return
            request.user = None
            request.status, request.reason = "erasing_files", ""
            request.save(update_fields=["user", "status", "reason"])
    # Storage is external to SQL. Persist file tasks before deleting, retry failures.
    for file_id in AccountFileErasure.objects.filter(request_id=request_id, completed_at__isnull=True).values_list("pk", flat=True):
        erase_file(file_id)
    with transaction.atomic():
        request = AccountDeletionRequest.objects.select_for_update().get(pk=request_id)
        if not request.user_id and not request.files.filter(completed_at__isnull=True).exists():
            request.status = "completed"
            request.completed_at = timezone.now()
            request.save(update_fields=["status", "completed_at"])
