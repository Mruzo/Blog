"""
PDF generation utility for invoices and credit notes
Requires: pip install reportlab svglib
"""
import html
import os
from io import BytesIO
from datetime import datetime
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Flowable
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    from reportlab.graphics import renderPDF
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    Flowable = object  # type: ignore
    renderPDF = None  # type: ignore
    logger.warning("reportlab not installed. PDF generation will not work.")

try:
    from svglib.svglib import svg2rlg
    SVGLIB_AVAILABLE = True
except ImportError:
    SVGLIB_AVAILABLE = False
    svg2rlg = None  # type: ignore
    logger.warning("svglib not installed. Invoice header image will be skipped. pip install svglib")


def _find_brand_header_svg():
    """Resolve path to jv_header 1.2.svg (static) or INVOICE_HEADER_SVG override."""
    override = getattr(settings, 'INVOICE_HEADER_SVG', None)
    if override and os.path.isfile(override):
        return override
    try:
        from django.contrib.staticfiles import finders
        path = finders.find('snmov/img/jv_header 1.2.svg')
        if path and os.path.isfile(path):
            return path
    except Exception as e:
        logger.debug("staticfiles find for header svg: %s", e)
    fallback = os.path.join(
        settings.BASE_DIR, 'static', 'snmov', 'img', 'jv_header 1.2.svg'
    )
    if os.path.isfile(fallback):
        return fallback
    return None


class SVGHeaderImage(Flowable):
    """Render an SVG in a platypus flow (scaled to display_width)."""

    def __init__(self, filepath, display_width=2.8 * inch):
        Flowable.__init__(self)
        self.filepath = filepath
        self._drawing = svg2rlg(filepath)
        if self._drawing is None:
            raise ValueError(f"Could not parse SVG: {filepath}")
        dw = self._drawing.width
        dh = self._drawing.height
        if not dw or dw <= 0:
            dw, dh = 238.0, 55.32
        self._scale = float(display_width) / float(dw)
        self.width = display_width
        self.height = float(dh) * self._scale

    def draw(self):
        self.canv.saveState()
        self.canv.scale(self._scale, self._scale)
        renderPDF.draw(self._drawing, self.canv, 0, 0, showBoundary=False)
        self.canv.restoreState()


def _p(text, style):
    """Table cell: ReportLab Paragraph parses a small HTML subset (<b>, <i>, <br/>)."""
    return Paragraph(text, style)


def _esc(s):
    return html.escape(str(s), quote=False)


def _format_discount_pct(product):
    pct = float(product.discount_percentage or 0)
    if pct <= 0:
        return '—'
    if abs(pct - round(pct)) < 1e-6:
        return f'{int(round(pct))}%'
    s = f'{pct:.2f}'.rstrip('0').rstrip('.')
    return f'{s}%'


def _find_quicksand_vf():
    """Path to Quicksand variable TTF (bundled under static/snmov/fonts/)."""
    override = getattr(settings, 'INVOICE_PDF_FONT_TTF', None)
    if override and os.path.isfile(override):
        return override
    try:
        from django.contrib.staticfiles import finders
        for rel in ('snmov/fonts/Quicksand-VF.ttf',):
            p = finders.find(rel)
            if p and os.path.isfile(p):
                return p
    except Exception as e:
        logger.debug('staticfiles find Quicksand: %s', e)
    fallback = os.path.join(settings.BASE_DIR, 'static', 'snmov', 'fonts', 'Quicksand-VF.ttf')
    return fallback if os.path.isfile(fallback) else None


def _register_pdf_fonts():
    """
    Register Quicksand (Google Fonts variable TTF) for invoice/credit PDFs.
    Same file is registered as normal + bold so <b> and bold styles resolve.
    Falls back to Helvetica if loading fails.
    """
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    path = _find_quicksand_vf()
    if not path:
        return 'Helvetica', 'Helvetica-Bold'
    try:
        reg = pdfmetrics.getRegisteredFontNames()
        if 'Quicksand' not in reg:
            pdfmetrics.registerFont(TTFont('Quicksand', path))
        if 'Quicksand-Bold' not in reg:
            pdfmetrics.registerFont(TTFont('Quicksand-Bold', path))
        pdfmetrics.registerFontFamily(
            'Quicksand',
            normal='Quicksand',
            bold='Quicksand-Bold',
            italic='Quicksand',
            boldItalic='Quicksand-Bold',
        )
        return 'Quicksand', 'Quicksand-Bold'
    except Exception as e:
        logger.warning('PDF: Quicksand font unavailable, using Helvetica: %s', e)
        return 'Helvetica', 'Helvetica-Bold'


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

    if pdf_type == 'invoice':
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
    else:
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'credit-notes')

    os.makedirs(pdf_dir, exist_ok=True)

    pdf_path = os.path.join(pdf_dir, f'{filename}')
    if pdf_path.startswith(settings.MEDIA_ROOT):
        full_pdf_path = pdf_path
    else:
        full_pdf_path = os.path.join(settings.MEDIA_ROOT, pdf_path.lstrip('/'))

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
    )
    content_width = doc.width

    elements = []

    styles = getSampleStyleSheet()
    font_name, font_bold_name = _register_pdf_fonts()

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=24,
        textColor=colors.HexColor('#333333'),
        spaceAfter=16,
        alignment=TA_CENTER,
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontName=font_bold_name,
        fontSize=14,
        textColor=colors.HexColor('#333333'),
        spaceAfter=12,
        spaceBefore=12,
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
    )

    table_label_style = ParagraphStyle(
        'TblLabel',
        parent=normal_style,
        fontName=font_name,
        alignment=TA_LEFT,
    )
    table_value_style = ParagraphStyle(
        'TblValue',
        parent=normal_style,
        alignment=TA_LEFT,
    )
    items_hdr_left = ParagraphStyle(
        'ItemsHdrL',
        parent=normal_style,
        fontName=font_bold_name,
        fontSize=10,
        alignment=TA_LEFT,
    )
    items_hdr_center = ParagraphStyle(
        'ItemsHdrC',
        parent=normal_style,
        fontName=font_bold_name,
        fontSize=10,
        alignment=TA_CENTER,
    )
    items_hdr_right = ParagraphStyle(
        'ItemsHdrR',
        parent=normal_style,
        fontName=font_bold_name,
        fontSize=10,
        alignment=TA_RIGHT,
    )
    items_cell_left = ParagraphStyle(
        'ItemsCellL',
        parent=normal_style,
        alignment=TA_LEFT,
    )
    items_cell_center = ParagraphStyle(
        'ItemsCellC',
        parent=normal_style,
        alignment=TA_CENTER,
    )
    items_cell_right = ParagraphStyle(
        'ItemsCellR',
        parent=normal_style,
        alignment=TA_RIGHT,
    )
    items_cell_bold_right = ParagraphStyle(
        'ItemsCellBR',
        parent=normal_style,
        fontName=font_bold_name,
        alignment=TA_RIGHT,
    )
    from_to_hdr = ParagraphStyle(
        'FromToHdr',
        parent=normal_style,
        fontName=font_bold_name,
        alignment=TA_LEFT,
    )

    # Brand header (SVG)
    svg_path = _find_brand_header_svg()
    if svg_path and SVGLIB_AVAILABLE and svg2rlg is not None:
        try:
            logo_w = min(3.2 * inch, content_width * 0.72)
            logo = SVGHeaderImage(svg_path, display_width=logo_w)
            logo_table = Table([[logo]], colWidths=[content_width], hAlign='CENTER')
            logo_table.setStyle(
                TableStyle(
                    [
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('TOPPADDING', (0, 0), (-1, -1), 0),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                        ('LEFTPADDING', (0, 0), (-1, -1), 0),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ]
                )
            )
            elements.append(logo_table)
        except Exception as e:
            logger.warning('Invoice header SVG not drawn: %s', e)

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
    else:
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
    elements.append(Spacer(1, 0.12 * inch))

    doc_info_data = [
        [_p(f'<b>{title} #:</b>', table_label_style), _p(_esc(doc_number), table_value_style)],
        [_p('<b>Date:</b>', table_label_style), _p(_esc(datetime.now().strftime('%B %d, %Y')), table_value_style)],
    ]

    if pdf_type == 'invoice':
        order = context.get('order')
        if order:
            od = order.order_date.strftime('%B %d, %Y') if hasattr(order.order_date, 'strftime') else str(order.order_date)
            doc_info_data.append(
                [_p('<b>Order #:</b>', table_label_style), _p(_esc(str(order.id)), table_value_style)]
            )
            doc_info_data.append([_p('<b>Order Date:</b>', table_label_style), _p(_esc(od), table_value_style)])
    else:
        return_request = context.get('return_request')
        if return_request:
            rd = (
                return_request.created_at.strftime('%B %d, %Y')
                if hasattr(return_request.created_at, 'strftime')
                else str(return_request.created_at)
            )
            doc_info_data.append(
                [_p('<b>Return #:</b>', table_label_style), _p(_esc(str(return_request.id)), table_value_style)]
            )
            doc_info_data.append([_p('<b>Return Date:</b>', table_label_style), _p(_esc(rd), table_value_style)])

    doc_info_table = Table(doc_info_data, colWidths=[2 * inch, content_width - 2 * inch])
    doc_info_table.setStyle(
        TableStyle(
            [
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(doc_info_table)
    elements.append(Spacer(1, 0.3 * inch))

    if pdf_type == 'invoice':
        order = context.get('order')
        if order and hasattr(order, 'customer'):
            customer = order.customer
            customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
            customer_email = customer.email
        else:
            customer_name = "Customer"
            customer_email = ""
    else:
        return_request = context.get('return_request')
        if return_request and hasattr(return_request, 'customer'):
            customer = return_request.customer
            customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
            customer_email = customer.email
        else:
            customer_name = "Customer"
            customer_email = ""

    company_name = getattr(settings, 'DEFAULT_SENDER_NAME', 'Justvybz Inc.')
    company_address = (
        f"{getattr(settings, 'DEFAULT_SENDER_STREET1', '')}\n"
        f"{getattr(settings, 'DEFAULT_SENDER_CITY', '')}, "
        f"{getattr(settings, 'DEFAULT_SENDER_STATE', '')} "
        f"{getattr(settings, 'DEFAULT_SENDER_ZIP', '')}"
    )

    info_data = [
        [_p('<b>From:</b>', from_to_hdr), _p('<b>To:</b>', from_to_hdr)],
        [_p(_esc(company_name), table_value_style), _p(_esc(customer_name), table_value_style)],
        [_p(_esc(company_address).replace('\n', '<br/>'), table_value_style), _p(_esc(customer_email), table_value_style)],
    ]

    half = (content_width - 0.25 * inch) / 2
    info_table = Table(info_data, colWidths=[half, half])
    info_table.setStyle(
        TableStyle(
            [
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(info_table)
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph('Items', heading_style))

    if pdf_type == 'invoice':
        order = context.get('order')
        items_data = [
            [
                _p('Description', items_hdr_left),
                _p('Qty', items_hdr_center),
                _p('List', items_hdr_right),
                _p('Discount', items_hdr_center),
                _p('Price', items_hdr_right),
                _p('Amount', items_hdr_right),
            ]
        ]
        total = 0
        order_items = None
        if order is not None and hasattr(order, 'orderitem_set'):
            order_items = order.orderitem_set.all()
        elif order is not None and hasattr(order, 'orderitem'):
            if hasattr(order.orderitem, 'all'):
                order_items = order.orderitem.all()
            else:
                order_items = [order.orderitem] if order.orderitem else []

        if order_items:
            for item in order_items:
                p = item.product
                list_unit = float(p.price)
                unit_charged = float(p.get_discounted_price())
                quantity = item.quantity
                item_total = unit_charged * quantity
                total += item_total
                items_data.append(
                    [
                        _p(_esc(p.title), items_cell_left),
                        _p(_esc(str(quantity)), items_cell_center),
                        _p(_esc(f'${list_unit:.2f}'), items_cell_right),
                        _p(_esc(_format_discount_pct(p)), items_cell_center),
                        _p(_esc(f'${unit_charged:.2f}'), items_cell_right),
                        _p(_esc(f'${item_total:.2f}'), items_cell_right),
                    ]
                )

        # Subtotal = merchandise only; shipping & tax appear once in the summary block below
        subtotal = total
        shipping_cost = float(order.shipping_cost) if order and hasattr(order, 'shipping_cost') else 0
        tax_rate = getattr(settings, 'TAX_RATE', 0.13)
        tax_enabled = getattr(settings, 'TAX_ENABLED', True)
        tax_amount = 0.0
        tax_percentage = 0.0
        if tax_enabled and tax_rate > 0:
            taxable_base = subtotal + shipping_cost
            tax_amount = taxable_base * float(tax_rate)
            tax_percentage = float(tax_rate) * 100
        total = subtotal + shipping_cost + tax_amount

        items_data.append(
            [
                _p('', items_cell_left),
                _p('', items_cell_center),
                _p('', items_cell_right),
                _p('', items_cell_center),
                _p('<b>Subtotal:</b>', items_cell_bold_right),
                _p(f'<b>${subtotal:.2f}</b>', items_cell_bold_right),
            ]
        )
        if shipping_cost > 0:
            items_data.append(
                [
                    _p('', items_cell_left),
                    _p('', items_cell_center),
                    _p('', items_cell_right),
                    _p('', items_cell_center),
                    _p(_esc('Shipping:'), items_cell_right),
                    _p(_esc(f'${shipping_cost:.2f}'), items_cell_right),
                ]
            )
        if tax_enabled and tax_amount > 0:
            items_data.append(
                [
                    _p('', items_cell_left),
                    _p('', items_cell_center),
                    _p('', items_cell_right),
                    _p('', items_cell_center),
                    _p(_esc(f'Tax (HST {tax_percentage:.1f}%):'), items_cell_right),
                    _p(_esc(f'${tax_amount:.2f}'), items_cell_right),
                ]
            )
        items_data.append(
            [
                _p('', items_cell_left),
                _p('', items_cell_center),
                _p('', items_cell_right),
                _p('', items_cell_center),
                _p('<b>Total:</b>', items_cell_bold_right),
                _p(f'<b>${total:.2f}</b>', items_cell_bold_right),
            ]
        )
    else:
        return_request = context.get('return_request')
        credit_note = context.get('credit_note')
        items_data = [
            [
                _p('Description', items_hdr_left),
                _p('Qty', items_hdr_center),
                _p('List', items_hdr_right),
                _p('Discount', items_hdr_center),
                _p('Price', items_hdr_right),
                _p('Amount', items_hdr_right),
            ]
        ]
        total = 0
        if return_request and hasattr(return_request, 'returnitem_set'):
            for return_item in return_request.returnitem_set.all():
                p = return_item.order_item.product
                list_unit = float(p.price)
                unit_price = float(p.get_discounted_price())
                quantity = return_item.quantity
                item_total = unit_price * quantity
                total += item_total
                items_data.append(
                    [
                        _p(_esc(p.title), items_cell_left),
                        _p(_esc(str(quantity)), items_cell_center),
                        _p(_esc(f'${list_unit:.2f}'), items_cell_right),
                        _p(_esc(_format_discount_pct(p)), items_cell_center),
                        _p(_esc(f'${unit_price:.2f}'), items_cell_right),
                        _p(_esc(f'${item_total:.2f}'), items_cell_right),
                    ]
                )

        if return_request and return_request.return_shipping_paid_by == 'customer':
            shipping_cost = float(return_request.return_shipping_cost)
            if shipping_cost > 0:
                items_data.append(
                    [
                        _p(_esc('Return Shipping'), items_cell_left),
                        _p('1', items_cell_center),
                        _p(_esc(f'${shipping_cost:.2f}'), items_cell_right),
                        _p('—', items_cell_center),
                        _p(_esc(f'${shipping_cost:.2f}'), items_cell_right),
                        _p(_esc(f'-${shipping_cost:.2f}'), items_cell_right),
                    ]
                )
                total -= shipping_cost

        refund_amount = float(credit_note.amount) if credit_note else total
        items_data.append(
            [
                _p('', items_cell_left),
                _p('', items_cell_center),
                _p('', items_cell_right),
                _p('', items_cell_center),
                _p('<b>Refund Amount:</b>', items_cell_bold_right),
                _p(f'<b>${refund_amount:.2f}</b>', items_cell_bold_right),
            ]
        )

    col_w = [2.35 * inch, 0.48 * inch, 0.78 * inch, 0.68 * inch, 0.82 * inch, 0.89 * inch]
    scale = content_width / sum(col_w)
    col_w = [c * scale for c in col_w]

    items_table = Table(items_data, colWidths=col_w, repeatRows=1)
    items_table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#333333')),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('ALIGN', (3, 0), (3, -1), 'CENTER'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -2), 1, colors.HexColor('#cccccc')),
                ('LINEBELOW', (0, -2), (-1, -2), 2, colors.HexColor('#333333')),
            ]
        )
    )
    elements.append(items_table)
    elements.append(Spacer(1, 0.3 * inch))

    if pdf_type == 'credit_note':
        notes = (
            "This credit note represents a refund for returned items. "
            "The refund will be processed to your original payment method."
        )
    else:
        notes = "Thank you for your order!"

    elements.append(_p('<b>Notes:</b>', normal_style))
    elements.append(_p(_esc(notes), normal_style))

    doc.build(elements)

    with open(full_pdf_path, 'wb') as f:
        f.write(buffer.getvalue())

    if full_pdf_path.startswith(settings.MEDIA_ROOT):
        relative_path = os.path.relpath(full_pdf_path, settings.MEDIA_ROOT)
    else:
        relative_path = pdf_path.replace(settings.MEDIA_ROOT + '/', '').lstrip('/')

    return relative_path
