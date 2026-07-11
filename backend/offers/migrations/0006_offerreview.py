from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("offers", "0005_alter_offermessage_created_at_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="OfferReview",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("rating", models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])),
                ("review_text", models.TextField(max_length=2000)),
                ("image", models.ImageField(blank=True, null=True, upload_to="offer_reviews/%Y/%m/")),
                ("recommended", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reviews", to="accounts.company")),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="offer_reviews", to=settings.AUTH_USER_MODEL)),
                ("offer", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="review", to="offers.offer")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="offerreview",
            index=models.Index(fields=["company", "-created_at"], name="offers_offe_company_ce05b1_idx"),
        ),
        migrations.AddIndex(
            model_name="offerreview",
            index=models.Index(fields=["company", "rating"], name="offers_offe_company_13bab3_idx"),
        ),
    ]
