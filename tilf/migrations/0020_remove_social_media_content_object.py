from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('tilf', '0019_auto_20250611_1930'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='socialmedialink',
            name='content_object',
        ),
        migrations.RemoveField(
            model_name='socialmedialink',
            name='content_type',
        ),
        migrations.RemoveField(
            model_name='socialmedialink',
            name='object_id',
        ),
    ] 