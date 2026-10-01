from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0024_studio_invite_roles'),
    ]

    operations = [
        migrations.AddField(
            model_name='dialogue',
            name='camera_transition',
            field=models.CharField(
                choices=[('move', 'Move'), ('snap', 'Snap')],
                default='move',
                help_text='How the camera arrives at this line: ease from the previous shot, or cut.',
                max_length=8,
            ),
        ),
    ]
