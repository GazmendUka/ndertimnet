from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db import models
from leads.models import JobRequest
import os


class Command(BaseCommand):
    help = "Kollar vilka jobb som ska öppnas igen efter 5 dagar från sista offert"

    def handle(self, *args, **options):
        now = timezone.now()
        five_days_ago = now - timedelta(days=5)

        # Skapa loggmapp om den inte finns
        log_dir = os.path.join("logs")
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, "reopened_jobs.log")

        # 🧹 Rensa gamla loggar (äldre än 60 dagar)
        if os.path.exists(log_path):
            with open(log_path, "r") as f:
                lines = f.readlines()

            cutoff_date = timezone.now() - timedelta(days=60)
            filtered_lines = []
            keep = False

            for line in lines:
                if "📅 Körning:" in line:
                    # extrahera datum
                    date_str = line.replace("📅 Körning:", "").strip()
                    try:
                        run_date = timezone.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                        run_date = timezone.make_aware(run_date)
                        keep = run_date >= cutoff_date
                    except Exception:
                        keep = True
                if keep:
                    filtered_lines.append(line)

            with open(log_path, "w") as f:
                f.writelines(filtered_lines)

        # Annotera antalet offerter per jobb (undvik namnkonflikt med @property)
        candidates = (
            JobRequest.objects.annotate(annotated_offers=models.Count("matches"))
            .filter(
                is_completed=False,
                is_reopened=False,
                last_offer_at__lte=five_days_ago,
                annotated_offers__gte=models.F("max_offers"),
            )
        )

        reopened_count = 0
        log_entries = []

        for job in candidates:
            job.max_offers += 3
            job.is_reopened = True
            job.reopened_at = timezone.now()  # 👈 loggar när jobbet öppnades igen
            job.save(update_fields=["max_offers", "is_reopened", "reopened_at"])
            reopened_count += 1

            log_entries.append(
                f" - Jobb: '{job.title}' ({job.location}) återöppnades "
                f"— nya max_offers = {job.max_offers}, reopened_at = {job.reopened_at.strftime('%Y-%m-%d %H:%M:%S')}"
            )


        # 🧾 Skriv ut logg till fil med separatorer
        with open(log_path, "a") as log_file:
            log_file.write("\n" + "=" * 70 + "\n")
            log_file.write(f"📅 Körning: {now.strftime('%Y-%m-%d %H:%M:%S')}\n")
            log_file.write("-" * 70 + "\n")

            if log_entries:
                for entry in log_entries:
                    log_file.write(entry + "\n")
            else:
                log_file.write("Inga jobb återöppnades denna gång.\n")

            log_file.write("-" * 70 + "\n")
            log_file.write(f"Totalt återöppnade jobb: {reopened_count}\n")
            log_file.write("=" * 70 + "\n\n")

        self.stdout.write(self.style.SUCCESS(
            f"✅ {reopened_count} jobb återöppnades för fler offerter. Loggat till {log_path}"
        ))
