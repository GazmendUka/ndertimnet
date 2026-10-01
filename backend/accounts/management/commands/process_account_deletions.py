from django.core.management.base import BaseCommand
from datetime import timedelta
from django.utils import timezone
from accounts.models import AccountDeletionRequest, AccountFileErasure
from accounts.services.deletion import process_deletion, erase_file


class Command(BaseCommand):
    help = "Process confirmed account erasure requests; protected business records go to review."
    def handle(self, *args, **options):
        ids = list(AccountDeletionRequest.objects.filter(status__in=["requested", "erasing_files"]).values_list("pk", flat=True)[:100])
        for pk in ids:
            process_deletion(pk)
        for pk in AccountFileErasure.objects.filter(request__isnull=True, completed_at__isnull=True).values_list("pk", flat=True)[:100]:
            erase_file(pk)
        AccountFileErasure.objects.filter(request__isnull=True, completed_at__lt=timezone.now()-timedelta(days=30)).delete()
        self.stdout.write(f"Processed {len(ids)} requests. Review queue: {AccountDeletionRequest.objects.filter(status='needs_review').count()}")
