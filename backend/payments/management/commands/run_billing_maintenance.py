"""Render schedules use this entry point; PostgreSQL guards overlapping runs."""
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import connection


class Command(BaseCommand):
    help = 'Run the billing reconciliation or daily maintenance group with a process lock.'

    def add_arguments(self, parser):
        parser.add_argument('task', choices=('reconcile', 'daily'))
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        apply = options['apply']
        if not apply:
            self.stdout.write('Dry run: reconcile bank payments every five minutes; prepare periods, remind and purge daily. No bank calls, messages or deletions.')
            return
        if not getattr(settings, 'BILLING_JOBS_ENABLED', False):
            raise CommandError('Enable BILLING_JOBS_ENABLED in the intended environment before applying maintenance.')
        if connection.vendor != 'postgresql':
            raise CommandError('Scheduled billing maintenance requires PostgreSQL.')
        key = 2026092301 if options['task'] == 'reconcile' else 2026092302
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_try_advisory_lock(%s)', [key])
            acquired = cursor.fetchone()[0]
        if not acquired:
            self.stdout.write('A matching maintenance run is already active; skipped.')
            return
        try:
            if options['task'] == 'reconcile':
                call_command('reconcile_payments', apply=True, stdout=self.stdout, stderr=self.stderr)
            else:
                call_command('prepare_billing_periods', stdout=self.stdout, stderr=self.stderr)
                call_command('follow_up_inactive_requests', apply=True, stdout=self.stdout, stderr=self.stderr)
                call_command('purge_expired_chats', apply=True, stdout=self.stdout, stderr=self.stderr)
        finally:
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_unlock(%s)', [key])
