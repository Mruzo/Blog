# Generated by Django 3.2.20 on 2023-08-09 00:12

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('snmov', '0005_alter_siteimage_about'),
    ]

    operations = [
        migrations.AlterField(
            model_name='siteimage',
            name='product',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='product_images', to='snmov.product'),
        ),
    ]
