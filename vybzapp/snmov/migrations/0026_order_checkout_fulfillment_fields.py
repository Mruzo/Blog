# Generated manually for checkout / payment / returns hardening

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('snmov', '0025_add_return_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='stripe_checkout_session_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='payment_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='order_confirmation_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='amount_paid_cents',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Total charged via Stripe Checkout (in cents), for refunds and reconciliation',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_rates_snapshot',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='order',
            name='delivered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
