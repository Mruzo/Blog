from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0021_ad_event_fraud_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='adplacement',
            name='slot_name',
            field=models.CharField(db_index=True, default='ed_bb', max_length=64),
        ),
    ]
