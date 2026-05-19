from django.contrib import admin
from .models import FeedbackTicket, TicketComment, TicketStatusHistory


@admin.register(FeedbackTicket)
class FeedbackTicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'status', 'subject', 'user', 'submitted_by_email', 'category', 'priority',  'assigned_to', 'created_at', 'updated_at')
    list_filter = ('status', 'priority', 'category', 'assigned_to', 'created_at', 'source')
    search_fields = ('ticket_number', 'subject', 'message', 'submitted_by_name', 'submitted_by_email', 'user__username', 'user__email')
    readonly_fields = ('ticket_number', 'created_at', 'updated_at', 'resolved_at', 'closed_at', 'first_response_at')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Ticket Information', {
            'fields': ('ticket_number', 'subject', 'message', 'category', 'priority', 'status')
        }),
        ('Submitter Information', {
            'fields': ('user', 'submitted_by_name', 'submitted_by_email')
        }),
        ('Assignment', {
            'fields': ('assigned_to',)
        }),
        ('Related Objects', {
            'fields': ('related_story', 'related_episode', 'related_studio', 'related_order'),
            'classes': ('collapse',)
        }),
        ('Source & Tracking', {
            'fields': ('source', 'ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
        ('Resolution', {
            'fields': ('resolution_notes', 'resolved_at', 'closed_at', 'first_response_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'assigned_to', 'related_story', 'related_episode', 'related_studio', 'related_order')


@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'author', 'author_name', 'is_internal', 'is_staff_response', 'created_at')
    list_filter = ('is_internal', 'is_staff_response', 'created_at')
    search_fields = ('ticket__ticket_number', 'content', 'author__username', 'author_name', 'author_email')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Comment Information', {
            'fields': ('ticket', 'content', 'is_internal', 'is_staff_response')
        }),
        ('Author Information', {
            'fields': ('author', 'author_name', 'author_email')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('ticket', 'author')


@admin.register(TicketStatusHistory)
class TicketStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'old_status', 'new_status', 'changed_by', 'created_at')
    list_filter = ('new_status', 'created_at')
    search_fields = ('ticket__ticket_number', 'notes')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('ticket', 'changed_by')
