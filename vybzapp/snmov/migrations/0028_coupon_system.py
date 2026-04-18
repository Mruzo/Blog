from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('snmov', '0027_productnotification_tracking_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='Coupon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(db_index=True, max_length=40, unique=True)),
                ('description', models.CharField(blank=True, max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('discount_type', models.CharField(choices=[('percent', 'Percent off merchandise'), ('fixed', 'Fixed amount off merchandise')], default='percent', max_length=10)),
                ('percent_off', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=5)),
                ('amount_off', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('starts_at', models.DateTimeField(blank=True, null=True)),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
                ('max_redemptions', models.PositiveIntegerField(blank=True, null=True)),
                ('times_redeemed', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddField(
            model_name='order',
            name='coupon',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='snmov.coupon'),
        ),
        migrations.AddField(
            model_name='order',
            name='coupon_code',
            field=models.CharField(blank=True, default='', max_length=40),
        ),
        migrations.AddField(
            model_name='order',
            name='coupon_discount',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10),
        ),
    ]
