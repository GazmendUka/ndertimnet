from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0003_platform_update_detail_page"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="platformupdate",
            options={
                "ordering": ("status", "display_order", "-created_at"),
                "verbose_name": "Përditësim platforme",
                "verbose_name_plural": "Përditësime platforme",
            },
        ),
    ]
