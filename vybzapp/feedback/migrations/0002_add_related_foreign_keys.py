# Migration to add foreign key constraints after related models exist
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('feedback', '0001_initial'),
        ('icvybz', '0002_audiotrack_dialogueaudio_episodeaudio_sceneaudio_storycollaborator_studio_studiocollaborator'),
        ('snmov', '0001_initial'),
    ]

    operations = [
        # Remove the integer fields and add proper foreign keys
        migrations.RemoveField(
            model_name='feedbackticket',
            name='related_episode_id',
        ),
        migrations.RemoveField(
            model_name='feedbackticket',
            name='related_order_id',
        ),
        migrations.RemoveField(
            model_name='feedbackticket',
            name='related_studio_id',
        ),
        migrations.RemoveField(
            model_name='feedbackticket',
            name='related_story_id',
        ),
        migrations.AddField(
            model_name='feedbackticket',
            name='related_episode',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedback_tickets', to='icvybz.episode', db_constraint=True),
        ),
        migrations.AddField(
            model_name='feedbackticket',
            name='related_order',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedback_tickets', to='snmov.order', db_constraint=True),
        ),
        migrations.AddField(
            model_name='feedbackticket',
            name='related_studio',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedback_tickets', to='icvybz.studio', db_constraint=True),
        ),
        migrations.AddField(
            model_name='feedbackticket',
            name='related_story',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedback_tickets', to='icvybz.comic', db_constraint=True),
        ),
    ]
