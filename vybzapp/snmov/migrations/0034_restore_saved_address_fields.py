from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('snmov', '0033_payment_dispute'),
    ]

    operations = [
        migrations.AddField(
            model_name='shippingaddress',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='shippingaddress',
            name='is_default',
            field=models.BooleanField(
                default=False,
                help_text='Default saved address for this user',
            ),
        ),
        migrations.AddField(
            model_name='shippingaddress',
            name='is_saved',
            field=models.BooleanField(
                default=False,
                help_text='Whether this is a saved address for future use',
            ),
        ),
        migrations.AddField(
            model_name='shippingaddress',
            name='label',
            field=models.CharField(
                blank=True,
                help_text="Label for saved address (e.g., 'Home', 'Work')",
                max_length=50,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='shippingaddress',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AlterModelOptions(
            name='shippingaddress',
            options={
                'ordering': ['-is_default', '-created_at'],
                'verbose_name_plural': 'ShippingAddress',
            },
        ),
    ]
