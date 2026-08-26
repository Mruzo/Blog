from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0012_simposition_parent_position"),
    ]

    operations = [
        migrations.AddField(
            model_name="screeningruleset",
            name="brief_slug",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Links core checks to the briefing catalog (e.g. gross_margin).",
                max_length=64,
            ),
        ),
    ]
