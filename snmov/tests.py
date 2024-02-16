from django.test import TestCase
from django.urls import reverse
from .models import ReachOut, Product, SiteImage, ProductNotification
from snm.views import home_page
from django.core import mail
from snm.forms import ProductNotificationForm
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType


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
        # Create a sample product for testing
        self.unavailable_product = Product.objects.create(
            title='Test Product',
            description='Test Description',
            content='Test Content',
            available=False,
        )

    def test_product_notification_form_submission(self):
        # Set up data for the form submission
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'products': [self.unavailable_product.id],
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

        # Check that the confirmation email is sent
        # self.assertEqual(len(mail.outbox), 1)
        # self.assertEqual(mail.outbox[0].subject, 'Notification Confirmation')
        # self.assertEqual(mail.outbox[0].to, ['john.doe@example.com'])

        # Check that the success message is displayed
        # messages = list(response.context['messages'])
        # self.assertEqual(len(messages), 1)
        # self.assertEqual(str(messages[0]), 'Thank you, we will only notify you of product availability.')