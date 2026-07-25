# Generated manually — scene_slot only (avoid unrelated ad index churn).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0022_ad_placement_slot_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='character',
            name='scene_slot',
            field=models.CharField(
                blank=True,
                help_text='Shared-scene position slot (North_SS, South_SS, East_SS, West_SS). Null for legacy custom positions.',
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddConstraint(
            model_name='character',
            constraint=models.UniqueConstraint(
                condition=models.Q(('scene_slot__isnull', False), models.Q(('scene_slot', ''), _negated=True)),
                fields=('story', 'scene_slot'),
                name='unique_character_story_scene_slot',
            ),
        ),
    ]
