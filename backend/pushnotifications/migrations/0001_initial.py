from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationPreference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("push_enabled", models.BooleanField(default=True)),
                ("chat_messages", models.BooleanField(default=True)),
                ("offer_updates", models.BooleanField(default=True)),
                ("payment_updates", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="notification_preference", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="NotificationDevice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.CharField(max_length=512, unique=True)),
                ("device_id", models.CharField(blank=True, db_index=True, max_length=64)),
                ("platform", models.CharField(choices=[("android", "Android"), ("ios", "iOS")], max_length=10)),
                ("active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_devices", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-last_seen_at"]},
        ),
        migrations.AddIndex(
            model_name="notificationdevice",
            index=models.Index(fields=["user", "active"], name="pushnotific_user_id_171604_idx"),
        ),
    ]
