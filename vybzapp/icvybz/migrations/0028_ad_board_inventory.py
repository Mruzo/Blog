from django.db import migrations, models
import django.db.models.deletion


def seed_default_ad_boards(apps, schema_editor):
    AdBoard = apps.get_model('icvybz', 'AdBoard')
    for index in range(1, 13):
        AdBoard.objects.get_or_create(
            slot_name=f'panel_{index}',
            defaults={
                'label': f'Panel {index}',
                'node_name': f'panel {index}',
                'sort_order': index,
                'is_active': True,
            },
        )


def unseed_default_ad_boards(apps, schema_editor):
    AdBoard = apps.get_model('icvybz', 'AdBoard')
    AdBoard.objects.filter(slot_name__regex=r'^panel_\d+$').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0027_dialogue_last_editor_edit_request'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdBoard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slot_name', models.CharField(max_length=64, unique=True)),
                ('label', models.CharField(max_length=80)),
                ('node_name', models.CharField(help_text="Exact or prefix GLB node name, e.g. 'panel 1'.", max_length=80)),
                ('sort_order', models.PositiveIntegerField(db_index=True, default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('notes', models.CharField(blank=True, max_length=220)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['sort_order', 'slot_name'],
            },
        ),
        migrations.AddField(
            model_name='adplacement',
            name='board',
            field=models.ForeignKey(
                blank=True,
                help_text='When set, this booking occupies that GLB panel on every ad-enabled scene.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='placements',
                to='icvybz.adboard',
            ),
        ),
        migrations.AddIndex(
            model_name='adplacement',
            index=models.Index(fields=['board', 'is_active'], name='icvybz_adpl_board_i_7c9d2a_idx'),
        ),
        migrations.RunPython(seed_default_ad_boards, unseed_default_ad_boards),
    ]
