"""
PDF generation utility for invoices and credit notes
Requires: pip install reportlab
"""
import os
from django.conf import settings
from django.template.loader import render_to_string
from io import BytesIO
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("reportlab not installed. PDF generation will not work. Install with: pip install reportlab")


def generate_pdf(template_name, context, filename, pdf_type='invoice'):
    """
    Generate PDF document for invoice or credit note.
    
    Args:
        template_name: Template name (for reference, not used with reportlab)
        context: Context dict with order/invoice/credit_note data
        filename: Output filename (without extension)
        pdf_type: 'invoice' or 'credit_note'
        
    Returns:
        str: Path to generated PDF file
    """
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is required for PDF generation. Install with: pip install reportlab")
    
    # Create media directory if it doesn't exist
    if pdf_type == 'invoice':
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
    else:  # credit_note
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'credit-notes')
    
    os.makedirs(pdf_dir, exist_ok=True)
    
    # Full path to PDF file
    pdf_path = os.path.join(pdf_dir, f'{filename}')
    # Ensure we have the correct full path
    if pdf_path.startswith(settings.MEDIA_ROOT):
        full_pdf_path = pdf_path
    else:
        full_pdf_path = os.path.join(settings.MEDIA_ROOT, pdf_path.lstrip('/'))
    
    # Create PDF document
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Container for PDF elements
    elements = []
    
    # Styles - Using Helvetica as it's similar to Quicksand (sans-serif, clean)
    # ReportLab doesn't have Quicksand built-in, but Helvetica is a good alternative
    styles = getSampleStyleSheet()
    
    # Try to use a font similar to Quicksand - Helvetica is clean and modern
    font_name = 'Helvetica'
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=24,
        textColor=colors.HexColor('#333333'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontName=font_name,
        fontSize=14,
        textColor=colors.HexColor('#333333'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10
    )
    
    # Title
    if pdf_type == 'invoice':
        title = "INVOICE"
        invoice = context.get('invoice')
        order = context.get('order')
        if invoice and hasattr(invoice, 'invoice_number'):
            doc_number = invoice.invoice_number
        elif order and hasattr(order, 'id'):
            doc_number = str(order.id)
        else:
            doc_number = ''
    else:  # credit_note
        title = "CREDIT NOTE"
        credit_note = context.get('credit_note')
        return_request = context.get('return_request')
        if credit_note and hasattr(credit_note, 'credit_note_number'):
            doc_number = credit_note.credit_note_number
        elif return_request and hasattr(return_request, 'id'):
            doc_number = str(return_request.id)
        else:
            doc_number = ''
    
    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Document number and date
    doc_info_data = [
        [f'<b>{title} #:</b>', doc_number],
        [f'<b>Date:</b>', datetime.now().strftime('%B %d, %Y')],
    ]
    
    if pdf_type == 'invoice':
        order = context.get('order')
        if order:
            doc_info_data.append([f'<b>Order #:</b>', str(order.id)])
            doc_info_data.append([f'<b>Order Date:</b>', order.order_date.strftime('%B %d, %Y') if hasattr(order.order_date, 'strftime') else str(order.order_date)])
    else:  # credit_note
        return_request = context.get('return_request')
        if return_request:
            doc_info_data.append([f'<b>Return #:</b>', str(return_request.id)])
            doc_info_data.append([f'<b>Return Date:</b>', return_request.created_at.strftime('%B %d, %Y') if hasattr(return_request.created_at, 'strftime') else str(return_request.created_at)])
    
    doc_info_table = Table(doc_info_data, colWidths=[2*inch, 3*inch])
    doc_info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), font_name + '-Bold'),
        ('FONTNAME', (1, 0), (1, -1), font_name),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(doc_info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Customer/Company info
    if pdf_type == 'invoice':
        order = context.get('order')
        if order and hasattr(order, 'customer'):
            customer = order.customer
            customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
            customer_email = customer.email
        else:
            customer_name = "Customer"
            customer_email = ""
    else:  # credit_note
        return_request = context.get('return_request')
        if return_request and hasattr(return_request, 'customer'):
            customer = return_request.customer
            customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
            customer_email = customer.email
        else:
            customer_name = "Customer"
            customer_email = ""
    
    # Company info (from settings)
    company_name = getattr(settings, 'DEFAULT_SENDER_NAME', 'Justvybz Inc.')
    company_address = f"{getattr(settings, 'DEFAULT_SENDER_STREET1', '')}\n{getattr(settings, 'DEFAULT_SENDER_CITY', '')}, {getattr(settings, 'DEFAULT_SENDER_STATE', '')} {getattr(settings, 'DEFAULT_SENDER_ZIP', '')}"
    
    # Two column layout for company and customer
    info_data = [
        ['<b>From:</b>', '<b>To:</b>'],
        [company_name, customer_name],
        [company_address, customer_email],
    ]
    
    info_table = Table(info_data, colWidths=[3.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), font_name + '-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Items table
    elements.append(Paragraph('<b>Items</b>', heading_style))
    
    if pdf_type == 'invoice':
        order = context.get('order')
        items_data = [['Description', 'Quantity', 'Unit Price', 'Total']]
        total = 0
        # Try both orderitem_set and orderitem (depending on related_name)
        order_items = None
        if hasattr(order, 'orderitem_set'):
            order_items = order.orderitem_set.all()
        elif hasattr(order, 'orderitem'):
            # If it's a manager/property, get all items
            if hasattr(order.orderitem, 'all'):
                order_items = order.orderitem.all()
            else:
                # It might be a single item, convert to list
                order_items = [order.orderitem] if order.orderitem else []
        
        if order_items:
            for item in order_items:
                unit_price = float(item.product.get_discounted_price())
                quantity = item.quantity
                item_total = unit_price * quantity
                total += item_total
                items_data.append([
                    item.product.title,
                    str(quantity),
                    f"${unit_price:.2f}",
                    f"${item_total:.2f}"
                ])
        
        # Calculate subtotal
        subtotal = total
        
        # Add shipping if applicable
        shipping_cost = float(order.shipping_cost) if order and hasattr(order, 'shipping_cost') else 0
        if shipping_cost > 0:
            items_data.append(['Shipping', '1', f"${shipping_cost:.2f}", f"${shipping_cost:.2f}"])
            total += shipping_cost
        
        # Add tax if enabled
        tax_rate = getattr(settings, 'TAX_RATE', 0.13)  # Default 13% (HST in Ontario)
        tax_enabled = getattr(settings, 'TAX_ENABLED', True)
        tax_amount = 0
        tax_percentage = 0
        if tax_enabled and tax_rate > 0:
            # Calculate tax on subtotal + shipping
            tax_amount = subtotal * float(tax_rate)
            tax_percentage = float(tax_rate) * 100
            items_data.append([f'Tax (HST {tax_percentage:.1f}%)', '1', f"${tax_amount:.2f}", f"${tax_amount:.2f}"])
            total += tax_amount
        
        # Add subtotal row
        items_data.append(['', '', '<b>Subtotal:</b>', f'<b>${subtotal:.2f}</b>'])
        if shipping_cost > 0:
            items_data.append(['', '', 'Shipping:', f'${shipping_cost:.2f}'])
        if tax_enabled and tax_amount > 0:
            items_data.append(['', '', f'Tax (HST {tax_percentage:.1f}%):', f'${tax_amount:.2f}'])
        items_data.append(['', '', '<b>Total:</b>', f'<b>${total:.2f}</b>'])
    else:  # credit_note
        return_request = context.get('return_request')
        credit_note = context.get('credit_note')
        items_data = [['Description', 'Quantity', 'Unit Price', 'Refund Amount']]
        total = 0
        if return_request and hasattr(return_request, 'returnitem_set'):
            for return_item in return_request.returnitem_set.all():
                unit_price = float(return_item.order_item.product.get_discounted_price())
                quantity = return_item.quantity
                item_total = unit_price * quantity
                total += item_total
                items_data.append([
                    return_item.order_item.product.title,
                    str(quantity),
                    f"${unit_price:.2f}",
                    f"${item_total:.2f}"
                ])
        
        # Deduct return shipping if customer pays
        if return_request and return_request.return_shipping_paid_by == 'customer':
            shipping_cost = float(return_request.return_shipping_cost)
            if shipping_cost > 0:
                items_data.append(['Return Shipping', '1', f"${shipping_cost:.2f}", f"-${shipping_cost:.2f}"])
                total -= shipping_cost
        
        refund_amount = float(credit_note.amount) if credit_note else total
        items_data.append(['', '', '<b>Refund Amount:</b>', f'<b>${refund_amount:.2f}</b>'])
        total = refund_amount
    
    items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1.5*inch, 1.5*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#333333')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), font_name + '-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -2), 1, colors.HexColor('#cccccc')),
        ('LINEBELOW', (0, -2), (-1, -2), 2, colors.HexColor('#333333')),
        ('FONTNAME', (0, -1), (-1, -1), font_name + '-Bold'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Notes
    if pdf_type == 'credit_note':
        notes = "This credit note represents a refund for returned items. The refund will be processed to your original payment method."
    else:
        notes = "Thank you for your order!"
    
    elements.append(Paragraph(f'<b>Notes:</b>', normal_style))
    elements.append(Paragraph(notes, normal_style))
    
    # Build PDF
    doc.build(elements)
    
    # Save to file
    with open(full_pdf_path, 'wb') as f:
        f.write(buffer.getvalue())
    
    # Return relative path from MEDIA_ROOT (for storage in database)
    # Remove MEDIA_ROOT prefix if present, otherwise return path relative to MEDIA_ROOT
    if full_pdf_path.startswith(settings.MEDIA_ROOT):
        relative_path = os.path.relpath(full_pdf_path, settings.MEDIA_ROOT)
    else:
        relative_path = pdf_path.replace(settings.MEDIA_ROOT + '/', '').lstrip('/')
    
    return relative_path
