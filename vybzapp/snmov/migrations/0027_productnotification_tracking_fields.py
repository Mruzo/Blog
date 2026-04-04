from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('snmov', '0026_order_checkout_fulfillment_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='productnotification',
            name='notification_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='productnotification',
            name='notification_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
