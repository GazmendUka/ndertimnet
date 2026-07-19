from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0015_user_welcome_email_sent_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="profile_completion_reminder_count",
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
