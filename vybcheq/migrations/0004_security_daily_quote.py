# Generated manually for SecurityDailyQuote (FMP EOD)

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0003_security_quote_last_price_security_quote_updated_at_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="SecurityDailyQuote",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("trade_date", models.DateField(db_index=True)),
                ("close", models.DecimalField(decimal_places=8, max_digits=24)),
                (
                    "open",
                    models.DecimalField(
                        blank=True, decimal_places=8, max_digits=24, null=True
                    ),
                ),
                (
                    "high",
                    models.DecimalField(
                        blank=True, decimal_places=8, max_digits=24, null=True
                    ),
                ),
                (
                    "low",
                    models.DecimalField(
                        blank=True, decimal_places=8, max_digits=24, null=True
                    ),
                ),
                ("volume", models.BigIntegerField(blank=True, null=True)),
                ("source", models.CharField(default="fmp", max_length=16)),
                (
                    "security",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="daily_quotes",
                        to="vybcheq.security",
                    ),
                ),
            ],
            options={
                "ordering": ["-trade_date"],
            },
        ),
        migrations.AddConstraint(
            model_name="securitydailyquote",
            constraint=models.UniqueConstraint(
                fields=("security", "trade_date"),
                name="vybcheq_securitydailyquote_security_date_uniq",
            ),
        ),
    ]
