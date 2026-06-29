from django.db import migrations


INITIAL_UPDATES = [
    {
        "title": "Përmirësime sigurie për faqet publike",
        "date_label": "Prill 2026",
        "status": "in_progress",
        "is_new": False,
        "display_order": 10,
    },
    {
        "title": "Përmirësime sigurie për faqet e kyçura",
        "date_label": "Prill 2026",
        "status": "in_progress",
        "is_new": False,
        "display_order": 20,
    },
    {
        "title": "Optimizimi i shpejtësisë së faqes së internetit",
        "date_label": "Prill 2026",
        "status": "in_progress",
        "is_new": False,
        "display_order": 30,
    },
    {
        "title": "Profile të avancuara për kompani",
        "date_label": "Maj 2026",
        "status": "planned",
        "is_new": False,
        "display_order": 10,
    },
    {
        "title": "Sistem vlerësimi dhe review",
        "date_label": "Maj 2026",
        "status": "planned",
        "is_new": False,
        "display_order": 20,
    },
    {
        "title": "Përmirësimi i panelit të kompanisë",
        "date_label": "Maj 2026",
        "status": "planned",
        "is_new": False,
        "display_order": 30,
    },
    {
        "title": "Landing page e re me fokus në ty si përdorues",
        "date_label": "Mars 2026",
        "status": "done",
        "is_new": True,
        "display_order": 10,
    },
    {
        "title": "Faqet për qytete (Prishtinë, Tiranë, etj.)",
        "date_label": "Mars 2026",
        "status": "done",
        "is_new": True,
        "display_order": 20,
    },
    {
        "title": "Përmirësime në login dhe autentikim",
        "date_label": "Mars 2026",
        "status": "done",
        "is_new": False,
        "display_order": 30,
    },
]


def seed_platform_updates(apps, schema_editor):
    PlatformUpdate = apps.get_model("main", "PlatformUpdate")

    for update in INITIAL_UPDATES:
        PlatformUpdate.objects.get_or_create(
            title=update["title"],
            status=update["status"],
            defaults=update,
        )


def unseed_platform_updates(apps, schema_editor):
    PlatformUpdate = apps.get_model("main", "PlatformUpdate")
    titles = [update["title"] for update in INITIAL_UPDATES]
    PlatformUpdate.objects.filter(title__in=titles).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_platform_updates, unseed_platform_updates),
    ]
