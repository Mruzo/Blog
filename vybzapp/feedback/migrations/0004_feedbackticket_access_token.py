import secrets

from django.db import migrations, models


def populate_access_tokens(apps, schema_editor):
    """
    Backfill unique access_token for existing tickets.
    Uses queryset.update() so Django signals do not run.
    """
    FeedbackTicket = apps.get_model('feedback', 'FeedbackTicket')
    db_alias = schema_editor.connection.alias
    seen = set()

    for ticket in FeedbackTicket.objects.using(db_alias).all().order_by('pk').iterator(chunk_size=500):
        token = (ticket.access_token or '').strip()
        if not token or token in seen:
            token = secrets.token_urlsafe(32)
            FeedbackTicket.objects.using(db_alias).filter(pk=ticket.pk).update(access_token=token)
        seen.add(token)


class Migration(migrations.Migration):
    # Required on PostgreSQL: RunPython UPDATE then ALTER UNIQUE must not share
    # one transaction (pending trigger events / ObjectInUse).
    atomic = False

    dependencies = [
        ('feedback', '0003_auto_20260127_2239'),
    ]

    operations = [
        # Step 1: add column without UNIQUE
        migrations.AddField(
            model_name='feedbackticket',
            name='access_token',
            field=models.CharField(blank=True, db_index=True, default='', max_length=64),
        ),
        # Step 2: backfill tokens (committed before step 3 when atomic=False)
        migrations.RunPython(populate_access_tokens, migrations.RunPython.noop),
        # Step 3: enforce UNIQUE in a new transaction
        migrations.AlterField(
            model_name='feedbackticket',
            name='access_token',
            field=models.CharField(blank=True, db_index=True, max_length=64, unique=True),
        ),
    ]
