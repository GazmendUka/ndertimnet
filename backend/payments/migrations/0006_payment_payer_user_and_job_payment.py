from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("payments", "0005_payment_checkout_tracking"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="payer_user",
            field=models.ForeignKey(
                blank=True,
                help_text="User who initiated the payment, when applicable.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payments_made",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="payment",
            name="type",
            field=models.CharField(
                choices=[
                    ("unlock_lead", "Unlock lead"),
                    ("unlock_chat", "Unlock chat"),
                    ("job_payment", "Job payment"),
                ],
                max_length=20,
            ),
        ),
    ]
