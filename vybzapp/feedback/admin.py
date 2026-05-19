from django.contrib import admin
from django.utils.html import format_html

from .models import FeedbackTicket, TicketComment, TicketStatusHistory

RESOLVED_STATUSES = ('resolved', 'closed')

STATUS_BADGE_STYLES = {
    'new': ('#dc3545', '#fff'),
    'open': ('#fd7e14', '#fff'),
    'waiting_user': ('#0d6efd', '#fff'),
    'waiting_internal': ('#ffc107', '#212529'),
    'resolved': ('#198754', '#fff'),
    'closed': ('#6c757d', '#fff'),
}

PRIORITY_BADGE_STYLES = {
    'urgent': ('#dc3545', '#fff'),
    'high': ('#fd7e14', '#fff'),
}


class TicketViewFilter(admin.SimpleListFilter):
    """Default changelist shows active tickets; use sidebar to include resolved/closed or all."""

    title = 'view'
    parameter_name = 'view'

    def lookups(self, request, model_admin):
        return (
            ('active', 'Active (needs attention)'),
            ('resolved', 'Resolved & closed'),
            ('all', 'All tickets'),
        )

    def queryset(self, request, queryset):
        view = self.value() or 'active'
        if view == 'all':
            return queryset
        if view == 'resolved':
            return queryset.filter(status__in=RESOLVED_STATUSES)
        # Active: hide resolved/closed unless a specific status filter is applied.
        if request.GET.get('status__exact'):
            return queryset
        return queryset.exclude(status__in=RESOLVED_STATUSES)

    def choices(self, changelist):
        view = self.value() or 'active'
        for lookup, title in self.lookup_choices:
            yield {
                'selected': str(lookup) == view,
                'query_string': changelist.get_query_string({self.parameter_name: lookup}),
                'display': title,
            }


@admin.register(FeedbackTicket)
class FeedbackTicketAdmin(admin.ModelAdmin):
    list_display = (
        'ticket_number',
        'status_badge',
        'priority_badge',
        'subject',
        'user',
        'submitted_by_email',
        'category',
        'assigned_to',
        'created_at',
        'updated_at',
    )
    list_filter = (
        TicketViewFilter,
        'status',
        'priority',
        'category',
        'assigned_to',
        'created_at',
        'source',
    )
    list_display_links = ('ticket_number', 'subject')
    search_fields = (
        'ticket_number',
        'subject',
        'message',
        'submitted_by_name',
        'submitted_by_email',
        'user__username',
        'user__email',
    )
    readonly_fields = (
        'ticket_number',
        'created_at',
        'updated_at',
        'resolved_at',
        'closed_at',
        'first_response_at',
    )
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

    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        bg, fg = STATUS_BADGE_STYLES.get(obj.status, ('#6c757d', '#fff'))
        label = obj.get_status_display()
        return format_html(
            '<span style="display:inline-block;padding:3px 8px;border-radius:4px;'
            'font-size:11px;font-weight:600;background:{};color:{};white-space:nowrap;">{}</span>',
            bg,
            fg,
            label,
        )

    @admin.display(description='Priority', ordering='priority')
    def priority_badge(self, obj):
        if obj.priority not in PRIORITY_BADGE_STYLES:
            return obj.get_priority_display()
        bg, fg = PRIORITY_BADGE_STYLES[obj.priority]
        label = obj.get_priority_display()
        return format_html(
            '<span style="display:inline-block;padding:2px 6px;border-radius:4px;'
            'font-size:10px;font-weight:600;background:{};color:{};white-space:nowrap;">{}</span>',
            bg,
            fg,
            label,
        )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'user',
            'assigned_to',
            'related_story',
            'related_episode',
            'related_studio',
            'related_order',
        )


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
