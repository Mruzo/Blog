from django.db import migrations
from django.conf import settings

def update_site_domain(apps, schema_editor):
    Site = apps.get_model('sites', 'Site')
    Site.objects.update_or_create(
        id=settings.SITE_ID,
        defaults={
            'domain': settings.SITE_DOMAIN,
            'name': settings.SITE_NAME
        }
    )

def revert_site_domain(apps, schema_editor):
    Site = apps.get_model('sites', 'Site')
    Site.objects.update_or_create(
        id=settings.SITE_ID,
        defaults={
            'domain': 'example.com',
            'name': 'example.com'
        }
    )

class Migration(migrations.Migration):
    dependencies = [
        ('snmov', '0001_initial'),  # Replace with your last migration
        ('sites', '0002_alter_domain_unique'),
    ]

    operations = [
        migrations.RunPython(update_site_domain, revert_site_domain),
    ] 