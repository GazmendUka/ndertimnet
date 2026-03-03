from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobrequests', '0006_jobrequest_deleted_at_jobrequest_is_deleted_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobrequest',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='jobrequest',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]