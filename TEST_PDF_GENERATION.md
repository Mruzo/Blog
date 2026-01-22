# Testing PDF Generation for Invoices and Credit Notes

This document explains how to test and view the PDF generation for invoices and return confirmations (credit notes).

## Prerequisites

1. **Install reportlab** (if not already installed):
   ```bash
   pip install reportlab
   ```

2. **Ensure Django is running** and you have access to the Django shell or admin interface.

## Method 1: Using the Management Command

A management command has been created to generate test PDFs:

### Generate Both Invoice and Credit Note PDFs
```bash
python manage.py test_pdf_generation
```

### Generate Only Invoice PDF
```bash
python manage.py test_pdf_generation --invoice-only
```

### Generate Only Credit Note PDF
```bash
python manage.py test_pdf_generation --credit-note-only
```

### Use Existing Order/Return
```bash
# Use existing order ID
python manage.py test_pdf_generation --order-id 123

# Use existing return request ID
python manage.py test_pdf_generation --return-id 456
```

The command will:
- Find or create sample orders/returns
- Generate the PDFs
- Display the file paths where PDFs are saved
- Show the URL to access them (e.g., `/media/invoices/test_invoice_123.pdf`)

## Method 2: Through the API Endpoints

### Download Invoice PDF
1. Navigate to an order detail page: `/product/order/{order_id}/`
2. Click the "Download Invoice" button
3. Or access directly: `/api/orders/{order_id}/invoice/`

### Download Credit Note PDF
1. Navigate to a return request detail page: `/product/returns/{return_id}/`
2. Click the "Download Credit Note PDF" button
3. Or access directly: `/api/credit-notes/{credit_note_id}/pdf/`

## Method 3: Through Django Admin

### For Invoices:
1. Go to Django Admin: `/uno/`
2. Navigate to **Snmov > Invoices**
3. Select an invoice
4. Click "Regenerate PDF" action (if PDF doesn't exist)
5. The PDF will be saved in `MEDIA_ROOT/invoices/`

### For Credit Notes:
1. Go to Django Admin: `/uno/`
2. Navigate to **Snmov > Credit Notes**
3. Select a credit note
4. Click "Regenerate PDF" action (if PDF doesn't exist)
5. The PDF will be saved in `MEDIA_ROOT/credit-notes/`

## PDF File Locations

PDFs are saved in the Django `MEDIA_ROOT` directory:

- **Invoices**: `{MEDIA_ROOT}/invoices/invoice_{order_id}.pdf`
  - Full path example: `/home/chris/applications/vybz/vybzapp/media/invoices/invoice_123.pdf`
  
- **Credit Notes**: `{MEDIA_ROOT}/credit-notes/credit_note_{return_id}.pdf`
  - Full path example: `/home/chris/applications/vybz/vybzapp/media/credit-notes/credit_note_456.pdf`

Access via URL (if media files are served):
- **Invoices**: `/media/invoices/invoice_{order_id}.pdf`
- **Credit Notes**: `/media/credit-notes/credit_note_{return_id}.pdf`

**Note**: The exact path depends on your `MEDIA_ROOT` setting. Check `settings.py` to see where `MEDIA_ROOT` is configured. Typically it's `{BASE_DIR}/media/`.

## PDF Content

### Invoice PDF Contains:
- Invoice number and date
- Order number and date
- Company information (from settings)
- Customer information
- Itemized list of products with quantities and prices
- Shipping cost (if applicable)
- Total amount

### Credit Note PDF Contains:
- Credit note number and date
- Return request number and date
- Company information
- Customer information
- List of returned items with quantities and refund amounts
- Return shipping deduction (if customer pays)
- Total refund amount

## Testing Checklist

- [ ] Invoice PDF generates correctly
- [ ] Credit Note PDF generates correctly
- [ ] PDFs are saved in correct directories
- [ ] PDFs are accessible via URLs
- [ ] PDF content matches order/return data
- [ ] PDFs can be downloaded through API endpoints
- [ ] PDFs can be regenerated through admin interface

## Troubleshooting

### Error: "reportlab not installed"
```bash
pip install reportlab
```

### Error: "MEDIA_ROOT not configured"
Check `settings.py` and ensure `MEDIA_ROOT` is set:
```python
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

### PDFs not accessible via URL
Ensure Django is configured to serve media files in development:
```python
# In urls.py (development only)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### PDFs are empty or corrupted
- Check that order/return has items
- Verify product prices are set correctly
- Check Django logs for errors during PDF generation
