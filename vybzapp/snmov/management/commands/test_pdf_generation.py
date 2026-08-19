"""
Django management command to test PDF generation for invoices and credit notes.
This creates sample PDFs for testing purposes.

Usage:
    python manage.py test_pdf_generation
    python manage.py test_pdf_generation --invoice-only
    python manage.py test_pdf_generation --credit-note-only
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import os

from snmov.models import Order, OrderItem, Product, Invoice, ReturnRequest, ReturnItem, CreditNote
from snmov.utils.pdf_generation import generate_pdf


class Command(BaseCommand):
    help = 'Generate test PDFs for invoices and credit notes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--invoice-only',
            action='store_true',
            help='Only generate invoice PDF',
        )
        parser.add_argument(
            '--credit-note-only',
            action='store_true',
            help='Only generate credit note PDF',
        )
        parser.add_argument(
            '--order-id',
            type=int,
            help='Use existing order ID for invoice generation',
        )
        parser.add_argument(
            '--return-id',
            type=int,
            help='Use existing return request ID for credit note generation',
        )

    def handle(self, *args, **options):
        invoice_only = options['invoice_only']
        credit_note_only = options['credit_note_only']
        order_id = options.get('order_id')
        return_id = options.get('return_id')

        if not invoice_only:
            self.generate_credit_note_pdf(return_id)
        
        if not credit_note_only:
            self.generate_invoice_pdf(order_id)

    def generate_invoice_pdf(self, order_id=None):
        """Generate a test invoice PDF"""
        self.stdout.write(self.style.SUCCESS('\n=== Generating Invoice PDF ==='))
        
        try:
            if order_id:
                # Use existing order
                try:
                    order = Order.objects.select_related('customer', 'shipping_address').prefetch_related('orderitem_set__product').get(id=order_id)
                    self.stdout.write(f'Using existing order #{order.id}')
                except Order.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f'Order #{order_id} not found'))
                    return
            else:
                # Find a recent order with items - use orderitem (lowercase) for filter
                order = Order.objects.select_related('customer', 'shipping_address').prefetch_related('orderitem_set__product').filter(
                    orderitem__isnull=False
                ).distinct().first()
                
                if not order:
                    self.stdout.write(self.style.WARNING('No orders found. Creating a mock order for testing...'))
                    # Create a minimal mock order structure
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    user = User.objects.first()
                    if not user:
                        self.stdout.write(self.style.ERROR('No users found. Please create a user first.'))
                        return
                    
                    # Get a product
                    product = Product.objects.filter(available=True).first()
                    if not product:
                        self.stdout.write(self.style.ERROR('No products found. Please create a product first.'))
                        return
                    
                    # Create a minimal order object for testing
                    from snmov.models import ShippingAddress
                    shipping_address = ShippingAddress.objects.filter(user=user).first()
                    if not shipping_address:
                        self.stdout.write(self.style.ERROR('No shipping addresses found. Please create a shipping address first.'))
                        return
                    
                    order = Order.objects.create(
                        customer=user,
                        shipping_address=shipping_address,
                        status='DELIVERED',
                        order_date=timezone.now() - timedelta(days=5),
                        shipping_cost=10.00
                    )
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=2
                    )
                    self.stdout.write(f'Created test order #{order.id}')
            
            # Get or create invoice
            invoice, created = Invoice.objects.get_or_create(order=order)
            if created:
                self.stdout.write(f'Created invoice {invoice.invoice_number}')
            else:
                self.stdout.write(f'Using existing invoice {invoice.invoice_number}')
            
            # Generate PDF
            context = {
                'order': order,
                'invoice': invoice
            }
            
            pdf_path = generate_pdf(
                template_name='pdf/invoice.html',
                context=context,
                filename=f'test_invoice_{order.id}.pdf',
                pdf_type='invoice'
            )
            
            from snm.media_files import media_url

            self.stdout.write(self.style.SUCCESS(f'✓ Invoice PDF generated: {pdf_path}'))
            self.stdout.write(f'  Access at: {media_url(pdf_path)}')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error generating invoice PDF: {e}'))
            import traceback
            self.stdout.write(traceback.format_exc())

    def generate_credit_note_pdf(self, return_id=None):
        """Generate a test credit note PDF"""
        self.stdout.write(self.style.SUCCESS('\n=== Generating Credit Note PDF ==='))
        
        try:
            if return_id:
                # Use existing return request
                try:
                    return_request = ReturnRequest.objects.select_related(
                        'order', 'customer'
                    ).prefetch_related(
                        'returnitem_set__order_item__product'
                    ).get(id=return_id)
                    self.stdout.write(f'Using existing return request #{return_request.id}')
                except ReturnRequest.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f'Return request #{return_id} not found'))
                    return
            else:
                # Find a return request with credit note
                return_request = ReturnRequest.objects.select_related(
                    'order', 'customer'
                ).prefetch_related(
                    'returnitem_set__order_item__product'
                ).filter(
                    status='APPROVED',
                    credit_note__isnull=False
                ).first()
                
                if not return_request:
                    self.stdout.write(self.style.WARNING('No approved return requests with credit notes found.'))
                    self.stdout.write('Creating a mock return request for testing...')
                    
                    # Find a delivered order
                    order = Order.objects.select_related('customer', 'shipping_address').prefetch_related('orderitem_set__product').filter(
                        status='DELIVERED',
                        orderitem__isnull=False
                    ).first()
                    
                    if not order:
                        self.stdout.write(self.style.ERROR('No delivered orders found. Please create an order first.'))
                        return
                    
                    # Create return request
                    return_request = ReturnRequest.objects.create(
                        order=order,
                        customer=order.customer,
                        reason='Test return request',
                        reason_category='changed_mind',
                        status='APPROVED',
                        return_shipping_paid_by='customer',
                        return_shipping_cost=5.00,
                        approved_at=timezone.now()
                    )
                    
                    # Add return items
                    order_item = order.orderitem_set.first()
                    ReturnItem.objects.create(
                        return_request=return_request,
                        order_item=order_item,
                        quantity=1,
                        condition='like_new'
                    )
                    
                    self.stdout.write(f'Created test return request #{return_request.id}')
            
            # Get or create credit note
            credit_note, created = CreditNote.objects.get_or_create(
                return_request=return_request,
                defaults={
                    'amount': 50.00,
                    'refund_method': 'Original payment method',
                    'status': 'PENDING'
                }
            )
            
            if created:
                self.stdout.write(f'Created credit note {credit_note.credit_note_number}')
            else:
                self.stdout.write(f'Using existing credit note {credit_note.credit_note_number}')
            
            # Generate PDF
            context = {
                'return_request': return_request,
                'credit_note': credit_note
            }
            
            pdf_path = generate_pdf(
                template_name='pdf/credit_note.html',
                context=context,
                filename=f'test_credit_note_{return_request.id}.pdf',
                pdf_type='credit_note'
            )
            
            from snm.media_files import media_url

            self.stdout.write(self.style.SUCCESS(f'✓ Credit Note PDF generated: {pdf_path}'))
            self.stdout.write(f'  Access at: {media_url(pdf_path)}')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error generating credit note PDF: {e}'))
            import traceback
            self.stdout.write(traceback.format_exc())
