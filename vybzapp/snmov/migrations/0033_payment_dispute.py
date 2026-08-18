# Generated manually for PaymentDispute

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('snmov', '0031_activate_custom_user'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentDispute',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_dispute_id', models.CharField(db_index=True, max_length=255, unique=True)),
                ('stripe_charge_id', models.CharField(blank=True, db_index=True, default='', max_length=255)),
                ('stripe_payment_intent_id', models.CharField(blank=True, db_index=True, default='', max_length=255)),
                ('amount_cents', models.PositiveIntegerField(default=0)),
                ('currency', models.CharField(default='cad', max_length=10)),
                ('reason', models.CharField(blank=True, default='', max_length=100)),
                ('status', models.CharField(choices=[('warning_needs_response', 'Warning needs response'), ('warning_under_review', 'Warning under review'), ('warning_closed', 'Warning closed'), ('needs_response', 'Needs response'), ('under_review', 'Under review'), ('charge_refunded', 'Charge refunded'), ('won', 'Won'), ('lost', 'Lost'), ('other', 'Other')], default='needs_response', max_length=40)),
                ('evidence_due_by', models.DateTimeField(blank=True, null=True)),
                ('is_charge_refundable', models.BooleanField(blank=True, null=True)),
                ('raw_payload', models.JSONField(blank=True, default=dict)),
                ('response_draft', models.TextField(blank=True, default='', help_text='Editable dispute response / evidence narrative for Stripe')),
                ('response_submitted_at', models.DateTimeField(blank=True, null=True)),
                ('last_alerted_at', models.DateTimeField(blank=True, null=True)),
                ('trending_alert_sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_disputes', to='snmov.order')),
            ],
            options={
                'verbose_name': 'Payment Dispute',
                'verbose_name_plural': 'Payment Disputes',
                'ordering': ['-created_at'],
            },
        ),
    ]
