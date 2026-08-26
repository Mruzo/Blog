from django.db import migrations, models


def split_close_fields(apps, schema_editor):
    """Best-effort backfill: metrics rows → implied_close; OHLC rows → eod_trade_date."""
    SFQ = apps.get_model("vybcheq", "SecurityFiscalQuarter")
    for q in SFQ.objects.all().iterator():
        metrics = q.metrics or {}
        updates: list[str] = []
        if metrics and q.close is not None and q.implied_close is None:
            if metrics.get("_price_method") or metrics.get("pe_ratio") is not None:
                q.implied_close = q.close
                updates.append("implied_close")
        if (q.open is not None or q.high is not None) and q.eod_trade_date is None:
            q.eod_trade_date = q.trade_date
            updates.append("eod_trade_date")
        if updates:
            q.save(update_fields=updates)


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0010_security_quote_source_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="securityfiscalquarter",
            name="eod_trade_date",
            field=models.DateField(
                blank=True,
                help_text="Last trading day on or before period_end used for the EOD market close.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="securityfiscalquarter",
            name="implied_close",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Price implied from FMP ratios/key-metrics for this fiscal period.",
                max_digits=24,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="securityfiscalquarter",
            name="close",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="EOD market close on eod_trade_date (quarter-end bar from FMP).",
                max_digits=24,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="securityfiscalquarter",
            name="trade_date",
            field=models.DateField(
                help_text="Fiscal period date from FMP fundamentals (not the EOD bar date).",
            ),
        ),
        migrations.RunPython(split_close_fields, migrations.RunPython.noop),
    ]
