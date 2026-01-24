"""Utility functions for feedback/ticketing system"""
from django.utils import timezone
from django.db.models import Max
from .models import FeedbackTicket, TicketComment, TicketStatusHistory


def generate_ticket_number():
    """Generate a unique ticket number in format TKT-YYYYMMDD-XXXXX"""
    from django.db import transaction
    date_str = timezone.now().strftime('%Y%m%d')
    prefix = f"TKT-{date_str}-"
    
    # Use database query to find max sequence for today
    # This is more efficient and handles concurrency better
    with transaction.atomic():
        # Get all tickets for today
        today_tickets = FeedbackTicket.objects.filter(
            ticket_number__startswith=prefix
        ).values_list('ticket_number', flat=True)
        
        max_seq = 0
        for ticket_number in today_tickets:
            try:
                # Extract sequence from ticket number (last part after last dash)
                seq_str = ticket_number.split('-')[-1]
                seq_num = int(seq_str)
                max_seq = max(max_seq, seq_num)
            except (ValueError, IndexError):
                continue
        
        next_seq = max_seq + 1
        
        # Format as 5-digit number with leading zeros
        sequence = str(next_seq).zfill(5)
        ticket_number = f"{prefix}{sequence}"
        
        # Double-check uniqueness (handle race conditions)
        while FeedbackTicket.objects.filter(ticket_number=ticket_number).exists():
            next_seq += 1
            sequence = str(next_seq).zfill(5)
            ticket_number = f"{prefix}{sequence}"
        
        return ticket_number


def create_status_history(ticket, old_status, new_status, changed_by, notes=''):
    """Create a status history entry"""
    TicketStatusHistory.objects.create(
        ticket=ticket,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        notes=notes
    )


def update_ticket_status(ticket, new_status, changed_by, notes=''):
    """Update ticket status and create history entry"""
    old_status = ticket.status
    ticket.status = new_status
    
    # Set timestamps based on status
    if new_status == 'resolved' and not ticket.resolved_at:
        ticket.resolved_at = timezone.now()
    elif new_status == 'closed' and not ticket.closed_at:
        ticket.closed_at = timezone.now()
    
    ticket.save()
    
    # Create history entry
    create_status_history(ticket, old_status, new_status, changed_by, notes)
    
    return ticket


def check_first_response(ticket, comment):
    """Check if this is the first staff response and set timestamp"""
    if not ticket.first_response_at and comment.is_staff_response and not comment.is_internal:
        ticket.first_response_at = timezone.now()
        ticket.save()
