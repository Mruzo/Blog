from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0020_ad_machine'),
    ]

    operations = [
        migrations.AddField(
            model_name='adevent',
            name='fraud_reason',
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name='adevent',
            name='ip_hash',
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
        migrations.AddField(
            model_name='adevent',
            name='is_suspicious',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='adevent',
            name='user_agent_hash',
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
        migrations.AddIndex(
            model_name='adevent',
            index=models.Index(fields=['is_suspicious', 'fraud_reason', 'created_at'], name='icvybz_adev_is_susp_58fe9d_idx'),
        ),
    ]
