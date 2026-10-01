from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('snmov', '0034_restore_saved_address_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='fulfillment_method',
            field=models.CharField(
                choices=[('ship', 'Ship'), ('pickup', 'In-person pickup')],
                default='ship',
                help_text='Ship via Canada Post, or pay in the app and hand the order to the customer in person.',
                max_length=16,
            ),
        ),
    ]
