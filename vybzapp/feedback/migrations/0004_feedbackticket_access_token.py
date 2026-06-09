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


def add_access_token_column(apps, schema_editor):
    """Add column — PostgreSQL uses IF NOT EXISTS; SQLite uses schema_editor.add_field."""
    connection = schema_editor.connection
    table = 'feedback_feedbackticket'

    with connection.cursor() as cursor:
        columns = {
            col.name
            for col in connection.introspection.get_table_description(cursor, table)
        }

    if 'access_token' in columns:
        return

    if connection.vendor == 'postgresql':
        schema_editor.execute(
            """
            ALTER TABLE feedback_feedbackticket
            ADD COLUMN IF NOT EXISTS access_token varchar(64) NOT NULL DEFAULT '';
            """
        )
        return

    FeedbackTicket = apps.get_model('feedback', 'FeedbackTicket')
    field = models.CharField(blank=True, default='', max_length=64)
    field.set_attributes_from_name('access_token')
    schema_editor.add_field(FeedbackTicket, field)


def add_access_token_indexes(apps, schema_editor):
    """Add unique + lookup indexes without PostgreSQL AlterField trigger issues."""
    connection = schema_editor.connection

    if connection.vendor == 'postgresql':
        schema_editor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS feedback_feedbackticket_access_token_uniq
                ON feedback_feedbackticket (access_token);
            CREATE INDEX IF NOT EXISTS feedback_feedbackticket_access_token_idx
                ON feedback_feedbackticket (access_token);
            """
        )
        return

    FeedbackTicket = apps.get_model('feedback', 'FeedbackTicket')
    old_field = models.CharField(blank=True, default='', max_length=64)
    old_field.set_attributes_from_name('access_token')
    new_field = models.CharField(blank=True, db_index=True, max_length=64, unique=True)
    new_field.set_attributes_from_name('access_token')
    schema_editor.alter_field(FeedbackTicket, old_field, new_field)


def drop_access_token_indexes(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor == 'postgresql':
        schema_editor.execute(
            """
            DROP INDEX IF EXISTS feedback_feedbackticket_access_token_uniq;
            DROP INDEX IF EXISTS feedback_feedbackticket_access_token_idx;
            """
        )


class Migration(migrations.Migration):
    """
    PostgreSQL-safe migration for access_token.

    Avoids AlterField on PostgreSQL (which recreates varchar LIKE indexes and
    triggers "pending trigger events" / "already exists" errors after partial runs).
    Uses IF NOT EXISTS SQL on PostgreSQL; standard schema_editor ops on SQLite.
    """

    atomic = False

    dependencies = [
        ('feedback', '0003_auto_20260127_2239'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_access_token_column, migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='feedbackticket',
                    name='access_token',
                    field=models.CharField(blank=True, default='', max_length=64),
                ),
            ],
        ),
        migrations.RunPython(populate_access_tokens, migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_access_token_indexes, drop_access_token_indexes),
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
