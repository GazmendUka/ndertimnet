from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("pushnotifications", "0001_initial")]
    operations = [
        migrations.AddField(
            model_name="notificationdevice",
            name="firebase_project_id",
            field=models.CharField(blank=True, default="", max_length=63),
        ),
    ]
