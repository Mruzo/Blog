from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinLengthValidator


class FeedbackTicket(models.Model):
    """Main ticket/feedback record"""
    
    CATEGORY_CHOICES = [
        ('bug', 'Bug Report'),
        ('feature_request', 'Feature Request'),
        ('question', 'General Question'),
        ('technical_support', 'Technical Support'),
        ('billing', 'Billing/Order Issue'),
        ('account', 'Account Issue'),
        ('content', 'Content/Story Issue'),
        ('collaboration', 'Collaboration Issue'),
        ('other', 'Other'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low Priority'),
        ('medium', 'Medium Priority'),
        ('high', 'High Priority'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('open', 'Open/In Progress'),
        ('waiting_user', 'Waiting for User Response'),
        ('waiting_internal', 'Waiting for Internal Action'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    SOURCE_CHOICES = [
        ('contact_form', 'Contact Form'),
        ('feedback_modal', 'Feedback Modal'),
        ('api', 'API Submission'),
        ('admin', 'Admin Created'),
        ('email', 'Email Import'),
    ]
    
    # Core fields
    ticket_number = models.CharField(max_length=50, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback_tickets')
    submitted_by_name = models.CharField(max_length=100)
    submitted_by_email = models.EmailField()
    
    # Ticket content
    subject = models.CharField(max_length=200, validators=[MinLengthValidator(3)])
    message = models.TextField(validators=[MinLengthValidator(10)])
    
    # Classification
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    
    # Assignment
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    
    # Source tracking
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='contact_form')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    # Related objects (optional) - using string references for lazy loading
    related_story = models.ForeignKey('icvybz.Comic', on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback_tickets', db_column='related_story_id')
    related_episode = models.ForeignKey('icvybz.Episode', on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback_tickets', db_column='related_episode_id')
    related_studio = models.ForeignKey('icvybz.Studio', on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback_tickets', db_column='related_studio_id')
    related_order = models.ForeignKey('snmov.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback_tickets', db_column='related_order_id')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    
    # Resolution
    resolution_notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['category']),
            models.Index(fields=['created_at']),
            models.Index(fields=['ticket_number']),
        ]
    
    def __str__(self):
        return f"{self.ticket_number} - {self.subject}"
    
    def save(self, *args, **kwargs):
        if not self.ticket_number:
            # Generate ticket number: TKT-YYYYMMDD-XXXXX (sequential per day)
            from .utils import generate_ticket_number
            self.ticket_number = generate_ticket_number()
        super().save(*args, **kwargs)
    
    @property
    def is_resolved(self):
        return self.status in ['resolved', 'closed']
    
    @property
    def is_closed(self):
        return self.status == 'closed'


class TicketComment(models.Model):
    """Comments/notes on tickets (both user and staff)"""
    
    ticket = models.ForeignKey(FeedbackTicket, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ticket_comments')
    author_name = models.CharField(max_length=100, blank=True)  # For non-logged-in users
    author_email = models.EmailField(blank=True)  # For non-logged-in users
    content = models.TextField(validators=[MinLengthValidator(1)])
    is_internal = models.BooleanField(default=False)  # Internal staff notes (not visible to user)
    is_staff_response = models.BooleanField(default=False)  # Marks official staff response
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'feedback'
        ordering = ['created_at']
    
    def __str__(self):
        author_display = self.author.username if self.author else self.author_name
        return f"Comment by {author_display} on {self.ticket.ticket_number}"


class TicketStatusHistory(models.Model):
    """Audit trail of status changes"""
    
    ticket = models.ForeignKey(FeedbackTicket, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)  # Optional note about change
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'feedback'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.ticket.ticket_number}: {self.old_status} → {self.new_status}"
