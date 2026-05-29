"""Stripe Checkout line item construction (coupon must not use negative unit_amount)."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from snmov.models import Coupon, Order, OrderItem, Product
from snmov.utils.checkout_fulfillment import build_checkout_line_items

User = get_user_model()


class BuildCheckoutLineItemsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='coupon_checkout',
            email='coupon@example.com',
            password='pass',
        )
        self.product = Product.objects.create(
            title='Ethnic Bliss',
            price=Decimal('31.20'),
            stock=5,
            available=True,
            weight_grams=400,
        )
        self.coupon = Coupon.objects.create(
            code='SAVE10',
            discount_type=Coupon.DISCOUNT_TYPE_PERCENT,
            percent_off=Decimal('10.00'),
            is_active=True,
        )

    def _order_with_coupon(self):
        order = Order.objects.create(customer=self.user, status='PENDING')
        OrderItem.objects.create(order=order, product=self.product, quantity=1)
        merch = order.calculate_merchandise_subtotal()
        discount = self.coupon.compute_discount(merch)
        order.coupon = self.coupon
        order.coupon_code = self.coupon.code
        order.coupon_discount = discount
        order.shipping_cost = Decimal('14.98')
        order.save()
        return order

    def test_coupon_line_items_have_non_negative_unit_amounts(self):
        order = self._order_with_coupon()
        line_items = build_checkout_line_items(order)

        for item in line_items:
            cents = item['price_data']['unit_amount']
            self.assertIsInstance(cents, int)
            self.assertGreaterEqual(cents, 0, msg=item['price_data']['product_data']['name'])

        merch_lines = [
            li for li in line_items
            if li['price_data']['product_data']['name'].startswith('Merchandise')
        ]
        self.assertEqual(len(merch_lines), 1)
        merch_cents = merch_lines[0]['price_data']['unit_amount'] * merch_lines[0]['quantity']
        expected_merch_cents = int(
            (order.calculate_merchandise_subtotal() - order.calculate_coupon_discount()) * 100
        )
        self.assertEqual(merch_cents, expected_merch_cents)
        self.assertIn('SAVE10', merch_lines[0]['price_data']['product_data']['name'])

    def test_without_coupon_uses_per_product_lines(self):
        order = Order.objects.create(customer=self.user, status='PENDING')
        OrderItem.objects.create(order=order, product=self.product, quantity=1)
        order.shipping_cost = Decimal('14.98')
        order.save()

        line_items = build_checkout_line_items(order)
        names = [li['price_data']['product_data']['name'] for li in line_items]
        self.assertIn(self.product.title, names)
        self.assertNotIn('Merchandise', names)

    def test_no_negative_coupon_line_item(self):
        order = self._order_with_coupon()
        line_items = build_checkout_line_items(order)
        names = [li['price_data']['product_data']['name'] for li in line_items]
        self.assertFalse(any('Coupon discount' in n for n in names))
        self.assertFalse(any(li['price_data']['unit_amount'] < 0 for li in line_items))
