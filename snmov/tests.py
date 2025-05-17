from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from snmov.models import ReachOut, Product, SiteImage, ProductNotification, Order, OrderItem
from django.core.mail import outbox
from snm.forms import ProductNotificationForm
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core import mail
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
import re


class ContactFormTest(TestCase):
    def test_contact_form_submission(self):
        # Define test data
        form_data = {
            'full_name': 'John Doe',
            'email': 'john@example.com',
            'subject': 'Test Subject',
            'content': 'This is a test message.',
        }

        # Send a POST request to the contact form view
        response = self.client.post(reverse('contact'), form_data)

        # Check if the form submission was successful
        self.assertEqual(response.status_code, 302)  # Assuming successful submission redirects

        # Optionally, check if the form data is stored in the database
        self.assertTrue(ReachOut.objects.filter(**form_data).exists())


class ProductNotificationTest(TestCase):

    def setUp(self):

        # Create a sample user for the foreign key
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123'
        )

        # Create a sample product for testing
        self.unavailable_product = Product.objects.create(
            title='Test Product',
            description='Test Description',
            content='Test Content',
            price=10.00,  # Add a valid price here
            stock=0,
            available=False,
        )

    def test_product_notification_form_submission(self):
        # Set up data for the form submission
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'products': [self.unavailable_product.id],
            'price': '5.00'
        }

        # Make a POST request to the home page with form data
        response = self.client.post(reverse('homepage'), data)

        # Check that the form submission redirects to the home page
        self.assertEqual(response.status_code, 302)

        # Check that the user data is saved in the database
        self.assertEqual(ProductNotification.objects.count(), 1)
        notification = ProductNotification.objects.first()
        self.assertEqual(notification.first_name, 'John')
        self.assertEqual(notification.last_name, 'Doe')
        self.assertEqual(notification.email, 'john.doe@example.com')
        self.assertEqual(notification.product, self.unavailable_product)


class OrderModelTest(TestCase):

    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123'
        )
        
        # Create a test product
        self.product = Product.objects.create(
            title='Test Product',
            price=10.00,
            stock=100
        )

    def test_order_creation(self):
        # Create an order
        order = Order.objects.create(
            customer=self.user,
            status='PENDING',
        )
        
        # Create an OrderItem with quantity and add it to the order
        order_item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2  # Ensure quantity is set
        )

        # Test if the order is created successfully
        self.assertEqual(order.customer.username, 'testuser')
        self.assertEqual(order.status, 'PENDING')
        self.assertEqual(order_item.quantity, 2)  # Test that quantity is correctly set
        self.assertIn(self.product, order.products.all())  # Ensure the product is added
        self.assertIsNotNone(order.order_date)  # Ensure order date is set

    def test_order_status_choices(self):
        # Test if the status choices work correctly
        order = Order.objects.create(customer=self.user, status='SHIPPED')
        self.assertEqual(order.status, 'SHIPPED')

        order.status = 'CANCELLED'
        order.save()
        self.assertEqual(order.status, 'CANCELLED')

    def test_order_str_representation(self):
        # Test the string representation of the order
        order = Order.objects.create(customer=self.user)
        self.assertEqual(str(order), f"Order {order.id} by testuser")


class CartTestCase(TestCase):

    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password123'
        )

        # Create a product to add to the cart
        self.product = Product.objects.create(
            title="Test Product",
            price=10.00,
            stock=100
        )

    def test_add_item_to_cart(self):
        # Send a POST request to add the product to the cart
        response = self.client.post(
            reverse('snmov:add_to_cart', args=[self.product.id]),
            {"quantity": 1},  # Send the quantity
        )
        
        # Check that the response indicates success
        self.assertEqual(response.status_code, 200)

        # Verify the cart data in the session
        cart_data = self.client.session.get('cart', {})
        cart_items = cart_data.get('items', [])
        print(cart_data)
        
        # Ensure the product is in the cart
        self.assertTrue(
            any(item['product_pk'] == str(self.product.id) for item in cart_items),
            "Product was not added to the cart."
        ) 

        # Check the quantity
        item = next(item for item in cart_items if item['product_pk'] == str(self.product.id))
        self.assertEqual(item['quantity'], 1)

    
class EmailVerificationTest(TestCase):

    def test_email_sent_on_registration(self):
        # Simulate a user registration
        response = self.client.post('/register/', {
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'testuser@example.com',
            'username': 'testuser',
            'password1': 'admin2015',  # Password field
            'password2': 'admin2015',  # Password confirmation field
        })
        
        # Check if the response redirects to the root URL
        self.assertRedirects(response, '/', status_code=302, target_status_code=200)
        
        # Check if the email was sent
        self.assertEqual(len(mail.outbox), 1)  # Verify one email was sent
        email = mail.outbox[0]
        
        # Check if the email subject contains "Verify Your Email"
        self.assertIn('Verify Your Email', email.subject)

        # Extract the token from the email body using a regular expression
        token_match = re.search(r'/verify_email/(\d+)/([a-zA-Z0-9\-]+)/', email.body)
        
        # Ensure the token is found in the body
        self.assertIsNotNone(token_match, "Token not found in the email body")
        
        # Extract user ID and token from the match
        user_id, token = token_match.groups()
        
        # Get the current host for the dynamic URL
        current_host = settings.ALLOWED_HOSTS[0]  # Or hardcode for development like '127.0.0.1'
        
        # Check if the verification URL is correctly formed
        self.assertIn(f'http://{current_host}/verify_email/{user_id}/{token}/', email.body)

    def test_user_can_verify_email(self):
        # Simulate a user registration
        user = User.objects.create_user(username='testuser', email='testuser@example.com', password='admin2015')

        # Generate the verification link (this should come from your view that handles email verification)
        verification_link = reverse('verify_email', args=[user.id, 'some_token'])  # Update with actual URL
        response = self.client.get(verification_link)

        # Check if the user email is verified
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_invalid_verification_link(self):
        # Simulate clicking on an invalid verification link
        response = self.client.get('/verify/invalid_link/')
        self.assertContains(response, "Invalid verification link")