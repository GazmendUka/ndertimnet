from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0002_seed_platform_updates"),
    ]

    operations = [
        migrations.AddField(
            model_name="platformupdate",
            name="body",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="platformupdate",
            name="is_clickable",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="platformupdate",
            name="slug",
            field=models.SlugField(blank=True, max_length=220, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="platformupdate",
            name="summary",
            field=models.TextField(blank=True),
        ),
    ]
