"""
Create snmov_User if missing and copy rows from auth_user (same primary keys).

Uses raw SQL for auth_user reads because auth.User is swapped once AUTH_USER_MODEL
is snmov.User. Safe to re-run: skips users that already exist in snmov_User.
"""
from django.db import migrations


def _table_names(connection):
    return set(connection.introspection.table_names())


def copy_auth_users_to_snmov(apps, schema_editor):
    connection = schema_editor.connection
    SnmovUser = apps.get_model('snmov', 'User')
    user_table = SnmovUser._meta.db_table
    tables = _table_names(connection)

    if user_table not in tables:
        schema_editor.create_model(SnmovUser)
        tables = _table_names(connection)

    if 'auth_user' not in tables:
        return

    quoted_user_table = connection.ops.quote_name(user_table)

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT id, password, last_login, is_superuser, username,
                   first_name, last_name, email, is_staff, is_active, date_joined
            FROM auth_user
            """
        )
        rows = cursor.fetchall()

    for row in rows:
        (
            pk, password, last_login, is_superuser, username,
            first_name, last_name, email, is_staff, is_active, date_joined,
        ) = row
        if SnmovUser.objects.filter(pk=pk).exists():
            continue
        SnmovUser.objects.create(
            id=pk,
            password=password,
            last_login=last_login,
            is_superuser=is_superuser,
            username=username,
            first_name=first_name or '',
            last_name=last_name or '',
            email=email or '',
            is_staff=is_staff,
            is_active=is_active,
            date_joined=date_joined,
            is_email_verified=False,
            email_verification_token=None,
            email_verification_sent_at=None,
        )

    m2m_tables = (
        ('auth_user_groups', f'{user_table}_groups', 'group_id'),
        ('auth_user_user_permissions', f'{user_table}_user_permissions', 'permission_id'),
    )
    for src, dest, related_col in m2m_tables:
        if src not in tables or dest not in _table_names(connection):
            continue
        with connection.cursor() as cursor:
            cursor.execute(f'SELECT user_id, {related_col} FROM {src}')
            links = cursor.fetchall()
        for user_id, related_id in links:
            try:
                user = SnmovUser.objects.get(pk=user_id)
            except SnmovUser.DoesNotExist:
                continue
            if related_col == 'group_id':
                user.groups.add(related_id)
            else:
                user.user_permissions.add(related_id)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('snmov', '0032_ensure_snmov_user_model'),
        ('snmov', '0030_guest_checkout'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(copy_auth_users_to_snmov, noop_reverse),
    ]
