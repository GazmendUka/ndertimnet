from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0004_alter_payment_provider"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="checkout_url",
            field=models.URLField(blank=True, max_length=1000),
        ),
        migrations.AddField(
            model_name="payment",
            name="failure_code",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="payment",
            name="provider_session_id",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="payment",
            name="provider_transaction_id",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="payment",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name="payment",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("paid", "Paid"),
                    ("failed", "Failed"),
                    ("canceled", "Canceled"),
                    ("refunded", "Refunded"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
