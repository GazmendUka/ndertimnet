from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0004_alter_platformupdate_options"),
    ]

    operations = [
        migrations.CreateModel(
            name="HeroAdvertisement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=180, verbose_name="Titulli")),
                ("subtitle", models.CharField(blank=True, max_length=260, verbose_name="Nëntitulli")),
                ("slug", models.SlugField(blank=True, max_length=220, unique=True, verbose_name="Slug")),
                (
                    "background_image",
                    models.ImageField(
                        help_text="Rekomandohet imazh horizontal të paktën 1920 x 900 px. Formatet e pranuara: JPG, PNG ose WebP.",
                        upload_to="hero_advertisements/%Y/%m/",
                        verbose_name="Imazhi i sfondit",
                    ),
                ),
                (
                    "link_type",
                    models.CharField(
                        choices=[("internal", "Faqe e brendshme"), ("external", "Link i jashtëm")],
                        default="internal",
                        max_length=20,
                        verbose_name="Lloji i linkut",
                    ),
                ),
                ("external_url", models.URLField(blank=True, verbose_name="Link i jashtëm")),
                ("is_active", models.BooleanField(default=False, verbose_name="Aktive")),
                ("starts_at", models.DateTimeField(blank=True, null=True, verbose_name="Fillon më")),
                ("ends_at", models.DateTimeField(blank=True, null=True, verbose_name="Përfundon më")),
                ("display_order", models.PositiveIntegerField(default=0, verbose_name="Renditja")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Reklamë hero",
                "verbose_name_plural": "Reklama hero",
                "ordering": ("display_order", "-created_at"),
            },
        ),
        migrations.CreateModel(
            name="HeroAdvertisementSection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(blank=True, max_length=160, verbose_name="Titulli i seksionit")),
                (
                    "body",
                    models.TextField(
                        help_text="Përdorni rreshta bosh për paragrafe. Rreshtat që fillojnë me '-' shfaqen si listë.",
                        verbose_name="Teksti",
                    ),
                ),
                ("display_order", models.PositiveIntegerField(default=0, verbose_name="Renditja")),
                (
                    "advertisement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sections",
                        to="main.heroadvertisement",
                        verbose_name="Reklama",
                    ),
                ),
            ],
            options={
                "verbose_name": "Tekst reklame",
                "verbose_name_plural": "Tekste reklame",
                "ordering": ("display_order", "id"),
            },
        ),
    ]
