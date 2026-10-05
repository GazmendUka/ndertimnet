from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("accounts", "0018_accountdeletionrequest_accountfileerasure_and_more")]
    operations = [migrations.AlterField(model_name="company", name="free_offers_remaining", field=models.PositiveIntegerField(default=0, help_text="One-time introductory allowance; consumed only when an offer is sent."))]
