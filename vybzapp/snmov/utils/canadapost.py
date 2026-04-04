"""
Canada Post Developer Portal REST API Integration
REST API uses XML payloads (not JSON) with REST HTTP methods
"""
import os
import requests
import base64
from decimal import Decimal
from django.conf import settings
import xml.etree.ElementTree as ET
from .province_codes import normalize_province_code


class CanadaPostAPI:
    """Canada Post Developer Portal REST API client"""
    
    # API Base URLs for Developer Portal
    DEV_BASE_URL = "https://ct.soa-gw.canadapost.ca"
    PROD_BASE_URL = "https://soa-gw.canadapost.ca"
    
    def __init__(self, use_production=False):
        """
        Initialize Canada Post API client
        
        Args:
            use_production: If True, use production API, else use development
        """
        self.use_production = use_production
        self.base_url = self.PROD_BASE_URL if use_production else self.DEV_BASE_URL
        
        # Get API credentials from settings
        # Developer Portal uses "Key Number" format: "username : password" or "Key Number (username : password)"
        if use_production:
            key_number = getattr(settings, 'CANADAPOST_PRODUCTION_KEY_NUMBER', '')
            self.customer_number = getattr(settings, 'CANADAPOST_PRODUCTION_CUSTOMER_NUMBER', '')
        else:
            # Development: use active credentials (set in base.py or pro.py)
            key_number = getattr(settings, 'CANADAPOST_KEY_NUMBER',
                                getattr(settings, 'CANADAPOST_DEVELOPMENT_KEY_NUMBER', ''))
            self.customer_number = getattr(settings, 'CANADAPOST_CUSTOMER_NUMBER',
                                          getattr(settings, 'CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER', ''))
        
        # Parse Key Number format: "username : password" or "Key Number (username : password)"
        # Handle both formats
        if '(' in key_number and ')' in key_number:
            # Format: "Key Number (username : password)"
            import re
            match = re.search(r'\(([^:]+)\s*:\s*([^)]+)\)', key_number)
            if match:
                username = match.group(1).strip()
                password = match.group(2).strip()
            else:
                # Fallback: try to extract username:password directly
                parts = key_number.split(':')
                username = parts[0].strip() if len(parts) > 0 else ''
                password = parts[1].strip() if len(parts) > 1 else ''
        else:
            # Format: "username : password"
            parts = key_number.split(':')
            username = parts[0].strip() if len(parts) > 0 else ''
            password = parts[1].strip() if len(parts) > 1 else ''
        
        self.username = username
        self.password = password
        
        # Create Basic Auth header (username:password format)
        credentials = f"{self.username}:{self.password}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        self.auth_header = f"Basic {encoded_credentials}"
    
    def _make_request(self, endpoint, method='GET', xml_data=None, headers=None):
        """
        Make HTTP request to Canada Post REST API
        
        Args:
            endpoint: API endpoint (e.g., '/rs/ship/price')
            method: HTTP method (GET, POST, etc.) - REST style
            xml_data: Request body as XML string
            headers: Additional headers
        
        Returns:
            Response object
        """
        url = f"{self.base_url}{endpoint}"
        
        default_headers = {
            'Authorization': self.auth_header,
            'Accept-Language': 'en-CA'
        }
        
        if headers:
            default_headers.update(headers)
        
        # Validate credentials before making request
        if not self.username or not self.password:
            raise ValueError(
                "Canada Post API credentials not configured. "
                "Please set CANADAPOST_KEY_NUMBER in your settings. "
                "Format: 'username : password' or 'Key Number (username : password)'"
            )
        
        if method == 'GET':
            response = requests.get(url, headers=default_headers)
        elif method == 'POST':
            response = requests.post(url, headers=default_headers, data=xml_data)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        # Provide better error messages for authentication failures
        if response.status_code == 401:
            raise ValueError(
                "Canada Post API authentication failed. "
                "Please verify your API key and secret are correct. "
                f"Response: {response.text[:200]}"
            )
        
        response.raise_for_status()
        return response
    
    def get_shipping_rates(self, from_address, to_address, parcel):
        """
        Get shipping rates from Canada Post REST API
        
        Args:
            from_address: Dict with sender address info
            to_address: Dict with recipient address info
            parcel: Dict with parcel dimensions and weight
        
        Returns:
            List of rate dictionaries with 'service_code', 'amount', 'estimated_delivery', etc.
        """
        # Build XML request for shipping rates (REST API uses XML payloads)
        xml_request = self._build_rates_xml(from_address, to_address, parcel)
        
        # Make REST API call with XML payload
        response = self._make_request(
            '/rs/ship/price',
            method='POST',
            xml_data=xml_request,
            headers={
                'Accept': 'application/vnd.cpc.ship.rate-v4+xml',
                'Content-Type': 'application/vnd.cpc.ship.rate-v4+xml'
            }
        )
        
        # Parse XML response
        return self._parse_rates_xml_response(response.text)
    
    def _build_rates_xml(self, from_address, to_address, parcel):
        """Build XML request for shipping rates"""
        root = ET.Element('mailing-scenario')
        root.set('xmlns', 'http://www.canadapost.ca/ws/ship/rate-v4')
        
        # Customer number
        customer_number = ET.SubElement(root, 'customer-number')
        customer_number.text = self.customer_number
        
        # Parcel characteristics
        parcel_char = ET.SubElement(root, 'parcel-characteristics')
        weight = ET.SubElement(parcel_char, 'weight')
        weight.text = str(parcel['weight'])
        
        # Dimensions
        dimensions = ET.SubElement(parcel_char, 'dimensions')
        length = ET.SubElement(dimensions, 'length')
        length.text = str(parcel['length'])
        width = ET.SubElement(dimensions, 'width')
        width.text = str(parcel['width'])
        height = ET.SubElement(dimensions, 'height')
        height.text = str(parcel['height'])
        
        # Origin postal code
        origin_postal_code = ET.SubElement(root, 'origin-postal-code')
        origin_postal_code.text = from_address.get('postal_code', '').replace(' ', '')
        
        # Destination
        destination = ET.SubElement(root, 'destination')
        domestic = ET.SubElement(destination, 'domestic')
        postal_code = ET.SubElement(domestic, 'postal-code')
        postal_code.text = to_address.get('postal_code', '').replace(' ', '')
        
        return ET.tostring(root, encoding='unicode')
    
    def _parse_rates_xml_response(self, xml_response):
        """Parse XML response from rates API"""
        root = ET.fromstring(xml_response)
        rates = []
        
        # Handle both error messages and price quotes
        messages = root.findall('.//{http://www.canadapost.ca/ws/ship/rate-v4}message')
        if messages:
            error_texts = [msg.find('{http://www.canadapost.ca/ws/ship/rate-v4}description')
                          for msg in messages if msg.find('{http://www.canadapost.ca/ws/ship/rate-v4}description') is not None]
            if error_texts:
                raise ValueError(f"Canada Post API error: {error_texts[0].text}")
        
        for price_quote in root.findall('.//{http://www.canadapost.ca/ws/ship/rate-v4}price-quote'):
            service_code = price_quote.find('{http://www.canadapost.ca/ws/ship/rate-v4}service-code')
            price_details = price_quote.find('{http://www.canadapost.ca/ws/ship/rate-v4}price-details')
            service_name = price_quote.find('{http://www.canadapost.ca/ws/ship/rate-v4}service-name')
            
            # Extract service-standard information (transit time and delivery date)
            service_standard = price_quote.find('{http://www.canadapost.ca/ws/ship/rate-v4}service-standard')
            expected_transit_time = None
            expected_delivery = None
            if service_standard is not None:
                expected_transit_time_elem = service_standard.find('{http://www.canadapost.ca/ws/ship/rate-v4}expected-transit-time')
                expected_delivery_elem = service_standard.find('{http://www.canadapost.ca/ws/ship/rate-v4}expected-delivery-date')
                if expected_transit_time_elem is not None:
                    try:
                        expected_transit_time = int(expected_transit_time_elem.text)
                    except (ValueError, TypeError):
                        expected_transit_time = None
                if expected_delivery_elem is not None:
                    expected_delivery = expected_delivery_elem.text
            
            if price_details is not None:
                due = price_details.find('{http://www.canadapost.ca/ws/ship/rate-v4}due')
                if due is not None:
                    rates.append({
                        'service_code': service_code.text if service_code is not None else '',
                        'service_name': service_name.text if service_name is not None else '',
                        'amount': Decimal(due.text) if due is not None else Decimal('0.00'),
                        'currency': 'CAD',
                        'estimated_delivery': expected_delivery or '',
                        'estimated_delivery_days': expected_transit_time if expected_transit_time is not None else 0,
                        'object_id': service_code.text if service_code is not None else '',
                    })
        
        return rates
    
    def create_shipping_label(self, from_address, to_address, parcel, service_code, order_id=None):
        """
        Create a shipping label using REST API
        
        Args:
            from_address: Dict with sender address info
            to_address: Dict with recipient address info
            parcel: Dict with parcel dimensions and weight
            service_code: Canada Post service code (e.g., 'DOM.EP', 'DOM.PC')
            order_id: Optional order ID for reference
        
        Returns:
            Dict with 'label_url', 'tracking_number', 'carrier'
        """
        # Build XML request for shipment creation (REST API uses XML payloads)
        xml_request = self._build_shipment_xml(from_address, to_address, parcel, service_code, order_id)
        
        # Create shipment via REST API
        response = self._make_request(
            f'/rs/{self.customer_number}/shipment',
            method='POST',
            xml_data=xml_request,
            headers={
                'Accept': 'application/vnd.cpc.shipment-v8+xml',
                'Content-Type': 'application/vnd.cpc.shipment-v8+xml'
            }
        )
        
        # Parse response to get shipment ID
        root = ET.fromstring(response.text)
        
        # Check for errors
        messages = root.findall('.//{http://www.canadapost.ca/ws/shipment-v8}message')
        if messages:
            error_texts = [msg.find('{http://www.canadapost.ca/ws/shipment-v8}description')
                          for msg in messages if msg.find('{http://www.canadapost.ca/ws/shipment-v8}description') is not None]
            if error_texts:
                raise ValueError(f"Canada Post API error: {error_texts[0].text}")
        
        shipment_id_elem = root.find('.//{http://www.canadapost.ca/ws/shipment-v8}shipment-id')
        tracking_pin_elem = root.find('.//{http://www.canadapost.ca/ws/shipment-v8}tracking-pin')
        
        if shipment_id_elem is None:
            raise ValueError("Shipment created but no shipment ID returned")
        
        shipment_id = shipment_id_elem.text
        tracking_number = tracking_pin_elem.text if tracking_pin_elem is not None else ''
        
        # Get label PDF via REST API
        label_response = self._make_request(
            f'/rs/{self.customer_number}/shipment/{shipment_id}/label',
            method='GET',
            headers={'Accept': 'application/pdf'}
        )
        
        return {
            'label_url': f'/media/shipping-labels/{shipment_id}.pdf',
            'tracking_number': tracking_number,
            'carrier': 'Canada Post',
            'shipment_id': shipment_id,
            'label_pdf': label_response.content
        }
    
    def _build_shipment_xml(self, from_address, to_address, parcel, service_code, order_id):
        """Build XML request for shipment creation"""
        root = ET.Element('shipment')
        root.set('xmlns', 'http://www.canadapost.ca/ws/shipment-v8')
        
        # Group ID (optional, for grouping shipments)
        if order_id:
            group_id = ET.SubElement(root, 'group-id')
            group_id.text = str(order_id)
        
        # Customer number
        customer_number = ET.SubElement(root, 'customer-number')
        customer_number.text = self.customer_number
        
        # Delivery spec
        delivery_spec = ET.SubElement(root, 'delivery-spec')
        
        # Service code
        service_code_elem = ET.SubElement(delivery_spec, 'service-code')
        service_code_elem.text = service_code
        
        # Sender
        sender = ET.SubElement(delivery_spec, 'sender')
        name = ET.SubElement(sender, 'name')
        name.text = from_address.get('name', '')
        if from_address.get('company'):
            company = ET.SubElement(sender, 'company')
            company.text = from_address.get('company', '')
        if from_address.get('phone'):
            contact_phone = ET.SubElement(sender, 'contact-phone')
            contact_phone.text = from_address.get('phone', '')
        
        address_details = ET.SubElement(sender, 'address-details')
        address_line_1 = ET.SubElement(address_details, 'address-line-1')
        address_line_1.text = from_address.get('address_line_1', '')
        city = ET.SubElement(address_details, 'city')
        city.text = from_address.get('city', '')
        prov_state = ET.SubElement(address_details, 'prov-state')
        prov_state.text = from_address.get('state', '')
        postal_zip = ET.SubElement(address_details, 'postal-zip')
        postal_zip.text = from_address.get('postal_code', '').replace(' ', '')
        country_code = ET.SubElement(address_details, 'country-code')
        country_code.text = from_address.get('country_code', 'CA')
        
        # Destination
        destination = ET.SubElement(delivery_spec, 'destination')
        name = ET.SubElement(destination, 'name')
        name.text = to_address.get('name', '')
        if to_address.get('company'):
            company = ET.SubElement(destination, 'company')
            company.text = to_address.get('company', '')
        if to_address.get('phone'):
            contact_phone = ET.SubElement(destination, 'contact-phone')
            contact_phone.text = to_address.get('phone', '')
        
        address_details = ET.SubElement(destination, 'address-details')
        address_line_1 = ET.SubElement(address_details, 'address-line-1')
        address_line_1.text = to_address.get('address_line_1', '')
        if to_address.get('address_line_2'):
            address_line_2 = ET.SubElement(address_details, 'address-line-2')
            address_line_2.text = to_address.get('address_line_2', '')
        city = ET.SubElement(address_details, 'city')
        city.text = to_address.get('city', '')
        prov_state = ET.SubElement(address_details, 'prov-state')
        prov_state.text = to_address.get('state', '')
        postal_zip = ET.SubElement(address_details, 'postal-zip')
        postal_zip.text = to_address.get('postal_code', '').replace(' ', '')
        country_code = ET.SubElement(address_details, 'country-code')
        country_code.text = to_address.get('country_code', 'CA')
        
        # Parcel characteristics
        parcel_char = ET.SubElement(delivery_spec, 'parcel-characteristics')
        weight = ET.SubElement(parcel_char, 'weight')
        weight.text = str(parcel['weight'])
        
        dimensions = ET.SubElement(parcel_char, 'dimensions')
        length = ET.SubElement(dimensions, 'length')
        length.text = str(parcel['length'])
        width = ET.SubElement(dimensions, 'width')
        width.text = str(parcel['width'])
        height = ET.SubElement(dimensions, 'height')
        height.text = str(parcel['height'])
        
        # Notification (optional)
        if to_address.get('email'):
            notification = ET.SubElement(delivery_spec, 'notification')
            email = ET.SubElement(notification, 'email')
            email.text = to_address.get('email', '')
        
        # Preferences
        preferences = ET.SubElement(delivery_spec, 'preferences')
        show_packing_instructions = ET.SubElement(preferences, 'show-packing-instructions')
        show_packing_instructions.text = 'true'
        show_postage_rate = ET.SubElement(preferences, 'show-postage-rate')
        show_postage_rate.text = 'true'
        show_insured_value = ET.SubElement(preferences, 'show-insured-value')
        show_insured_value.text = 'true'
        
        # Settlement info
        settlement_info = ET.SubElement(delivery_spec, 'settlement-info')
        paid_by = ET.SubElement(settlement_info, 'paid-by-customer')
        paid_by.text = self.customer_number
        
        return ET.tostring(root, encoding='unicode')


def get_canadapost_rates(order, use_production=None):
    """
    Get shipping rates from Canada Post REST API
    
    Args:
        order: Order object
        use_production: Use production API if True (None = use settings)
    
    Returns:
        List of rate dictionaries (Shippo-compatible format)
    """
    shipping = order.shipping_address
    if not shipping:
        raise ValueError("Shipping address not found for this order.")
    
    # Get sender address (may be in Shippo format, convert to Canada Post format)
    from snmov.utils.cart import get_sender_address
    sender_addr = get_sender_address()
    
    # Convert from Shippo format to Canada Post format
    # Normalize province codes (e.g., "Ontario" -> "ON")
    sender_state = sender_addr.get('state', '')
    if sender_addr.get('country', sender_addr.get('country_code', 'CA')).upper() == 'CA':
        sender_state = normalize_province_code(sender_state)
    
    from_address = {
        'name': sender_addr.get('name', ''),
        'address_line_1': sender_addr.get('street1', sender_addr.get('address_line_1', '')),
        'address_line_2': sender_addr.get('street2', sender_addr.get('address_line_2', '')),
        'city': sender_addr.get('city', ''),
        'state': sender_state,
        'postal_code': sender_addr.get('zip', sender_addr.get('postal_code', '')),
        'country_code': sender_addr.get('country', sender_addr.get('country_code', 'CA')),
        'email': sender_addr.get('email', ''),
        'phone': sender_addr.get('phone', ''),
    }
    
    # Build to address
    # Normalize province codes for Canadian addresses
    shipping_state = shipping.state
    if shipping.country_code.upper() == 'CA':
        shipping_state = normalize_province_code(shipping_state)
    
    to_address = {
        'name': shipping.full_name,
        'address_line_1': shipping.address_line_1,
        'address_line_2': shipping.address_line_2 or '',
        'city': shipping.city,
        'state': shipping_state,
        'postal_code': shipping.postal_code,
        'country_code': shipping.country_code,
        'email': shipping.user.email if shipping.user else '',
        'phone': shipping.user.profile.phone if shipping.user and hasattr(shipping.user, 'profile') else '',
    }
    
    # Calculate parcel dimensions
    total_length = Decimal("0.0")
    total_width = Decimal("0.0")
    total_height = Decimal("0.0")
    
    for item in order.orderitem_set.all():
        product = item.product
        quantity = item.quantity
        
        product_length = Decimal(str(product.package_length or 0))
        product_width = Decimal(str(product.package_width or 0))
        product_height = Decimal(str(product.package_height or 0))
        
        total_length = max(total_length, product_length)
        total_width += product_width * quantity
        total_height = max(total_height, product_height)
    
    # Build parcel (dimensions in cm, weight in kg)
    # Canada Post minimum weight is 0.1 kg (100g)
    weight_kg = round(order.calculate_total_weight() / 1000.0, 2)
    if weight_kg < 0.1:
        weight_kg = 0.1
    
    parcel = {
        'length': round(total_length, 2),
        'width': round(total_width, 2),
        'height': round(total_height, 2),
        'weight': weight_kg,
    }
    
    # Get rates from Canada Post REST API
    if use_production is None:
        use_production = getattr(settings, 'CANADAPOST_USE_PRODUCTION', False)
    
    api = CanadaPostAPI(use_production=use_production)
    rates = api.get_shipping_rates(from_address, to_address, parcel)
    
    if not rates:
        raise ValueError("No shipping options available.")
    
    # Convert to Shippo-compatible format for backward compatibility
    # Also match frontend expectations (SelectShipping.tsx interface)
    formatted_rates = []
    for rate in rates:
        # Use estimated_delivery_days directly from API (from service-standard.expected-transit-time)
        # This is more accurate than calculating from delivery date
        estimated_days = rate.get('estimated_delivery_days', 0)
        if not estimated_days:
            # Fallback: try to calculate from delivery date if transit time not available
            estimated_delivery = rate.get('estimated_delivery', '')
            if estimated_delivery:
                try:
                    from datetime import datetime
                    delivery_date = datetime.strptime(estimated_delivery, '%Y-%m-%d')
                    days_diff = (delivery_date.date() - datetime.now().date()).days
                    if days_diff > 0:
                        estimated_days = days_diff
                except:
                    pass
        
        formatted_rates.append({
            'object_id': rate.get('service_code', ''),
            'provider': 'Canada Post',
            'provider_image_200': '',  # Frontend may handle missing image
            'servicelevel': {
                'name': rate.get('service_name', ''),
            },
            'amount': str(rate.get('amount', '0.00')),
            'currency': rate.get('currency', 'CAD'),
            'estimated_days': int(estimated_days) if estimated_days else 0,  # Frontend expects number
            'courier_name': 'Canada Post',
            'shipment_charge': {
                'amount': str(rate.get('amount', '0.00')),
                'currency': rate.get('currency', 'CAD'),
            },
            '_canadapost_service_code': rate.get('service_code', ''),
            '_canadapost_service_name': rate.get('service_name', ''),
        })
    
    return formatted_rates


def create_canadapost_label(order, service_code, use_production=None):
    """
    Create shipping label with Canada Post REST API
    
    Args:
        order: Order object
        service_code: Canada Post service code (e.g., 'DOM.EP', 'DOM.PC')
        use_production: Use production API if True (None = use settings)
    
    Returns:
        Dict with label_url, tracking_number, carrier
    """
    shipping = order.shipping_address
    if not shipping:
        raise ValueError("Shipping address not found for this order.")
    
    # Get sender address (may be in Shippo format, convert to Canada Post format)
    from snmov.utils.cart import get_sender_address
    sender_addr = get_sender_address()
    
    # Convert from Shippo format to Canada Post format
    # Normalize province codes (e.g., "Ontario" -> "ON")
    sender_state = sender_addr.get('state', '')
    if sender_addr.get('country', sender_addr.get('country_code', 'CA')).upper() == 'CA':
        sender_state = normalize_province_code(sender_state)
    
    from_address = {
        'name': sender_addr.get('name', ''),
        'address_line_1': sender_addr.get('street1', sender_addr.get('address_line_1', '')),
        'address_line_2': sender_addr.get('street2', sender_addr.get('address_line_2', '')),
        'city': sender_addr.get('city', ''),
        'state': sender_state,
        'postal_code': sender_addr.get('zip', sender_addr.get('postal_code', '')),
        'country_code': sender_addr.get('country', sender_addr.get('country_code', 'CA')),
        'email': sender_addr.get('email', ''),
        'phone': sender_addr.get('phone', ''),
    }
    
    # Build to address
    # Normalize province codes for Canadian addresses
    shipping_state = shipping.state
    if shipping.country_code.upper() == 'CA':
        shipping_state = normalize_province_code(shipping_state)
    
    to_address = {
        'name': shipping.full_name,
        'address_line_1': shipping.address_line_1,
        'address_line_2': shipping.address_line_2 or '',
        'city': shipping.city,
        'state': shipping_state,
        'postal_code': shipping.postal_code,
        'country_code': shipping.country_code,
        'email': shipping.user.email if shipping.user else '',
        'phone': shipping.user.profile.phone if shipping.user and hasattr(shipping.user, 'profile') else '',
    }
    
    # Calculate parcel dimensions
    total_length = Decimal("0.0")
    total_width = Decimal("0.0")
    total_height = Decimal("0.0")
    total_weight = Decimal("0.0")
    
    for item in order.orderitem_set.all():
        product = item.product
        quantity = item.quantity
        
        product_length = Decimal(str(product.package_length or 0))
        product_width = Decimal(str(product.package_width or 0))
        product_height = Decimal(str(product.package_height or 0))
        product_weight = Decimal(str(product.weight_grams or 0))
        
        total_length = max(total_length, product_length)
        total_width += product_width * quantity
        total_height = max(total_height, product_height)
        total_weight += product_weight * quantity
    
    # Build parcel (dimensions in cm, weight in kg)
    # Canada Post minimum weight is 0.1 kg (100g)
    weight_kg = round(float(total_weight) / 1000.0, 2)
    if weight_kg < 0.1:
        weight_kg = 0.1
    
    parcel = {
        'length': round(total_length, 2),
        'width': round(total_width, 2),
        'height': round(total_height, 2),
        'weight': weight_kg,
    }
    
    # Create label with Canada Post REST API
    if use_production is None:
        use_production = getattr(settings, 'CANADAPOST_USE_PRODUCTION', False)
    
    api = CanadaPostAPI(use_production=use_production)
    result = api.create_shipping_label(from_address, to_address, parcel, service_code, order.id)

    label_pdf = result.get('label_pdf')
    shipment_id = result.get('shipment_id')
    if label_pdf and shipment_id:
        rel_dir = 'shipping-labels'
        dest_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
        os.makedirs(dest_dir, exist_ok=True)
        filename = f'{shipment_id}.pdf'
        dest_path = os.path.join(dest_dir, filename)
        with open(dest_path, 'wb') as f:
            f.write(label_pdf)
        base = settings.MEDIA_URL or '/media/'
        if not base.endswith('/'):
            base = f'{base}/'
        label_url = f'{base}{rel_dir}/{filename}'
    else:
        label_url = result.get('label_url', '')

    return {
        'label_url': label_url,
        'tracking_number': result['tracking_number'],
        'carrier': result['carrier'],
    }


def resolve_canadapost_service_code(order):
    """
    Service code from checkout (Canada Post), e.g. DOM.EP, DOM.PC.
    Stored on order by select-shipping as shipping_service / shipping_rate_id.
    """
    code = (order.shipping_service or '').strip() or (order.shipping_rate_id or '').strip()
    if not code:
        code = (getattr(settings, 'CANADAPOST_DEFAULT_SERVICE_CODE', None) or '').strip()
    if not code:
        raise ValueError(
            'No Canada Post service code on this order. '
            'The customer must select a shipping option before payment.'
        )
    return code


def fulfill_order_shipping_label(order, use_production=None):
    """Buy a Canada Post label and persist the PDF under MEDIA_ROOT/shipping-labels/."""
    service_code = resolve_canadapost_service_code(order)
    return create_canadapost_label(order, service_code, use_production=use_production)


def create_return_label(return_request, use_production=None):
    """
    Create return shipping label with Canada Post REST API
    For returns, addresses are swapped (customer sends back to store)
    
    Args:
        return_request: ReturnRequest object
        use_production: Use production API if True (None = use settings)
    
    Returns:
        Dict with label_url, tracking_number, carrier
    """
    from snmov.utils.cart import get_sender_address
    from snmov.utils.province_codes import normalize_province_code
    from decimal import Decimal
    
    order = return_request.order
    shipping = order.shipping_address
    if not shipping:
        raise ValueError("Shipping address not found for this order.")
    
    # Get sender address (store address - where return goes TO)
    sender_addr = get_sender_address()
    
    # Convert from Shippo format to Canada Post format
    sender_state = sender_addr.get('state', '')
    if sender_addr.get('country', sender_addr.get('country_code', 'CA')).upper() == 'CA':
        sender_state = normalize_province_code(sender_state)
    
    # TO address (store - where return is going)
    to_address = {
        'name': sender_addr.get('name', ''),
        'address_line_1': sender_addr.get('street1', sender_addr.get('address_line_1', '')),
        'address_line_2': sender_addr.get('street2', sender_addr.get('address_line_2', '')),
        'city': sender_addr.get('city', ''),
        'state': sender_state,
        'postal_code': sender_addr.get('zip', sender_addr.get('postal_code', '')),
        'country_code': sender_addr.get('country', sender_addr.get('country_code', 'CA')),
        'email': sender_addr.get('email', ''),
        'phone': sender_addr.get('phone', ''),
    }
    
    # FROM address (customer - where return is coming FROM)
    # Normalize province codes for Canadian addresses
    shipping_state = shipping.state
    if shipping.country_code.upper() == 'CA':
        shipping_state = normalize_province_code(shipping_state)
    
    from_address = {
        'name': shipping.full_name,
        'address_line_1': shipping.address_line_1,
        'address_line_2': shipping.address_line_2 or '',
        'city': shipping.city,
        'state': shipping_state,
        'postal_code': shipping.postal_code,
        'country_code': shipping.country_code,
        'email': shipping.user.email if shipping.user else '',
        'phone': shipping.user.profile.phone if shipping.user and hasattr(shipping.user, 'profile') else '',
    }
    
    # Calculate parcel dimensions from return items
    total_length = Decimal("0.0")
    total_width = Decimal("0.0")
    total_height = Decimal("0.0")
    total_weight = Decimal("0.0")
    
    for return_item in return_request.returnitem_set.all():
        product = return_item.order_item.product
        quantity = return_item.quantity
        
        product_length = Decimal(str(product.package_length or 0))
        product_width = Decimal(str(product.package_width or 0))
        product_height = Decimal(str(product.package_height or 0))
        product_weight = Decimal(str(product.weight_grams or 0))
        
        total_length = max(total_length, product_length)
        total_width += product_width * quantity
        total_height = max(total_height, product_height)
        total_weight += product_weight * quantity
    
    # Build parcel (dimensions in cm, weight in kg)
    # Canada Post minimum weight is 0.1 kg (100g)
    weight_kg = round(float(total_weight) / 1000.0, 2)
    if weight_kg < 0.1:
        weight_kg = 0.1
    
    parcel = {
        'length': round(total_length, 2),
        'width': round(total_width, 2),
        'height': round(total_height, 2),
        'weight': weight_kg,
    }
    
    # Use return service code (typically same as outbound, but could be different)
    # For now, use DOM.PC (Priority) - adjust based on your return policy
    service_code = 'DOM.PC'  # Priority Courier - adjust as needed
    
    # Create label with Canada Post REST API
    if use_production is None:
        use_production = getattr(settings, 'CANADAPOST_USE_PRODUCTION', False)
    
    api = CanadaPostAPI(use_production=use_production)
    result = api.create_shipping_label(
        from_address=from_address,  # Customer address
        to_address=to_address,      # Store address (swapped for returns)
        parcel=parcel,
        service_code=service_code,
        order_id=f"RETURN-{return_request.id}"
    )
    
    return {
        'label_url': result['label_url'],
        'tracking_number': result['tracking_number'],
        'carrier': result['carrier'],
    }
