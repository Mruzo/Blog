"""
Management command to send abandoned cart reminder emails.

This command should be run periodically (e.g., via cron) to send reminders for abandoned carts:
- 24 hours after cart was last updated
- 3 days after cart was last updated
- 7 days after cart was last updated

Usage:
    python manage.py send_abandoned_cart_reminders
"""

from django.core.management.base import BaseCommand
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from snmov.models import Product
from snmov.utils.email_notifications import send_abandoned_cart_reminder
from snmov.utils.cart import get_cart_for_session
from django.http import HttpRequest
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send abandoned cart reminder emails to users with items in their cart'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=1,
            help='Number of days since cart was last updated (default: 1)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without actually sending emails',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No emails will be sent'))
        
        # Calculate cutoff time
        cutoff_time = timezone.now() - timedelta(days=days)
        
        # Track which users we've already sent reminders to (to avoid duplicates)
        users_notified = set()
        
        # Get all active sessions
        active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
        
        carts_found = 0
        emails_sent = 0
        errors = 0
        
        for session in active_sessions:
            try:
                session_data = session.get_decoded()
                cart = session_data.get('cart', {})
                
                # Skip if no cart
                if not cart:
                    continue
                
                # Get user ID from session
                user_id = session_data.get('_auth_user_id')
                if not user_id:
                    continue  # Anonymous cart, skip
                
                # Skip if we've already notified this user
                if user_id in users_notified:
                    continue
                
                # Get user
                try:
                    user = User.objects.get(id=int(user_id))
                except User.DoesNotExist:
                    continue
                
                # Check if cart has items with timestamps
                cart_has_timestamp = False
                oldest_item_time = None
                
                for product_id, details in cart.items():
                    added_at = details.get('added_at')
                    if added_at:
                        cart_has_timestamp = True
                        try:
                            from django.utils.dateparse import parse_datetime
                            added_datetime = parse_datetime(added_at)
                            if added_datetime:
                                if oldest_item_time is None or added_datetime < oldest_item_time:
                                    oldest_item_time = added_datetime
                        except (ValueError, TypeError):
                            continue
                
                # Skip if cart doesn't have timestamps or is too recent
                if not cart_has_timestamp or not oldest_item_time:
                    continue
                
                # Check if cart is old enough for reminder
                if oldest_item_time > cutoff_time:
                    continue
                
                # Calculate days abandoned
                days_abandoned = (timezone.now() - oldest_item_time).days
                
                # Only send reminders at specific intervals (1, 3, 7 days)
                if days_abandoned not in [1, 3, 7]:
                    continue
                
                carts_found += 1
                
                # Build cart items for email
                cart_items = []
                total_price = 0
                
                for product_id, details in cart.items():
                    try:
                        product = Product.objects.get(uuid=product_id)
                        quantity = details.get('quantity', 0)
                        if quantity > 0:
                            cart_items.append({
                                'product': product,
                                'quantity': quantity,
                            })
                            total_price += product.get_discounted_price() * quantity
                    except Product.DoesNotExist:
                        continue
                
                # Skip if no valid items
                if not cart_items:
                    continue
                
                # Send reminder email
                if not dry_run:
                    try:
                        send_abandoned_cart_reminder(user, cart_items, total_price, days_abandoned)
                        emails_sent += 1
                        users_notified.add(user_id)
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Sent reminder to {user.email} (cart abandoned {days_abandoned} days ago)'
                            )
                        )
                    except Exception as e:
                        errors += 1
                        logger.error(f"Failed to send abandoned cart reminder to {user.email}: {e}")
                        self.stdout.write(
                            self.style.ERROR(f'Error sending to {user.email}: {e}')
                        )
                else:
                    self.stdout.write(
                        f'Would send reminder to {user.email} (cart abandoned {days_abandoned} days ago, {len(cart_items)} items, ${total_price:.2f})'
                    )
                    users_notified.add(user_id)
                    
            except Exception as e:
                errors += 1
                logger.error(f"Error processing session {session.session_key}: {e}")
                continue
        
        # Summary
        self.stdout.write(self.style.SUCCESS(
            f'\nSummary: Found {carts_found} abandoned carts, sent {emails_sent} emails, {errors} errors'
        ))




