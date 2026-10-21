import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0019_no_new_introductory_offers'),
        ('main', '0006_contactsubmissionguard'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='heroadvertisement',
            name='company',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='marketing_campaigns', to='accounts.company', verbose_name='Kompania'),
        ),
        migrations.AddField(
            model_name='heroadvertisement',
            name='cta_text',
            field=models.CharField(default='Mëso më shumë', max_length=40, verbose_name='Teksti i butonit'),
        ),
        migrations.AddField(
            model_name='heroadvertisement',
            name='duration_days',
            field=models.PositiveSmallIntegerField(choices=[(3, '3 ditë'), (7, '7 ditë'), (14, '14 ditë')], default=7, verbose_name='Ditët e kërkuara'),
        ),
        migrations.AddField(
            model_name='heroadvertisement',
            name='review_note',
            field=models.TextField(blank=True, max_length=2000, verbose_name='Arsyeja / komenti për kompaninë'),
        ),
        migrations.AddField(
            model_name='heroadvertisement',
            name='review_status',
            field=models.CharField(choices=[('pending', 'Në pritje të miratimit'), ('approved', 'E miratuar'), ('rejected', 'E refuzuar'), ('paused', 'E pezulluar'), ('withdrawn', 'E tërhequr')], default='approved', max_length=16, verbose_name='Shqyrtimi'),
        ),
        migrations.AddField(
            model_name='heroadvertisement',
            name='reviewed_at',
            field=models.DateTimeField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='heroadvertisement',
            name='reviewed_by',
            field=models.ForeignKey(blank=True, editable=False, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_campaigns', to=settings.AUTH_USER_MODEL),
        ),
    ]
