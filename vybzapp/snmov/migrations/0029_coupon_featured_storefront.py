from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('snmov', '0028_coupon_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='featured_on_storefront',
            field=models.BooleanField(
                default=False,
                help_text="When checked, this coupon's description is shown on the /product/ promo strip (only one should be checked).",
            ),
        ),
    ]
