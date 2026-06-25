from django.db import migrations, models
import django.db.models.deletion


def backfill_comic_studios(apps, schema_editor):
    Comic = apps.get_model('icvybz', 'Comic')
    Studio = apps.get_model('icvybz', 'Studio')

    studios_by_owner = {}
    for studio in Studio.objects.order_by('created_at', 'id').only('id', 'owner_id'):
        studios_by_owner.setdefault(studio.owner_id, studio.id)

    for comic in Comic.objects.filter(studio__isnull=True).only('id', 'user_id'):
        studio_id = studios_by_owner.get(comic.user_id)
        if studio_id:
            Comic.objects.filter(pk=comic.pk).update(studio_id=studio_id)


class Migration(migrations.Migration):

    dependencies = [
        ('icvybz', '0018_episode_ordering_comment_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='comic',
            name='studio',
            field=models.ForeignKey(
                blank=True,
                help_text='Studio this story was created under.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='stories',
                to='icvybz.studio',
            ),
        ),
        migrations.RunPython(backfill_comic_studios, migrations.RunPython.noop),
    ]
