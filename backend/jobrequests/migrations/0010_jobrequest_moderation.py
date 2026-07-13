from django.conf import settings
from django.db import migrations, models
from django.db.models import F
import django.db.models.deletion


def mark_existing_jobs_approved(apps, schema_editor):
    JobRequest = apps.get_model("jobrequests", "JobRequest")
    JobRequest.objects.all().update(
        moderation_status="approved",
        published_at=F("created_at"),
        submitted_at=F("created_at"),
    )


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("jobrequests", "0009_alter_jobrequest_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="jobrequest",
            name="moderation_note",
            field=models.TextField(blank=True, default="", verbose_name="Meddelande till kunden"),
        ),
        migrations.AddField(
            model_name="jobrequest",
            name="moderation_status",
            field=models.CharField(
                choices=[
                    ("pending", "Under granskning"),
                    ("approved", "Godkänd"),
                    ("changes_requested", "Ändringar krävs"),
                    ("rejected", "Avslagen"),
                    ("blocked", "Blockerad"),
                ],
                db_index=True,
                default="approved",
                max_length=24,
                verbose_name="Granskningsstatus",
            ),
        ),
        migrations.AddField(
            model_name="jobrequest",
            name="moderation_updated_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Senaste granskningsbeslut"),
        ),
        migrations.AddField(
            model_name="jobrequest",
            name="published_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True, verbose_name="Publicerad"),
        ),
        migrations.AddField(
            model_name="jobrequest",
            name="submitted_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Inskickad för granskning"),
        ),
        migrations.CreateModel(
            name="JobRequestModerationEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Under granskning"), ("approved", "Godkänd"), ("changes_requested", "Ändringar krävs"), ("rejected", "Avslagen"), ("blocked", "Blockerad")], max_length=24)),
                ("note", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("job_request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="moderation_events", to="jobrequests.jobrequest")),
                ("moderator", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="job_moderation_events", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.RunPython(mark_existing_jobs_approved, migrations.RunPython.noop),
    ]
