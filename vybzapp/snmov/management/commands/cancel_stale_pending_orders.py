"""
Cancel unpaid checkout orders and restore stock.

Schedule in production (e.g. daily cron):
  python manage.py cancel_stale_pending_orders

Uses settings.STALE_PENDING_ORDER_HOURS (default 72).
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F
from django.db.models.functions import Greatest
from django.utils import timezone

from snmov.models import Order, Product, Coupon


class Command(BaseCommand):
    help = 'Mark stale PENDING orders as CANCELLED and restore product stock'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=None,
            help='Override STALE_PENDING_ORDER_HOURS from settings',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List orders that would be cancelled without changing the database',
        )

    def handle(self, *args, **options):
        from django.conf import settings

        hours = options['hours']
        if hours is None:
            hours = int(getattr(settings, 'STALE_PENDING_ORDER_HOURS', 72))
        dry = options['dry_run']
        cutoff = timezone.now() - timedelta(hours=hours)

        qs = Order.objects.filter(
            status='PENDING',
            payment_completed_at__isnull=True,
            order_date__lt=cutoff,
        ).prefetch_related('orderitem_set__product')

        count = qs.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No stale pending orders found.'))
            return

        self.stdout.write(f'Found {count} stale PENDING order(s) older than {hours}h.')

        if dry:
            for o in qs:
                self.stdout.write(f'  would cancel order {o.id} customer={o.customer_id}')
            return

        cancelled = 0
        for order in qs:
            with transaction.atomic():
                o = Order.objects.select_for_update().get(pk=order.pk)
                if o.status != 'PENDING' or o.payment_completed_at is not None:
                    continue
                for item in o.orderitem_set.select_related('product').all():
                    Product.objects.filter(pk=item.product_id).update(
                        stock=F('stock') + item.quantity
                    )
                if o.coupon_id:
                    Coupon.objects.filter(pk=o.coupon_id).update(
                        times_redeemed=Greatest(F('times_redeemed') - 1, 0)
                    )
                o.status = 'CANCELLED'
                o.save(update_fields=['status'])
                cancelled += 1

        self.stdout.write(self.style.SUCCESS(f'Cancelled {cancelled} order(s) and restored stock.'))
