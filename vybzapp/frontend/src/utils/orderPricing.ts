export interface OrderPricingSummary {
  /** Sum of catalog list prices before product sale discounts */
  listSubtotal?: number;
  /** Savings from product sale prices (list − sale) */
  productSaleSavings?: number;
  /** Merchandise after product sales, before coupon */
  merchandiseSubtotal: number;
  couponCode?: string;
  couponDiscount?: number;
  shippingCost?: number | null;
  taxAmount?: number;
  showTax?: boolean;
  /** Label for the final row (e.g. "Total (before tax)" or "Total") */
  totalLabel?: string;
  totalAmount?: number | null;
}

export function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function merchandiseAfterCoupon(summary: OrderPricingSummary): number {
  const coupon = summary.couponDiscount ?? 0;
  return Math.max(0, summary.merchandiseSubtotal - coupon);
}

export function computeTotalBeforeTax(
  summary: OrderPricingSummary,
  shipping: number
): number {
  return merchandiseAfterCoupon(summary) + shipping;
}
