from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0009_fmp_financial_symbol_directory"),
    ]

    operations = [
        migrations.AddField(
            model_name="security",
            name="quote_eod_close",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Last market EOD close from FMP historical-price-eod.",
                max_digits=24,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="quote_eod_refreshed_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When EOD data was last pulled from FMP.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="quote_eod_trade_date",
            field=models.DateField(
                blank=True,
                help_text="Trade date the EOD close is for (not when it was fetched).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="quote_implied_close",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Price implied from FMP ratios/key-metrics for a fiscal period.",
                max_digits=24,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="quote_implied_method",
            field=models.CharField(
                blank=True,
                help_text="How implied price was derived (e.g. pe_x_eps).",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="quote_implied_period_end",
            field=models.DateField(
                blank=True,
                help_text="Fiscal period end the implied price is aligned with.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="quote_implied_period_mode",
            field=models.CharField(
                blank=True,
                help_text="FMP period mode: quarter, annual, ttm, etc.",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="quote_implied_refreshed_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When fundamentals-implied price was last refreshed.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="quote_mark_source",
            field=models.CharField(
                blank=True,
                help_text="Which cached price feeds quote_last_price: eod or implied.",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="security",
            name="quote_last_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Sim mark price: EOD close when loaded, else fundamentals-implied. 1 cheq ≈ 1 USD.",
                max_digits=24,
                null=True,
            ),
        ),
    ]
