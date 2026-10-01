from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


ROLE_CHOICES = [
    ('writer', 'Writer'),
    ('screenwriter', 'Screenwriter'),
    ('director', 'Director'),
    ('3d_artist', '3D Artist'),
    ('voice_actor', 'Voice Actor'),
    ('sound_engineer', 'Sound Engineer'),
    ('cinematographer', 'Cinematographer'),
]

STORY_ROLE_CHOICES = [
    ('viewer', 'Viewer'),
    ('editor', 'Editor'),
    ('admin', 'Admin'),
] + ROLE_CHOICES


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('icvybz', '0023_character_scene_slot'),
    ]

    operations = [
        migrations.AlterField(
            model_name='studiocollaborator',
            name='role',
            field=models.CharField(choices=ROLE_CHOICES, max_length=50),
        ),
        migrations.AlterField(
            model_name='studiocollaborationrequest',
            name='role',
            field=models.CharField(choices=ROLE_CHOICES, default='writer', max_length=50),
        ),
        migrations.AlterField(
            model_name='storycollaborator',
            name='role',
            field=models.CharField(choices=STORY_ROLE_CHOICES, default='viewer', max_length=50),
        ),
        migrations.CreateModel(
            name='StudioCollaborationInvite',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('invitee_email', models.EmailField(max_length=254)),
                ('role', models.CharField(choices=ROLE_CHOICES, max_length=50)),
                ('status', models.CharField(
                    choices=[('pending', 'Pending'), ('accepted', 'Accepted')],
                    default='pending',
                    max_length=10,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('inviter', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sent_studio_invites',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('studio', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='email_invites',
                    to='icvybz.studio',
                )),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('studio', 'invitee_email', 'role')},
            },
        ),
        migrations.AddIndex(
            model_name='studiocollaborationinvite',
            index=models.Index(fields=['invitee_email', 'status'], name='studio_invite_email_idx'),
        ),
    ]
