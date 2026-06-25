from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0017_comic_moderation_default_pending'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='episode',
            options={'ordering': ['episode_number']},
        ),
        migrations.AlterField(
            model_name='comiccomment',
            name='comment_cont',
            field=models.TextField(max_length=500, verbose_name='Comment'),
        ),
    ]
