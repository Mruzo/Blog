from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("vybcheq", "0011_securityfiscalquarter_split_close"),
    ]

    operations = [
        migrations.AddField(
            model_name="simposition",
            name="parent_position",
            field=models.ForeignKey(
                blank=True,
                help_text="Set when this row records a partial sell from a still-open lot.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="partial_closes",
                to="vybcheq.simposition",
            ),
        ),
    ]
