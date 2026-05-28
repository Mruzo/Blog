import secrets

from django.db import migrations, models


def populate_access_tokens(apps, schema_editor):
    FeedbackTicket = apps.get_model('feedback', 'FeedbackTicket')
    seen = set()
    for ticket in FeedbackTicket.objects.all().order_by('pk'):
        token = (ticket.access_token or '').strip()
        if not token or token in seen:
            token = secrets.token_urlsafe(32)
            FeedbackTicket.objects.filter(pk=ticket.pk).update(access_token=token)
        seen.add(token)


class Migration(migrations.Migration):

    dependencies = [
        ('feedback', '0003_auto_20260127_2239'),
    ]

    operations = [
        migrations.AddField(
            model_name='feedbackticket',
            name='access_token',
            field=models.CharField(blank=True, db_index=True, default='', max_length=64),
        ),
        migrations.RunPython(populate_access_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='feedbackticket',
            name='access_token',
            field=models.CharField(blank=True, db_index=True, max_length=64, unique=True),
        ),
    ]
