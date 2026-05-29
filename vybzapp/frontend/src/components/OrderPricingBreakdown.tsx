import React from 'react';
import {
  OrderPricingSummary,
  formatMoney,
  merchandiseAfterCoupon,
} from '../utils/orderPricing';

interface OrderPricingBreakdownProps {
  pricing: OrderPricingSummary;
  className?: string;
  /** Highlight final total in the select-shipping yellow box style */
  emphasizeTotal?: boolean;
}

const OrderPricingBreakdown: React.FC<OrderPricingBreakdownProps> = ({
  pricing,
  className = '',
  emphasizeTotal = false,
}) => {
  const productSavings = pricing.productSaleSavings ?? 0;
  const couponDiscount = pricing.couponDiscount ?? 0;
  const hasCoupon = Boolean(pricing.couponCode) || couponDiscount > 0;
  const merchAfterCoupon = merchandiseAfterCoupon(pricing);
  const shipping =
    pricing.shippingCost !== undefined && pricing.shippingCost !== null
      ? pricing.shippingCost
      : null;
  const showTax = pricing.showTax && (pricing.taxAmount ?? 0) > 0;
  const totalAmount = pricing.totalAmount;
  const totalLabel = pricing.totalLabel ?? 'Total';

  return (
    <div className={`order-pricing-breakdown ${className}`.trim()}>
      {productSavings > 0 && (
        <>
          <div className="store-page__summaryRow">
            <span>Regular price</span>
            <span>${formatMoney(pricing.listSubtotal ?? pricing.merchandiseSubtotal + productSavings)}</span>
          </div>
          <div className="store-page__summaryRow order-pricing-breakdown__discount">
            <span>Sale savings</span>
            <span>−${formatMoney(productSavings)}</span>
          </div>
        </>
      )}
      <div className="store-page__summaryRow">
        <span>{productSavings > 0 ? 'Items subtotal' : 'Items subtotal'}</span>
        <span>${formatMoney(pricing.merchandiseSubtotal)}</span>
      </div>
      {hasCoupon && (
        <div className="store-page__summaryRow order-pricing-breakdown__discount">
          <span>
            {pricing.couponCode ? (
              <>
                Coupon <strong>{pricing.couponCode}</strong>
              </>
            ) : (
              'Coupon'
            )}
          </span>
          <span>{couponDiscount > 0 ? `−$${formatMoney(couponDiscount)}` : '—'}</span>
        </div>
      )}
      {hasCoupon && couponDiscount > 0 && (
        <div className="store-page__summaryRow order-pricing-breakdown__subrow">
          <span>After coupon</span>
          <span>${formatMoney(merchAfterCoupon)}</span>
        </div>
      )}
      {shipping !== null && (
        <div className="store-page__summaryRow">
          <span>Shipping</span>
          <span>
            {shipping > 0 || pricing.shippingCost === 0
              ? `$${formatMoney(shipping)}`
              : 'Select below'}
          </span>
        </div>
      )}
      {showTax && (
        <div className="store-page__summaryRow">
          <span>Tax</span>
          <span>${formatMoney(pricing.taxAmount ?? 0)}</span>
        </div>
      )}
      {totalAmount !== undefined && totalAmount !== null ? (
        emphasizeTotal ? (
          <div className="select-shipping__totalDue">
            <span className="select-shipping__totalDueLabel">{totalLabel}</span>
            <span className="select-shipping__totalDueAmt">${formatMoney(totalAmount)}</span>
          </div>
        ) : (
          <div className="store-page__summaryRow store-page__summaryRow--strong">
            <span>{totalLabel}</span>
            <span>${formatMoney(totalAmount)}</span>
          </div>
        )
      ) : totalAmount === null ? (
        emphasizeTotal ? (
          <div className="select-shipping__totalDue">
            <span className="select-shipping__totalDueLabel">{totalLabel}</span>
            <span className="select-shipping__totalDueAmt">—</span>
          </div>
        ) : null
      ) : null}
    </div>
  );
};

export default OrderPricingBreakdown;
