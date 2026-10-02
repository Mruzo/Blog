from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('icvybz', '0026_story_change_episode_version'),
    ]

    operations = [
        migrations.AddField(
            model_name='dialogue',
            name='last_edited_by',
            field=models.ForeignKey(
                blank=True,
                help_text='Team member who last landed an edit. Others need their approval to change this line.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='edited_dialogues',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='storychange',
            name='action',
            field=models.CharField(
                choices=[
                    ('create', 'Created'),
                    ('update', 'Updated'),
                    ('delete', 'Deleted'),
                    ('snapshot', 'Saved version'),
                    ('restore', 'Restored version'),
                    ('request', 'Asked approval'),
                    ('approve', 'Approved'),
                    ('decline', 'Declined'),
                ],
                max_length=16,
            ),
        ),
        migrations.CreateModel(
            name='DialogueEditRequest',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('update', 'Update'), ('delete', 'Delete')], default='update', max_length=8)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('declined', 'Declined')], default='pending', max_length=10)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('summary', models.CharField(max_length=240)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('approver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dialogue_edits_to_approve', to=settings.AUTH_USER_MODEL)),
                ('dialogue', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='edit_requests', to='icvybz.dialogue')),
                ('episode', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dialogue_edit_requests', to='icvybz.episode')),
                ('requester', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='requested_dialogue_edits', to=settings.AUTH_USER_MODEL)),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dialogue_edit_requests', to='icvybz.comic')),
            ],
            options={
                'app_label': 'icvybz',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='dialogueeditrequest',
            index=models.Index(fields=['episode', 'status', '-created_at'], name='icvybz_dial_episode_appr_idx'),
        ),
        migrations.AddIndex(
            model_name='dialogueeditrequest',
            index=models.Index(fields=['approver', 'status'], name='icvybz_dial_approver_idx'),
        ),
    ]
