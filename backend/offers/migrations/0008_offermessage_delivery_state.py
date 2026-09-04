from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("offers", "0007_offerreview_moderation_status_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="offermessage",
            name="client_message_id",
            field=models.UUIDField(blank=True, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="offermessage",
            name="read_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddIndex(
            model_name="offermessage",
            index=models.Index(fields=["offer", "read_at"], name="offers_offe_offer_i_142453_idx"),
        ),
    ]
