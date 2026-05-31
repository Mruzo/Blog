# help_text: Yahoo → FMP (schema unchanged)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0004_security_daily_quote"),
    ]

    operations = [
        migrations.AlterField(
            model_name="security",
            name="quote_last_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=8,
                help_text="Cached last EOD close (FMP); used for simulated marks. 1 cheq ≈ 1 USD notional.",
                max_digits=24,
                null=True,
            ),
        ),
    ]
