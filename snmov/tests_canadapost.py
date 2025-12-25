"""
Tests for Canada Post API Integration
Tests shipping rates, label creation, and error handling
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from decimal import Decimal
from unittest.mock import patch, MagicMock, Mock
import xml.etree.ElementTree as ET
import requests

from snmov.models import Product, Order, OrderItem, ShippingAddress
from snmov.utils.canadapost import (
    CanadaPostAPI,
    get_canadapost_rates,
    create_canadapost_label
)

User = get_user_model()


class CanadaPostAPITestCase(TestCase):
    """Test Canada Post API client"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            slug='test-product',
            price=Decimal('29.99'),
            stock=10,
            available=True
        )
        
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test St',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='PENDING'
        )
        
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
    
    def test_canadapost_api_initialization_dev(self):
        """Test: API client initializes with development credentials"""
        with patch('snmov.utils.canadapost.getattr') as mock_getattr:
            def getattr_side_effect(obj, name, default=None):
                if name == 'CANADAPOST_USERNAME':
                    return 'dev_user'
                elif name == 'CANADAPOST_PASSWORD':
                    return 'dev_pass'
                elif name == 'CANADAPOST_CUSTOMER_NUMBER':
                    return '123456'
                elif name == 'CANADAPOST_DEVELOPMENT_USERNAME':
                    return 'dev_user'
                elif name == 'CANADAPOST_DEVELOPMENT_PASSWORD':
                    return 'dev_pass'
                elif name == 'CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER':
                    return '123456'
                return default
            
            with patch('snmov.utils.canadapost.settings') as mock_settings:
                # Use type() to create a mock that supports getattr properly
                type(mock_settings).CANADAPOST_USERNAME = 'dev_user'
                type(mock_settings).CANADAPOST_PASSWORD = 'dev_pass'
                type(mock_settings).CANADAPOST_CUSTOMER_NUMBER = '123456'
                type(mock_settings).CANADAPOST_DEVELOPMENT_USERNAME = 'dev_user'
                type(mock_settings).CANADAPOST_DEVELOPMENT_PASSWORD = 'dev_pass'
                type(mock_settings).CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER = '123456'
                
                api = CanadaPostAPI(use_production=False)
                
                self.assertEqual(api.username, 'dev_user')
                self.assertEqual(api.password, 'dev_pass')
                self.assertEqual(api.customer_number, '123456')
                self.assertFalse(api.use_production)
                self.assertIn('ct.soa-gw.canadapost.ca', api.base_url)
    
    @override_settings(
        CANADAPOST_PRODUCTION_USERNAME='prod_user',
        CANADAPOST_PRODUCTION_PASSWORD='prod_pass',
        CANADAPOST_PRODUCTION_CUSTOMER_NUMBER='789012'
    )
    def test_canadapost_api_initialization_prod(self):
        """Test: API client initializes with production credentials"""
        api = CanadaPostAPI(use_production=True)
        
        self.assertEqual(api.username, 'prod_user')
        self.assertEqual(api.password, 'prod_pass')
        self.assertEqual(api.customer_number, '789012')
        self.assertTrue(api.use_production)
        self.assertIn('soa-gw.canadapost.ca', api.base_url)
    
    @override_settings(
        CANADAPOST_USERNAME='testuser',
        CANADAPOST_PASSWORD='testpass',
        CANADAPOST_CUSTOMER_NUMBER='123456',
        CANADAPOST_DEVELOPMENT_USERNAME='testuser',
        CANADAPOST_DEVELOPMENT_PASSWORD='testpass',
        CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456'
    )
    def test_auth_header_creation(self):
        """Test: Basic auth header is created correctly"""
        api = CanadaPostAPI(use_production=False)
        
        # Check that auth header is set
        self.assertTrue(api.auth_header.startswith('Basic '))
        # Decode and verify
        import base64
        decoded = base64.b64decode(api.auth_header.split(' ')[1]).decode()
        self.assertEqual(decoded, 'testuser:testpass')
    
    @patch('snmov.utils.canadapost.requests.post')
    def test_get_shipping_rates_success(self, mock_post):
        """Test: Successfully get shipping rates from Canada Post"""
        # Mock XML response from Canada Post
        xml_response = '''<?xml version="1.0" encoding="UTF-8"?>
        <price-quotes xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
            <price-quote>
                <service-code>DOM.EP</service-code>
                <service-name>Expedited Parcel</service-name>
                <price-details>
                    <due>12.50</due>
                </price-details>
                <expected-delivery-date>2025-12-05</expected-delivery-date>
            </price-quote>
            <price-quote>
                <service-code>DOM.PC</service-code>
                <service-name>Priority</service-name>
                <price-details>
                    <due>18.75</due>
                </price-details>
                <expected-delivery-date>2025-12-04</expected-delivery-date>
            </price-quote>
        </price-quotes>'''
        
        mock_response = Mock()
        mock_response.text = xml_response
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response
        
        with override_settings(
            CANADAPOST_USERNAME='dev_user',
            CANADAPOST_PASSWORD='dev_pass',
            CANADAPOST_CUSTOMER_NUMBER='123456',
            CANADAPOST_DEVELOPMENT_USERNAME='dev_user',
            CANADAPOST_DEVELOPMENT_PASSWORD='dev_pass',
            CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456'
        ):
            api = CanadaPostAPI(use_production=False)
            
            from_address = {
                'name': 'Sender',
                'address_line_1': '456 Sender St',
                'city': 'Toronto',
                'state': 'ON',
                'postal_code': 'M5H 1A1',
                'country_code': 'CA'
            }
            
            to_address = {
                'name': 'Recipient',
                'address_line_1': '123 Test St',
                'city': 'Toronto',
                'state': 'ON',
                'postal_code': 'M5H 2N2',
                'country_code': 'CA'
            }
            
            parcel = {
                'length': 10.0,
                'width': 5.0,
                'height': 3.0,
                'weight': 1.5
            }
            
            rates = api.get_shipping_rates(from_address, to_address, parcel)
            
            # Verify API was called
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            self.assertEqual(call_args[0][0], 'https://ct.soa-gw.canadapost.ca/rs/ship/price')
            
            # Verify rates were parsed
            self.assertEqual(len(rates), 2)
            self.assertEqual(rates[0]['service_code'], 'DOM.EP')
            self.assertEqual(rates[0]['amount'], Decimal('12.50'))
            self.assertEqual(rates[1]['service_code'], 'DOM.PC')
            self.assertEqual(rates[1]['amount'], Decimal('18.75'))
    
    @patch('snmov.utils.canadapost.requests.post')
    def test_get_shipping_rates_no_rates(self, mock_post):
        """Test: Handle case when no rates are returned"""
        xml_response = '''<?xml version="1.0" encoding="UTF-8"?>
        <price-quotes xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
        </price-quotes>'''
        
        mock_response = Mock()
        mock_response.text = xml_response
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response
        
        with override_settings(
            CANADAPOST_USERNAME='dev_user',
            CANADAPOST_PASSWORD='dev_pass',
            CANADAPOST_CUSTOMER_NUMBER='123456',
            CANADAPOST_DEVELOPMENT_USERNAME='dev_user',
            CANADAPOST_DEVELOPMENT_PASSWORD='dev_pass',
            CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456'
        ):
            api = CanadaPostAPI(use_production=False)
            
            from_address = {'postal_code': 'M5H 1A1'}
            to_address = {'postal_code': 'M5H 2N2'}
            parcel = {'length': 10, 'width': 5, 'height': 3, 'weight': 1.5}
            
            rates = api.get_shipping_rates(from_address, to_address, parcel)
            
            # Should return empty list, not raise error
            self.assertEqual(len(rates), 0)
    
    @patch('snmov.utils.canadapost.requests.post')
    def test_get_shipping_rates_api_error(self, mock_post):
        """Test: Handle API errors gracefully"""
        mock_post.side_effect = requests.exceptions.HTTPError("API Error")
        
        with override_settings(
            CANADAPOST_USERNAME='dev_user',
            CANADAPOST_PASSWORD='dev_pass',
            CANADAPOST_CUSTOMER_NUMBER='123456',
            CANADAPOST_DEVELOPMENT_USERNAME='dev_user',
            CANADAPOST_DEVELOPMENT_PASSWORD='dev_pass',
            CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456'
        ):
            api = CanadaPostAPI(use_production=False)
            
            from_address = {'postal_code': 'M5H 1A1'}
            to_address = {'postal_code': 'M5H 2N2'}
            parcel = {'length': 10, 'width': 5, 'height': 3, 'weight': 1.5}
            
            with self.assertRaises(requests.exceptions.HTTPError):
                api.get_shipping_rates(from_address, to_address, parcel)
    
    @patch('snmov.utils.canadapost.requests.post')
    @patch('snmov.utils.canadapost.requests.get')
    def test_create_shipping_label_success(self, mock_get, mock_post):
        """Test: Successfully create shipping label"""
        # Mock shipment creation response
        shipment_xml = '''<?xml version="1.0" encoding="UTF-8"?>
        <shipment-info xmlns="http://www.canadapost.ca/ws/shipment-v8">
            <shipment-id>12345678</shipment-id>
            <shipment-status>transmitted</shipment-status>
            <tracking-pin>1234567890123456</tracking-pin>
        </shipment-info>'''
        
        mock_shipment_response = Mock()
        mock_shipment_response.text = shipment_xml
        mock_shipment_response.raise_for_status = Mock()
        mock_post.return_value = mock_shipment_response
        
        # Mock label retrieval response
        mock_label_response = Mock()
        mock_label_response.content = b'%PDF-1.4 fake pdf content'
        mock_label_response.raise_for_status = Mock()
        mock_get.return_value = mock_label_response
        
        with override_settings(
            CANADAPOST_USERNAME='dev_user',
            CANADAPOST_PASSWORD='dev_pass',
            CANADAPOST_CUSTOMER_NUMBER='123456',
            CANADAPOST_DEVELOPMENT_USERNAME='dev_user',
            CANADAPOST_DEVELOPMENT_PASSWORD='dev_pass',
            CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456'
        ):
            api = CanadaPostAPI(use_production=False)
            
            from_address = {
                'name': 'Sender',
                'address_line_1': '456 Sender St',
                'city': 'Toronto',
                'state': 'ON',
                'postal_code': 'M5H 1A1',
                'country_code': 'CA'
            }
            
            to_address = {
                'name': 'Recipient',
                'address_line_1': '123 Test St',
                'city': 'Toronto',
                'state': 'ON',
                'postal_code': 'M5H 2N2',
                'country_code': 'CA'
            }
            
            parcel = {
                'length': 10.0,
                'width': 5.0,
                'height': 3.0,
                'weight': 1.5
            }
            
            result = api.create_shipping_label(
                from_address, to_address, parcel, 'DOM.EP', order_id=1
            )
            
            # Verify API calls
            self.assertEqual(mock_post.call_count, 1)
            self.assertEqual(mock_get.call_count, 1)
            
            # Verify result
            self.assertEqual(result['tracking_number'], '1234567890123456')
            self.assertEqual(result['carrier'], 'Canada Post')
            self.assertIn('label_pdf', result)
            self.assertEqual(result['shipment_id'], '12345678')
    
    @override_settings(
        CANADAPOST_CUSTOMER_NUMBER='123456',
        CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456',
        CANADAPOST_USERNAME='dev_user',
        CANADAPOST_PASSWORD='dev_pass',
        CANADAPOST_DEVELOPMENT_USERNAME='dev_user',
        CANADAPOST_DEVELOPMENT_PASSWORD='dev_pass'
    )
    def test_build_rates_xml(self):
        """Test: XML request for rates is built correctly"""
        api = CanadaPostAPI(use_production=False)
        
        from_address = {'postal_code': 'M5H 1A1'}
        to_address = {'postal_code': 'M5H 2N2'}
        parcel = {'length': 10.0, 'width': 5.0, 'height': 3.0, 'weight': 1.5}
        
        xml = api._build_rates_xml(from_address, to_address, parcel)
        
        # Parse and verify XML structure
        root = ET.fromstring(xml)
        self.assertEqual(root.tag, 'mailing-scenario')
        self.assertEqual(root.find('customer-number').text, '123456')
        self.assertEqual(root.find('parcel-characteristics/weight').text, '1.5')
        self.assertEqual(root.find('origin-postal-code').text, 'M5H1A1')
        self.assertEqual(root.find('destination/domestic/postal-code').text, 'M5H2N2')


class CanadaPostIntegrationTestCase(TestCase):
    """Test Canada Post integration with orders"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            title='Test Product',
            slug='test-product',
            price=Decimal('29.99'),
            stock=10,
            available=True,
            package_length=Decimal('10.0'),
            package_width=Decimal('5.0'),
            package_height=Decimal('3.0'),
            weight_grams=500
        )
        
        self.shipping_address = ShippingAddress.objects.create(
            user=self.user,
            full_name='Test User',
            address_line_1='123 Test St',
            city='Toronto',
            state='ON',
            postal_code='M5H 2N2',
            country_code='CA'
        )
        
        self.order = Order.objects.create(
            customer=self.user,
            shipping_address=self.shipping_address,
            status='PENDING'
        )
        
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2
        )
    
    @patch('snmov.utils.canadapost.CanadaPostAPI.get_shipping_rates')
    def test_get_canadapost_rates_integration(self, mock_get_rates):
        """Test: get_canadapost_rates function with order"""
        # Mock the API response
        mock_get_rates.return_value = [
            {
                'service_code': 'DOM.EP',
                'service_name': 'Expedited Parcel',
                'amount': Decimal('12.50'),
                'currency': 'CAD',
                'estimated_delivery': '2025-12-05',
                'object_id': 'DOM.EP'
            }
        ]
        
        with patch('snmov.utils.canadapost.settings') as mock_settings:
            mock_settings.CANADAPOST_USE_PRODUCTION = False
            mock_settings.CANADAPOST_DEVELOPMENT_USERNAME = 'dev_user'
            mock_settings.CANADAPOST_DEVELOPMENT_PASSWORD = 'dev_pass'
            mock_settings.CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER = '123456'
            
            # Mock get_sender_address (it's imported from cart module)
            with patch('snmov.utils.cart.get_sender_address') as mock_sender:
                mock_sender.return_value = {
                    'name': 'Sender',
                    'address_line_1': '456 Sender St',
                    'city': 'Toronto',
                    'state': 'ON',
                    'postal_code': 'M5H 1A1',
                    'country_code': 'CA'
                }
                
                rates = get_canadapost_rates(self.order, use_production=None)
                
                # Verify rates were returned
                self.assertEqual(len(rates), 1)
                self.assertEqual(rates[0]['service_code'], 'DOM.EP')
                self.assertEqual(rates[0]['amount'], Decimal('12.50'))
    
    @patch('snmov.utils.canadapost.CanadaPostAPI.create_shipping_label')
    def test_create_canadapost_label_integration(self, mock_create_label):
        """Test: create_canadapost_label function with order"""
        # Mock the API response
        mock_create_label.return_value = {
            'label_url': '/media/shipping-labels/12345678.pdf',
            'tracking_number': '1234567890123456',
            'carrier': 'Canada Post',
            'shipment_id': '12345678',
            'label_pdf': b'%PDF-1.4 fake pdf'
        }
        
        with patch('snmov.utils.canadapost.settings') as mock_settings:
            mock_settings.CANADAPOST_USE_PRODUCTION = False
            mock_settings.CANADAPOST_DEVELOPMENT_USERNAME = 'dev_user'
            mock_settings.CANADAPOST_DEVELOPMENT_PASSWORD = 'dev_pass'
            mock_settings.CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER = '123456'
            
            # Mock get_sender_address (it's imported from cart module)
            with patch('snmov.utils.cart.get_sender_address') as mock_sender:
                mock_sender.return_value = {
                    'name': 'Sender',
                    'address_line_1': '456 Sender St',
                    'city': 'Toronto',
                    'state': 'ON',
                    'postal_code': 'M5H 1A1',
                    'country_code': 'CA'
                }
                
                result = create_canadapost_label(
                    self.order, 'DOM.EP', use_production=None
                )
                
                # Verify result
                self.assertEqual(result['tracking_number'], '1234567890123456')
                self.assertEqual(result['carrier'], 'Canada Post')
                self.assertIn('label_url', result)
    
    def test_get_canadapost_rates_uses_settings(self):
        """Test: get_canadapost_rates uses CANADAPOST_USE_PRODUCTION from settings"""
        with patch('snmov.utils.canadapost.CanadaPostAPI') as mock_api_class:
            mock_api = Mock()
            mock_api.get_shipping_rates.return_value = []
            mock_api_class.return_value = mock_api
            
            with patch('snmov.utils.canadapost.settings') as mock_settings:
                mock_settings.CANADAPOST_USE_PRODUCTION = True
                
                with patch('snmov.utils.cart.get_sender_address'):
                    get_canadapost_rates(self.order, use_production=None)
                    
                    # Verify API was initialized with production=True
                    mock_api_class.assert_called_once_with(use_production=True)
    
    def test_create_canadapost_label_uses_settings(self):
        """Test: create_canadapost_label uses CANADAPOST_USE_PRODUCTION from settings"""
        with patch('snmov.utils.canadapost.CanadaPostAPI') as mock_api_class:
            mock_api = Mock()
            mock_api.create_shipping_label.return_value = {
                'label_url': '/test.pdf',
                'tracking_number': '123',
                'carrier': 'Canada Post'
            }
            mock_api_class.return_value = mock_api
            
            with patch('snmov.utils.canadapost.settings') as mock_settings:
                mock_settings.CANADAPOST_USE_PRODUCTION = False
                
                with patch('snmov.utils.cart.get_sender_address'):
                    create_canadapost_label(self.order, 'DOM.EP', use_production=None)
                    
                    # Verify API was initialized with production=False
                    mock_api_class.assert_called_once_with(use_production=False)
    
    def test_get_canadapost_rates_missing_address(self):
        """Test: Error when shipping address is missing"""
        order = Order.objects.create(
            customer=self.user,
            shipping_address=None,
            status='PENDING'
        )
        
        with self.assertRaises(ValueError) as context:
            get_canadapost_rates(order, use_production=None)
        
        self.assertIn('Shipping address not found', str(context.exception))
    
    def test_create_canadapost_label_missing_address(self):
        """Test: Error when shipping address is missing"""
        order = Order.objects.create(
            customer=self.user,
            shipping_address=None,
            status='PENDING'
        )
        
        with self.assertRaises(ValueError) as context:
            create_canadapost_label(order, 'DOM.EP', use_production=None)
        
        self.assertIn('Shipping address not found', str(context.exception))
    
    def test_parcel_dimensions_calculation(self):
        """Test: Parcel dimensions are calculated correctly from order items"""
        # Add another product with different dimensions
        product2 = Product.objects.create(
            title='Large Product',
            slug='large-product',
            price=Decimal('49.99'),
            stock=5,
            available=True,
            package_length=Decimal('20.0'),
            package_width=Decimal('15.0'),
            package_height=Decimal('10.0'),
            weight_grams=1000
        )
        
        OrderItem.objects.create(
            order=self.order,
            product=product2,
            quantity=1
        )
        
        with patch('snmov.utils.canadapost.CanadaPostAPI') as mock_api_class:
            mock_api = Mock()
            mock_api.get_shipping_rates.return_value = []
            mock_api_class.return_value = mock_api
            
            with patch('snmov.utils.canadapost.settings') as mock_settings:
                mock_settings.CANADAPOST_USE_PRODUCTION = False
                
                with patch('snmov.utils.cart.get_sender_address'):
                    get_canadapost_rates(self.order, use_production=None)
                    
                    # Verify API was called with correct parcel dimensions
                    call_args = mock_api.get_shipping_rates.call_args
                    parcel = call_args[0][2]  # Third argument is parcel
                    
                    # Should use max length (20.0), sum widths (5.0*2 + 15.0 = 25.0), max height (10.0)
                    self.assertEqual(parcel['length'], 20.0)
                    self.assertEqual(parcel['width'], 25.0)
                    self.assertEqual(parcel['height'], 10.0)
                    # Weight should be sum: (500*2 + 1000*1) / 1000 = 2.0 kg
                    self.assertEqual(parcel['weight'], 2.0)


class CanadaPostXMLParsingTestCase(TestCase):
    """Test XML parsing for Canada Post responses"""
    
    def test_parse_rates_response(self):
        """Test: Parse rates XML response correctly"""
        xml_response = '''<?xml version="1.0" encoding="UTF-8"?>
        <price-quotes xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
            <price-quote>
                <service-code>DOM.EP</service-code>
                <service-name>Expedited Parcel</service-name>
                <price-details>
                    <due>12.50</due>
                </price-details>
                <expected-delivery-date>2025-12-05</expected-delivery-date>
            </price-quote>
            <price-quote>
                <service-code>DOM.PC</service-code>
                <service-name>Priority</service-name>
                <price-details>
                    <due>18.75</due>
                </price-details>
            </price-quote>
        </price-quotes>'''
        
        with override_settings(
            CANADAPOST_USERNAME='dev_user',
            CANADAPOST_PASSWORD='dev_pass',
            CANADAPOST_CUSTOMER_NUMBER='123456',
            CANADAPOST_DEVELOPMENT_USERNAME='dev_user',
            CANADAPOST_DEVELOPMENT_PASSWORD='dev_pass',
            CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456'
        ):
            api = CanadaPostAPI(use_production=False)
            rates = api._parse_rates_response(xml_response)
            
            self.assertEqual(len(rates), 2)
            self.assertEqual(rates[0]['service_code'], 'DOM.EP')
            self.assertEqual(rates[0]['service_name'], 'Expedited Parcel')
            self.assertEqual(rates[0]['amount'], Decimal('12.50'))
            self.assertEqual(rates[0]['estimated_delivery'], '2025-12-05')
            self.assertEqual(rates[1]['service_code'], 'DOM.PC')
            self.assertEqual(rates[1]['amount'], Decimal('18.75'))
    
    def test_parse_shipment_response(self):
        """Test: Parse shipment creation response to get shipment ID"""
        xml_response = '''<?xml version="1.0" encoding="UTF-8"?>
        <shipment-info xmlns="http://www.canadapost.ca/ws/shipment-v8">
            <shipment-id>12345678</shipment-id>
            <shipment-status>transmitted</shipment-status>
        </shipment-info>'''
        
        with override_settings(
            CANADAPOST_USERNAME='dev_user',
            CANADAPOST_PASSWORD='dev_pass',
            CANADAPOST_CUSTOMER_NUMBER='123456',
            CANADAPOST_DEVELOPMENT_USERNAME='dev_user',
            CANADAPOST_DEVELOPMENT_PASSWORD='dev_pass',
            CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456'
        ):
            api = CanadaPostAPI(use_production=False)
            shipment_id = api._parse_shipment_response(xml_response)
            
            self.assertEqual(shipment_id, '12345678')
    
    def test_parse_tracking_number(self):
        """Test: Parse tracking number from shipment response"""
        xml_response = '''<?xml version="1.0" encoding="UTF-8"?>
        <shipment-info xmlns="http://www.canadapost.ca/ws/shipment-v8">
            <shipment-id>12345678</shipment-id>
            <tracking-pin>1234567890123456</tracking-pin>
        </shipment-info>'''
        
        with override_settings(
            CANADAPOST_USERNAME='dev_user',
            CANADAPOST_PASSWORD='dev_pass',
            CANADAPOST_CUSTOMER_NUMBER='123456',
            CANADAPOST_DEVELOPMENT_USERNAME='dev_user',
            CANADAPOST_DEVELOPMENT_PASSWORD='dev_pass',
            CANADAPOST_DEVELOPMENT_CUSTOMER_NUMBER='123456'
        ):
            api = CanadaPostAPI(use_production=False)
            tracking = api._parse_tracking_number(xml_response)
            
            self.assertEqual(tracking, '1234567890123456')

