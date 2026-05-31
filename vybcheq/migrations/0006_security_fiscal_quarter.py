# Generated manually for SecurityFiscalQuarter (calendar quarter-end EOD + metrics)

from django.db import migrations, models
import django.db.models.deletion
import vybcheq.models


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0005_alter_security_quote_last_price"),
    ]

    operations = [
        migrations.CreateModel(
            name="SecurityFiscalQuarter",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("period_end", models.DateField(db_index=True, help_text="Calendar quarter end (Mar 31, Jun 30, Sep 30, Dec 31).")),
                ("trade_date", models.DateField(help_text="Last trading day on or before period_end used for the close.")),
                ("close", models.DecimalField(blank=True, decimal_places=8, max_digits=24, null=True)),
                ("open", models.DecimalField(blank=True, decimal_places=8, max_digits=24, null=True)),
                ("high", models.DecimalField(blank=True, decimal_places=8, max_digits=24, null=True)),
                ("low", models.DecimalField(blank=True, decimal_places=8, max_digits=24, null=True)),
                ("volume", models.BigIntegerField(blank=True, null=True)),
                (
                    "metrics",
                    models.JSONField(
                        blank=True,
                        default=vybcheq.models._default_metrics_snapshot,
                        help_text="Fundamentals for this quarter (_raw FMP row + mapped rule keys).",
                    ),
                ),
                ("source", models.CharField(default="fmp", max_length=16)),
                (
                    "security",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="fiscal_quarters",
                        to="vybcheq.security",
                    ),
                ),
            ],
            options={
                "ordering": ["-period_end"],
            },
        ),
        migrations.AddConstraint(
            model_name="securityfiscalquarter",
            constraint=models.UniqueConstraint(
                fields=("security", "period_end"),
                name="vybcheq_securityfiscalquarter_security_period_uniq",
            ),
        ),
    ]
