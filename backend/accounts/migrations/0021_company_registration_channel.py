from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0020_company_introductory_offers_granted_userblock")]
    operations = [migrations.AddField(model_name="company", name="registration_channel",
        field=models.CharField(max_length=10, choices=[("unknown", "E panjohur"), ("web", "Faqja e internetit"), ("ios", "Aplikacioni iPhone"), ("android", "Aplikacioni Android")], default="unknown", editable=False))]
