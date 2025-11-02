# Generated manually for collaboration models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('icvybz', '0009_auto_20251025_1458'),
    ]

    operations = [
        migrations.CreateModel(
            name='CollaborationInvite',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('invitee_email', models.EmailField(max_length=254)),
                ('role', models.CharField(choices=[('viewer', 'Viewer'), ('editor', 'Editor'), ('admin', 'Admin')], default='viewer', max_length=10)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined'), ('expired', 'Expired')], default='pending', max_length=10)),
                ('message', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('expires_at', models.DateTimeField()),
                ('inviter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_invites', to=settings.AUTH_USER_MODEL)),
                ('invitee_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='received_invites', to=settings.AUTH_USER_MODEL)),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='collaboration_invites', to='icvybz.comic')),
            ],
            options={
                'app_label': 'icvybz',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AlterField(
            model_name='storycollaborator',
            name='role',
            field=models.CharField(choices=[('viewer', 'Viewer'), ('editor', 'Editor'), ('admin', 'Admin'), ('writer', 'Writer'), ('3d_artist', '3D Artist'), ('voice_actor', 'Voice Actor'), ('sound_engineer', 'Sound Engineer'), ('cinematographer', 'Cinematographer')], default='viewer', max_length=50),
        ),
        migrations.AddField(
            model_name='storycollaborator',
            name='invited_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='invited_collaborators', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddConstraint(
            model_name='collaborationinvite',
            constraint=models.UniqueConstraint(fields=('inviter', 'invitee_email', 'story'), name='unique_invitation'),
        ),
        migrations.AddConstraint(
            model_name='storycollaborator',
            constraint=models.UniqueConstraint(fields=('story', 'user'), name='unique_collaborator'),
        ),
    ]
