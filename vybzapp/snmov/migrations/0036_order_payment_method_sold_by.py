from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('snmov', '0035_order_fulfillment_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='payment_method',
            field=models.CharField(
                blank=True,
                choices=[('', 'Not set'), ('card', 'Card'), ('cash', 'Cash')],
                default='',
                help_text='How this order was paid. Cash is staff in-person sales only.',
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='sold_by',
            field=models.ForeignKey(
                blank=True,
                help_text='Staff member who completed an in-person sale.',
                null=True,
                on_delete=models.SET_NULL,
                related_name='in_person_sales',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='order',
            name='fulfillment_method',
            field=models.CharField(
                choices=[('ship', 'Ship'), ('pickup', 'In-person pickup')],
                default='ship',
                help_text='Ship via Canada Post, or a staff-only in-person sale with no shipping.',
                max_length=16,
            ),
        ),
    ]
