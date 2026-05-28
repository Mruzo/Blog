import secrets

from django.db import migrations, models


def populate_access_tokens(apps, schema_editor):
    """Backfill unique access_token values for existing rows."""
    FeedbackTicket = apps.get_model('feedback', 'FeedbackTicket')
    db_alias = schema_editor.connection.alias
    seen = set()

    for ticket in FeedbackTicket.objects.using(db_alias).all().order_by('pk').iterator(chunk_size=500):
        token = (getattr(ticket, 'access_token', None) or '').strip()
        if not token or token in seen:
            token = secrets.token_urlsafe(32)
            FeedbackTicket.objects.using(db_alias).filter(pk=ticket.pk).update(access_token=token)
        seen.add(token)


class Migration(migrations.Migration):
    """
    PostgreSQL-safe migration for access_token.

    Avoids AlterField on the database (which recreates varchar LIKE indexes and
    triggers "pending trigger events" / "already exists" errors after partial runs).
    Uses IF NOT EXISTS SQL instead.
    """

    atomic = False

    dependencies = [
        ('feedback', '0003_auto_20260127_2239'),
    ]

    operations = [
        # 1) Column only (no db_index / unique on DB yet)
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE feedback_feedbackticket
                    ADD COLUMN IF NOT EXISTS access_token varchar(64) NOT NULL DEFAULT '';
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='feedbackticket',
                    name='access_token',
                    field=models.CharField(blank=True, default='', max_length=64),
                ),
            ],
        ),
        # 2) Backfill tokens
        migrations.RunPython(populate_access_tokens, migrations.RunPython.noop),
        # 3) Indexes + Django model state (no AlterField DB work)
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    CREATE UNIQUE INDEX IF NOT EXISTS feedback_feedbackticket_access_token_uniq
                        ON feedback_feedbackticket (access_token);
                    CREATE INDEX IF NOT EXISTS feedback_feedbackticket_access_token_idx
                        ON feedback_feedbackticket (access_token);
                    """,
                    reverse_sql="""
                    DROP INDEX IF EXISTS feedback_feedbackticket_access_token_uniq;
                    DROP INDEX IF EXISTS feedback_feedbackticket_access_token_idx;
                    """,
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name='feedbackticket',
                    name='access_token',
                    field=models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=64,
                        unique=True,
                    ),
                ),
            ],
        ),
    ]
