# Generated manually - Django migration for feedback app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import django.core.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='FeedbackTicket',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ticket_number', models.CharField(db_index=True, max_length=50, unique=True)),
                ('submitted_by_name', models.CharField(max_length=100)),
                ('submitted_by_email', models.EmailField(max_length=254)),
                ('subject', models.CharField(max_length=200, validators=[django.core.validators.MinLengthValidator(3)])),
                ('message', models.TextField(validators=[django.core.validators.MinLengthValidator(10)])),
                ('category', models.CharField(choices=[('bug', 'Bug Report'), ('feature_request', 'Feature Request'), ('question', 'General Question'), ('technical_support', 'Technical Support'), ('billing', 'Billing/Order Issue'), ('account', 'Account Issue'), ('content', 'Content/Story Issue'), ('collaboration', 'Collaboration Issue'), ('other', 'Other')], default='other', max_length=50)),
                ('priority', models.CharField(choices=[('low', 'Low Priority'), ('medium', 'Medium Priority'), ('high', 'High Priority'), ('urgent', 'Urgent')], default='medium', max_length=20)),
                ('status', models.CharField(choices=[('new', 'New'), ('open', 'Open/In Progress'), ('waiting_user', 'Waiting for User Response'), ('waiting_internal', 'Waiting for Internal Action'), ('resolved', 'Resolved'), ('closed', 'Closed')], default='new', max_length=20)),
                ('source', models.CharField(choices=[('contact_form', 'Contact Form'), ('feedback_modal', 'Feedback Modal'), ('api', 'API Submission'), ('admin', 'Admin Created'), ('email', 'Email Import')], default='contact_form', max_length=50)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('first_response_at', models.DateTimeField(blank=True, null=True)),
                ('resolution_notes', models.TextField(blank=True)),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_tickets', to=settings.AUTH_USER_MODEL)),
                ('related_episode_id', models.IntegerField(blank=True, null=True)),
                ('related_order_id', models.IntegerField(blank=True, null=True)),
                ('related_studio_id', models.IntegerField(blank=True, null=True)),
                ('related_story_id', models.IntegerField(blank=True, null=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedback_tickets', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TicketComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('author_name', models.CharField(blank=True, max_length=100)),
                ('author_email', models.EmailField(blank=True, max_length=254)),
                ('content', models.TextField(validators=[django.core.validators.MinLengthValidator(1)])),
                ('is_internal', models.BooleanField(default=False)),
                ('is_staff_response', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ticket_comments', to=settings.AUTH_USER_MODEL)),
                ('ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='feedback.feedbackticket')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='TicketStatusHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('old_status', models.CharField(blank=True, max_length=20, null=True)),
                ('new_status', models.CharField(max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_history', to='feedback.feedbackticket')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='feedbackticket',
            index=models.Index(fields=['status'], name='feedback_fe_status_idx'),
        ),
        migrations.AddIndex(
            model_name='feedbackticket',
            index=models.Index(fields=['priority'], name='feedback_fe_priority_idx'),
        ),
        migrations.AddIndex(
            model_name='feedbackticket',
            index=models.Index(fields=['assigned_to'], name='feedback_fe_assigned_idx'),
        ),
        migrations.AddIndex(
            model_name='feedbackticket',
            index=models.Index(fields=['category'], name='feedback_fe_category_idx'),
        ),
        migrations.AddIndex(
            model_name='feedbackticket',
            index=models.Index(fields=['created_at'], name='feedback_fe_created_idx'),
        ),
        migrations.AddIndex(
            model_name='feedbackticket',
            index=models.Index(fields=['ticket_number'], name='feedback_fe_ticket_n_idx'),
        ),
    ]
