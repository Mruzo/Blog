from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('snmov', '0029_coupon_featured_storefront'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='guest_email',
            field=models.EmailField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='order',
            name='guest_checkout_token',
            field=models.CharField(blank=True, db_index=True, default='', max_length=64),
        ),
        migrations.AlterField(
            model_name='order',
            name='customer',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name='orders',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
