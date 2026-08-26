# Generated manually for FMP financial-statement symbol directory cache

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0008_security_fiscal_quarter_report_date"),
    ]

    operations = [
        migrations.CreateModel(
            name="FmpDirectoryMeta",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("synced_at", models.DateTimeField(blank=True, null=True)),
                ("total_count", models.PositiveIntegerField(default=0)),
                ("us_count", models.PositiveIntegerField(default=0)),
                ("foreign_count", models.PositiveIntegerField(default=0)),
                ("endpoint", models.CharField(blank=True, max_length=255)),
            ],
            options={
                "verbose_name": "FMP symbol directory",
                "verbose_name_plural": "FMP symbol directory",
            },
        ),
        migrations.CreateModel(
            name="FmpFinancialSymbol",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fmp_symbol", models.CharField(db_index=True, max_length=32, unique=True)),
                ("symbol", models.CharField(db_index=True, max_length=32)),
                ("exchange", models.CharField(db_index=True, max_length=64)),
                ("name", models.CharField(blank=True, max_length=255)),
                ("currency", models.CharField(blank=True, max_length=8)),
                ("exchange_short_name", models.CharField(blank=True, max_length=64)),
                ("exchange_full_name", models.CharField(blank=True, max_length=128)),
                ("country", models.CharField(blank=True, max_length=64)),
                ("symbol_type", models.CharField(blank=True, max_length=32)),
                (
                    "is_us_major",
                    models.BooleanField(
                        db_index=True,
                        default=False,
                        help_text="NASDAQ, NYSE, or AMEX — typical FMP free-tier fundamentals coverage.",
                    ),
                ),
                ("raw", models.JSONField(blank=True, default=dict)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["exchange", "symbol"],
                "indexes": [
                    models.Index(fields=["is_us_major", "exchange", "symbol"], name="vybcheq_fmpfin_is_us_ex_sym"),
                ],
            },
        ),
    ]
