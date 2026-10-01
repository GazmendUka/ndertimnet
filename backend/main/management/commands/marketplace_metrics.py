import json
from django.core.management.base import BaseCommand
from main.marketplace_metrics import marketplace_metrics


class Command(BaseCommand):
    help = "Print aggregate marketplace funnel metrics without personal information."
    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, choices=(7, 30, 90, 365), default=30)
    def handle(self, *args, **options):
        self.stdout.write(json.dumps(marketplace_metrics(options["days"]), indent=2))
