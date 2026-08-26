# Generated manually for financial report filing dates (FMP)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0007_money_two_decimal_places"),
    ]

    operations = [
        migrations.AddField(
            model_name="securityfiscalquarter",
            name="report_date",
            field=models.DateField(
                blank=True,
                db_index=True,
                help_text="Date the financial report was filed/published (FMP financial-reports-dates).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="last_report_date",
            field=models.DateField(
                blank=True,
                help_text="Most recent filing date from FMP financial-reports-dates.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="security",
            name="report_dates_updated_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When report filing dates were last refreshed from FMP.",
                null=True,
            ),
        ),
    ]
