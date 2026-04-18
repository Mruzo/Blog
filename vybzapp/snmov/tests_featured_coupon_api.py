"""API contract for the /product/ storefront featured coupon (ProductList + public GET)."""
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.test import APIClient

from snmov.models import Coupon


class FeaturedStorefrontCouponApiTests(TestCase):
    """Ensures GET /api/coupons/featured/ matches what the React ProductList expects."""

    def setUp(self):
        self.client = APIClient()

    def _make_coupon(self, **kwargs):
        defaults = dict(
            code='SAVE10',
            description='10% off desk mats this week',
            is_active=True,
            discount_type=Coupon.DISCOUNT_TYPE_PERCENT,
            percent_off=Decimal('10.00'),
            amount_off=Decimal('0.00'),
            featured_on_storefront=False,
        )
        defaults.update(kwargs)
        return Coupon.objects.create(**defaults)

    def test_no_featured_coupon_returns_inactive(self):
        self._make_coupon(code='A', featured_on_storefront=False)
        url = reverse('api:coupon-featured-storefront')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['active'], False)
        self.assertIsNone(response.data['coupon'])

    def test_featured_valid_coupon_returns_code_and_description(self):
        c = self._make_coupon(
            code='DESK20',
            description='  Free shipping on mats  ',
            featured_on_storefront=True,
        )
        url = reverse('api:coupon-featured-storefront')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['active'])
        self.assertEqual(response.data['coupon']['code'], c.code)
        # API returns trimmed model description (no synthetic line when non-empty)
        self.assertEqual(response.data['coupon']['description'], 'Free shipping on mats')

    def test_featured_expired_coupon_returns_inactive(self):
        past = timezone.now() - timedelta(days=2)
        self._make_coupon(
            code='OLD',
            description='Was a deal',
            featured_on_storefront=True,
            ends_at=past,
        )
        response = self.client.get(reverse('api:coupon-featured-storefront'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['active'], False)
        self.assertIsNone(response.data['coupon'])

    def test_featured_inactive_flag_returns_inactive(self):
        self._make_coupon(
            code='OFF',
            description='Off',
            is_active=False,
            featured_on_storefront=True,
        )
        response = self.client.get(reverse('api:coupon-featured-storefront'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['active'], False)
