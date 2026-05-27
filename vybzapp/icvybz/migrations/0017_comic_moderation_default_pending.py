from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0016_allow_multiple_roles_per_collaborator'),
    ]

    operations = [
        migrations.AlterField(
            model_name='comic',
            name='moderation_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending Review'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
    ]

