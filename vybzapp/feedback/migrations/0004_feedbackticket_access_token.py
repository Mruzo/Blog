from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('feedback', '0003_auto_20260127_2239'),
    ]

    operations = [
        migrations.AddField(
            model_name='feedbackticket',
            name='access_token',
            field=models.CharField(blank=True, db_index=True, max_length=64, unique=True),
        ),
    ]

