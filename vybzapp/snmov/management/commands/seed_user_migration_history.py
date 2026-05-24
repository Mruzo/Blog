"""
One-time fix for production: record 0032 as applied before admin/icvybz.

Use when migrate fails with InconsistentMigrationHistory mentioning
snmov.0032_ensure_snmov_user_model, then run migrate normally.

  python manage.py seed_user_migration_history --settings=snm.settings.pro
  python manage.py migrate --settings=snm.settings.pro
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone


MIGRATION_NAME = '0032_ensure_snmov_user_model'


class Command(BaseCommand):
    help = (
        'Insert django_migrations row for snmov.0032 with an early applied '
        'timestamp so migrate can run after AUTH_USER_MODEL was switched.'
    )

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT applied FROM django_migrations
                WHERE app = 'snmov' AND name = %s
                """,
                [MIGRATION_NAME],
            )
            row = cursor.fetchone()
            if row:
                self.stdout.write(
                    self.style.WARNING(
                        f'snmov.{MIGRATION_NAME} already recorded (applied={row[0]}).'
                    )
                )
                return

            cursor.execute(
                """
                SELECT MIN(applied) FROM django_migrations
                WHERE app IN ('admin', 'icvybz', 'feedback', 'authtoken')
                """
            )
            earliest = cursor.fetchone()[0]
            if earliest is None:
                applied = timezone.now()
            else:
                applied = earliest

            cursor.execute(
                """
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('snmov', %s, %s)
                """,
                [MIGRATION_NAME, applied],
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Recorded snmov.{MIGRATION_NAME} as applied at {applied}. '
                'Now run: python manage.py migrate --settings=snm.settings.pro'
            )
        )
