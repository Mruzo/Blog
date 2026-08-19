"""
Tests for username uniqueness validation
"""
from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
import uuid


class UsernameUniquenessTestCase(APITestCase):
    """Test username uniqueness validation"""
    
    def setUp(self):
        """Set up test data"""
        unique_suffix = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f'testuser_{unique_suffix}',
            email=f'test_{unique_suffix}@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create another user with a different username
        self.other_user = User.objects.create_user(
            username=f'otheruser_{unique_suffix}',
            email=f'other_{unique_suffix}@example.com',
            password='testpass123'
        )
        
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
    
    def test_username_uniqueness_on_registration(self):
        """Test that registration rejects duplicate usernames"""
        url = reverse('icvybz-api:auth-register')
        data = {
            'username': self.user.username,  # Try to use existing username
            'email': 'newemail@example.com',
            'password': 'newpass123',
            'password2': 'newpass123',
            'first_name': 'New',
            'last_name': 'User',
            'accept_terms': True
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        # Registration API returns 'Username already exists' message
        error_msg = response.data.get('error', '').lower()
        self.assertTrue('username' in error_msg or 'already exists' in error_msg)
    
    def test_username_uniqueness_on_update(self):
        """Test that user update rejects duplicate usernames"""
        url = reverse('icvybz-api:auth-user')
        
        # Try to change username to an existing one
        data = {
            'username': self.other_user.username
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('username', response.data.get('error', '').lower())
        self.assertIn('already exists', response.data.get('error', '').lower())
    
    def test_username_update_to_unique_username(self):
        """Test that user can update to a unique username"""
        url = reverse('icvybz-api:auth-user')
        unique_suffix = str(uuid.uuid4())[:8]
        new_username = f'newusername_{unique_suffix}'
        
        data = {
            'username': new_username
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], new_username)
        
        # Verify username was updated in database
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, new_username)
    
    def test_username_update_to_same_username(self):
        """Test that user can 'update' to the same username (no-op)"""
        url = reverse('icvybz-api:auth-user')
        original_username = self.user.username
        
        data = {
            'username': original_username
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], original_username)
        
        # Verify username unchanged
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, original_username)
    
    def test_username_update_with_first_last_name(self):
        """Test that username update works alongside first_name/last_name update"""
        url = reverse('icvybz-api:auth-user')
        unique_suffix = str(uuid.uuid4())[:8]
        new_username = f'updateduser_{unique_suffix}'
        
        data = {
            'username': new_username,
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], new_username)
        self.assertEqual(response.data['first_name'], 'Updated')
        self.assertEqual(response.data['last_name'], 'Name')
        
        # Verify all fields updated
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, new_username)
        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(self.user.last_name, 'Name')
