from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('icvybz', '0025_dialogue_camera_transition'),
    ]

    operations = [
        migrations.CreateModel(
            name='StoryChange',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('create', 'Created'), ('update', 'Updated'), ('delete', 'Deleted'), ('snapshot', 'Saved version'), ('restore', 'Restored version')], max_length=16)),
                ('target_type', models.CharField(default='dialogue', max_length=32)),
                ('target_id', models.PositiveIntegerField(blank=True, null=True)),
                ('summary', models.CharField(max_length=240)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('episode', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='changes', to='icvybz.episode')),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='changes', to='icvybz.comic')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='story_changes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'app_label': 'icvybz',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='EpisodeVersion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='episode_versions', to=settings.AUTH_USER_MODEL)),
                ('episode', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='icvybz.episode')),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='episode_versions', to='icvybz.comic')),
            ],
            options={
                'app_label': 'icvybz',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='storychange',
            index=models.Index(fields=['episode', '-created_at'], name='icvybz_stor_episode_b8c1a2_idx'),
        ),
        migrations.AddIndex(
            model_name='storychange',
            index=models.Index(fields=['story', '-created_at'], name='icvybz_stor_story_i_4d2e9c_idx'),
        ),
        migrations.AddIndex(
            model_name='episodeversion',
            index=models.Index(fields=['episode', '-created_at'], name='icvybz_epis_episode_9f3a11_idx'),
        ),
    ]
