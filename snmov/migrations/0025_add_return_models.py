# Generated manually for return/refund system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('snmov', '0001_initial_squashed_0024_fix_security_log_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReturnPolicy',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('return_window_days', models.PositiveIntegerField(default=30, help_text='Number of days from delivery to allow returns')),
                ('restocking_fee_percentage', models.DecimalField(decimal_places=2, default=0.0, help_text='Restocking fee as percentage (0-100)', max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(blank=True, help_text='If null, this is the global default policy', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='return_policies', to='snmov.product')),
            ],
            options={
                'verbose_name': 'Return Policy',
                'verbose_name_plural': 'Return Policies',
                'unique_together': {('product',)},
            },
        ),
        migrations.CreateModel(
            name='ReturnRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('PROCESSING', 'Processing'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('reason', models.TextField(help_text="Customer's reason for return")),
                ('reason_category', models.CharField(choices=[('defective', 'Defective/Damaged'), ('wrong_item', 'Wrong Item Received'), ('not_as_described', 'Not as Described'), ('changed_mind', 'Changed Mind'), ('size_fit', 'Size/Fit Issue'), ('quality', 'Quality Issue'), ('other', 'Other')], max_length=50)),
                ('return_window_days', models.PositiveIntegerField(default=30, help_text='Return window at time of request')),
                ('return_shipping_cost', models.DecimalField(decimal_places=2, default=0.0, help_text='Cost of return shipping', max_digits=10)),
                ('return_shipping_paid_by', models.CharField(choices=[('customer', 'Customer'), ('store', 'Store')], default='customer', max_length=20)),
                ('return_label_url', models.URLField(blank=True, null=True)),
                ('return_tracking_number', models.CharField(blank=True, max_length=100, null=True)),
                ('admin_notes', models.TextField(blank=True, help_text='Internal admin notes', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('rejected_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='return_requests', to=settings.AUTH_USER_MODEL)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='return_requests', to='snmov.order')),
            ],
            options={
                'verbose_name': 'Return Request',
                'verbose_name_plural': 'Return Requests',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ReturnItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField()),
                ('condition', models.CharField(choices=[('new', 'New/Unopened'), ('like_new', 'Like New'), ('good', 'Good'), ('fair', 'Fair'), ('poor', 'Poor'), ('damaged', 'Damaged')], default='good', max_length=20)),
                ('condition_notes', models.TextField(blank=True, help_text='Additional notes about item condition', null=True)),
                ('order_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='returnitem_set', to='snmov.orderitem')),
                ('return_request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='returnitem_set', to='snmov.returnrequest')),
            ],
            options={
                'verbose_name': 'Return Item',
                'verbose_name_plural': 'Return Items',
            },
        ),
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('invoice_number', models.CharField(max_length=50, unique=True)),
                ('pdf_path', models.CharField(blank=True, max_length=500, null=True)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('regenerated_at', models.DateTimeField(blank=True, null=True)),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='invoice', to='snmov.order')),
            ],
            options={
                'verbose_name': 'Invoice',
                'verbose_name_plural': 'Invoices',
                'ordering': ['-generated_at'],
            },
        ),
        migrations.CreateModel(
            name='CreditNote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('credit_note_number', models.CharField(max_length=50, unique=True)),
                ('pdf_path', models.CharField(blank=True, max_length=500, null=True)),
                ('stripe_refund_id', models.CharField(blank=True, max_length=255, null=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('ISSUED', 'Issued'), ('REFUNDED', 'Refunded'), ('FAILED', 'Failed')], default='PENDING', max_length=20)),
                ('refund_method', models.CharField(default='Original payment method', max_length=50)),
                ('regenerated_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('return_request', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='credit_note', to='snmov.returnrequest')),
            ],
            options={
                'verbose_name': 'Credit Note',
                'verbose_name_plural': 'Credit Notes',
                'ordering': ['-created_at'],
            },
        ),
    ]
