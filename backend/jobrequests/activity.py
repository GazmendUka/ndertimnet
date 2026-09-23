from django.utils import timezone
from .models import JobRequest


def record_customer_activity(job_id):
    JobRequest.objects.filter(pk=job_id).update(customer_activity_at=timezone.now(), inactive_marked_at=None)
