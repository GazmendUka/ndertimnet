import os
import sys
from django.core.management.base import BaseCommand
from django.utils import timezone
from leads.models import JobRequest, ArchivedJob


class Command(BaseCommand):
    help = "Rensar gamla jobb: arkiverar accepterade och tar bort inaktiva"

    def handle(self, *args, **options):
        now = timezone.now()

        # 🔹 Säkerställ att loggmapp och fil finns
        log_dir = os.path.join(os.path.dirname(__file__), "../../../../logs")
        log_dir = os.path.abspath(log_dir)
        log_file = os.path.join(log_dir, "cleanup.log")

        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

        if not os.path.exists(log_file):
            open(log_file, "w").close()

        # 🔹 Steg 1: Arkivera slutförda jobb (accepterade)
        completed_jobs = JobRequest.objects.filter(
            is_completed=True,
            accepted_company__isnull=False
        )

        archived_count = 0
        for job in completed_jobs:
            ArchivedJob.objects.create(
                title=job.title,
                description=job.description,
                category="Okänd",
                location=job.location,
                date_accepted=job.created_at,
                size="okänd",
                price=job.accepted_price or 0,
                company=job.accepted_company
            )
            job.delete()
            archived_count += 1

        # 🔹 Steg 2: Ta bort utgångna jobb (som inte accepterats)
        expired_jobs = JobRequest.objects.filter(
            expires_at__lt=now,
            is_completed=False
        )
        expired_count = expired_jobs.count()
        expired_jobs.delete()

        # 🔹 Loggning med tidsstämpel
        timestamp = now.strftime("[%Y-%m-%d %H:%M:%S]")
        log_message = f"{timestamp} ✅ Rensning klar: {archived_count} arkiverade, {expired_count} borttagna jobb.\n"

        # 🔹 Skriv till loggfil
        with open(log_file, "a") as f:
            f.write(log_message)

        # 🔹 Begränsa loggfilen till de senaste 60 körningarna
        with open(log_file, "r") as f:
            lines = f.readlines()

        if len(lines) > 60:
            with open(log_file, "w") as f:
                f.writelines(lines[-60:])  # spara bara de senaste 60 raderna

        # 🔹 Skriv ut till terminal
        self.stdout.write(self.style.SUCCESS(log_message.strip()))
        sys.stdout.flush()
