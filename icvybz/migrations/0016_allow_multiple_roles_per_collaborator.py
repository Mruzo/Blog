# Generated migration to allow multiple roles per collaborator

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0015_add_removed_at_to_studio_collaborator'),
    ]

    operations = [
        # Remove old unique_together constraint for StoryCollaborator (story, user)
        migrations.AlterUniqueTogether(
            name='storycollaborator',
            unique_together=set(),
        ),
        # Add new unique_together constraint for StoryCollaborator (story, user, role)
        migrations.AlterUniqueTogether(
            name='storycollaborator',
            unique_together={('story', 'user', 'role')},
        ),
        # Remove old unique_together constraint for StudioCollaborator (studio, user)
        migrations.AlterUniqueTogether(
            name='studiocollaborator',
            unique_together=set(),
        ),
        # Add new unique_together constraint for StudioCollaborator (studio, user, role)
        migrations.AlterUniqueTogether(
            name='studiocollaborator',
            unique_together={('studio', 'user', 'role')},
        ),
    ]





