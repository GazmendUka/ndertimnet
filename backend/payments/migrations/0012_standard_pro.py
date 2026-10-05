import calendar
from datetime import date
from zoneinfo import ZoneInfo
from django.utils import timezone
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_plans(apps, schema_editor):
    Subscription = apps.get_model("payments", "BillingSubscription")
    Period = apps.get_model("payments", "BillingPeriod")
    now = timezone.now()
    regular = now.astimezone(ZoneInfo("Europe/Stockholm")).date() >= date(2027, 1, 1)
    for sub in Subscription.objects.using(schema_editor.connection.alias).all().iterator():
        Period.objects.using(schema_editor.connection.alias).filter(subscription=sub).update(plan_code=sub.plan_code, monthly_offers=sub.monthly_offers)
        if sub.plan_code in ("offers_3", "offers_5", "offers_7"):
            sub.plan_code = "pro" if sub.plan_code == "offers_7" else "standard"
            sub.monthly_offers = 30 if sub.plan_code == "pro" else 10
            sub.monthly_price = (79 if regular else 59) if sub.plan_code == "pro" else (49 if regular else 29)
            sub.save(using=schema_editor.connection.alias, update_fields=["plan_code", "monthly_offers", "monthly_price"])
            if sub.started_at and sub.canceled_at and sub.ends_at and sub.ends_at > now:
                number = 1
                while True:
                    index = sub.started_at.year * 12 + sub.started_at.month - 1 + number
                    year, zero_month = divmod(index, 12)
                    month = zero_month + 1
                    boundary = sub.started_at.replace(year=year, month=month, day=min(sub.started_at.day, calendar.monthrange(year, month)[1]))
                    if boundary > now:
                        break
                    number += 1
                sub.ends_at = min(sub.ends_at, boundary)
                sub.save(using=schema_editor.connection.alias, update_fields=["ends_at"])
            if not sub.started_at:
                Period.objects.using(schema_editor.connection.alias).filter(subscription=sub).update(plan_code=sub.plan_code, monthly_offers=sub.monthly_offers)


class Migration(migrations.Migration):
    dependencies = [("payments", "0011_platformcheckout_last_checked_at_and_more"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.AlterField(model_name="billingsubscription", name="terms_version", field=models.CharField(max_length=40, default="2026-10-05-standard-pro-v1")),
        migrations.AddField(model_name="billingsubscription", name="pending_plan_code", field=models.CharField(max_length=32, blank=True)),
        migrations.AddField(model_name="billingsubscription", name="pending_plan_at", field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name="billingperiod", name="monthly_offers", field=models.PositiveSmallIntegerField(default=0)),
        migrations.AddField(model_name="billingperiod", name="plan_code", field=models.CharField(max_length=32, blank=True)),
        migrations.CreateModel(name="SubscriptionPlanChange", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("plan_code", models.CharField(max_length=32)),
            ("effective_at", models.DateTimeField()),
            ("signer_name", models.CharField(max_length=200)),
            ("text", models.TextField()),
            ("version", models.CharField(max_length=80)),
            ("sha256", models.CharField(max_length=64)),
            ("signed_at", models.DateTimeField(auto_now_add=True)),
            ("signed_by", models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.PROTECT)),
            ("subscription", models.ForeignKey(to="payments.billingsubscription", related_name="plan_changes", on_delete=django.db.models.deletion.PROTECT)),
        ]),
        migrations.RunPython(migrate_plans, migrations.RunPython.noop),
    ]
