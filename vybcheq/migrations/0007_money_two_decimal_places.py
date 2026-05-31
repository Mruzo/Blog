# Money fields: store and display to two decimal places.

from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0006_security_fiscal_quarter"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cheqaccount",
            name="balance",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("10000.00"),
                max_digits=20,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
            ),
        ),
        migrations.AlterField(
            model_name="decisionlog",
            name="notional",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=20, null=True),
        ),
        migrations.AlterField(
            model_name="decisionlog",
            name="price",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=20, null=True),
        ),
        migrations.AlterField(
            model_name="positionmark",
            name="price",
            field=models.DecimalField(decimal_places=2, max_digits=24),
        ),
        migrations.AlterField(
            model_name="positionmark",
            name="value_cheqs",
            field=models.DecimalField(decimal_places=2, max_digits=20),
        ),
        migrations.AlterField(
            model_name="security",
            name="quote_last_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Cached last EOD close (FMP); used for simulated marks. 1 cheq ≈ 1 USD notional.",
                max_digits=24,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="securitydailyquote",
            name="close",
            field=models.DecimalField(decimal_places=2, max_digits=24),
        ),
        migrations.AlterField(
            model_name="securitydailyquote",
            name="high",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=24, null=True),
        ),
        migrations.AlterField(
            model_name="securitydailyquote",
            name="low",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=24, null=True),
        ),
        migrations.AlterField(
            model_name="securitydailyquote",
            name="open",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=24, null=True),
        ),
        migrations.AlterField(
            model_name="securityfiscalquarter",
            name="close",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=24, null=True),
        ),
        migrations.AlterField(
            model_name="securityfiscalquarter",
            name="high",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=24, null=True),
        ),
        migrations.AlterField(
            model_name="securityfiscalquarter",
            name="low",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=24, null=True),
        ),
        migrations.AlterField(
            model_name="securityfiscalquarter",
            name="open",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=24, null=True),
        ),
        migrations.AlterField(
            model_name="simposition",
            name="cheqs_opened",
            field=models.DecimalField(
                decimal_places=2,
                max_digits=20,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
            ),
        ),
        migrations.AlterField(
            model_name="simposition",
            name="cheqs_proceeds",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Cheqs returned to wallet on close.",
                max_digits=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="simposition",
            name="entry_price",
            field=models.DecimalField(decimal_places=2, max_digits=24),
        ),
        migrations.AlterField(
            model_name="simposition",
            name="exit_price",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=24, null=True),
        ),
    ]
