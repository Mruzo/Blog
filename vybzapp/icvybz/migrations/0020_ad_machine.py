from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import datetime


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('icvybz', '0019_comic_studio'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdvertiserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('business_name', models.CharField(max_length=160)),
                ('contact_name', models.CharField(blank=True, max_length=160)),
                ('contact_email', models.EmailField(max_length=254)),
                ('website_url', models.URLField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('paused', 'Paused')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='advertiser_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['business_name'],
            },
        ),
        migrations.CreateModel(
            name='AdRevenueSplitConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('creator_percentage', models.DecimalField(decimal_places=2, default=70, max_digits=5, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('platform_percentage', models.DecimalField(decimal_places=2, default=30, max_digits=5, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('effective_date', models.DateField(default=datetime.date.today)),
                ('is_active', models.BooleanField(default=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-effective_date', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AdCampaign',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=160)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('end_date', models.DateField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('budget_label', models.CharField(blank=True, help_text='Optional budget or package reference for future billing.', max_length=120)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('advertiser', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='campaigns', to='icvybz.advertiserprofile')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AdCreative',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=160)),
                ('image', models.ImageField(upload_to='ads/creatives/')),
                ('destination_url', models.URLField()),
                ('alt_text', models.CharField(blank=True, max_length=220)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('paused', 'Paused')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('advertiser', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='creatives', to='icvybz.advertiserprofile')),
                ('campaign', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='creatives', to='icvybz.adcampaign')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AdPlacement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, max_length=160)),
                ('position_x', models.FloatField(default=0.0)),
                ('position_y', models.FloatField(default=1.5)),
                ('position_z', models.FloatField(default=0.0)),
                ('normal_x', models.FloatField(default=0.0)),
                ('normal_y', models.FloatField(default=1.0)),
                ('normal_z', models.FloatField(default=0.0)),
                ('width', models.FloatField(default=1.2, validators=[django.core.validators.MinValueValidator(0.1)])),
                ('height', models.FloatField(default=0.7, validators=[django.core.validators.MinValueValidator(0.1)])),
                ('rotation', models.CharField(default='0deg 0deg 0deg', max_length=50)),
                ('priority', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('campaign', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='placements', to='icvybz.adcampaign')),
                ('creative', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='placements', to='icvybz.adcreative')),
                ('episode', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='ad_placements', to='icvybz.episode')),
                ('season', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ad_placements', to='icvybz.season')),
            ],
            options={
                'ordering': ['-priority', 'id'],
            },
        ),
        migrations.CreateModel(
            name='AdEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[('impression', 'Impression'), ('click', 'Click')], max_length=20)),
                ('session_key', models.CharField(max_length=80)),
                ('referrer', models.URLField(blank=True)),
                ('user_agent', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('creative', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='icvybz.adcreative')),
                ('episode', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ad_events', to='icvybz.episode')),
                ('placement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='icvybz.adplacement')),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ad_events', to='icvybz.comic')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ad_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AdRevenueShareSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('creator_percentage', models.DecimalField(decimal_places=2, max_digits=5)),
                ('platform_percentage', models.DecimalField(decimal_places=2, max_digits=5)),
                ('estimated_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('campaign', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='revenue_snapshots', to='icvybz.adcampaign')),
                ('creator', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ad_revenue_snapshots', to=settings.AUTH_USER_MODEL)),
                ('event', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='revenue_snapshot', to='icvybz.adevent')),
                ('placement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='revenue_snapshots', to='icvybz.adplacement')),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ad_revenue_snapshots', to='icvybz.comic')),
                ('studio', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ad_revenue_snapshots', to='icvybz.studio')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='adplacement',
            index=models.Index(fields=['season', 'episode', 'is_active'], name='icvybz_adpl_season__b2f4e4_idx'),
        ),
        migrations.AddIndex(
            model_name='adplacement',
            index=models.Index(fields=['campaign', 'is_active'], name='icvybz_adpl_campaig_c6d8cd_idx'),
        ),
        migrations.AddConstraint(
            model_name='adevent',
            constraint=models.UniqueConstraint(fields=('placement', 'episode', 'event_type', 'session_key'), name='unique_ad_event_per_session'),
        ),
        migrations.AddIndex(
            model_name='adevent',
            index=models.Index(fields=['placement', 'event_type', 'created_at'], name='icvybz_adev_placeme_ef35ff_idx'),
        ),
        migrations.AddIndex(
            model_name='adevent',
            index=models.Index(fields=['story', 'event_type', 'created_at'], name='icvybz_adev_story_i_b921c5_idx'),
        ),
        migrations.AddIndex(
            model_name='adevent',
            index=models.Index(fields=['creative', 'event_type', 'created_at'], name='icvybz_adev_creativ_1e67f5_idx'),
        ),
    ]
