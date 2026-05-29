import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import { parseJsonApiError } from '../utils/parseJsonApiError';
import OrderPricingBreakdown from '../components/OrderPricingBreakdown';

function getCookie(name: string): string | null {
  let cookieValue: string | null = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

interface ShippingRate {
  object_id: string;
  provider: string;
  servicelevel: {
    name: string;
  };
  estimated_days: number;
  estimated_delivery?: string;
  amount: string;
  total_with_shipping: string;
  _canadapost_service_name?: string;
}

interface OrderPricing {
  list_subtotal?: number;
  product_sale_savings?: number;
  merchandise_subtotal: number;
  coupon_code?: string;
  coupon_discount: number;
  merchandise_after_coupon: number;
}

interface OrderLine {
  product: {
    title: string;
  };
  quantity: number;
  list_price?: number;
  unit_price?: number;
  line_total?: number;
}

interface Order {
  id: number;
  customer: {
    username: string;
  };
  order_date: string;
  status: string;
  shipping_cost: number;
  orderitem_set: OrderLine[];
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function formatDeliveryDate(isoDate: string): string | null {
  const trimmed = isoDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const [y, m, d] = trimmed.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function buildDeliveryHint(rate: ShippingRate): string {
  const days = rate.estimated_days || 0;
  const deliveryLabel = rate.estimated_delivery
    ? formatDeliveryDate(rate.estimated_delivery)
    : null;
  if (deliveryLabel) {
    return `Estimated delivery ${deliveryLabel}`;
  }
  if (days > 0) {
    return `${days} business day${days !== 1 ? 's' : ''}`;
  }
  return 'Delivery estimate unavailable';
}

function sumLineTotals(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + (line.line_total ?? 0), 0);
}

const SelectShipping: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [pricing, setPricing] = useState<OrderPricing | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchOrderAndRates = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`/api/orders/${orderId}/shipping/`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order and shipping rates');
      }

      const data = await response.json();
      setOrder(data.order);
      setPricing((data.pricing as OrderPricing) ?? null);

      const sortedRates = (data.rates || []).sort((a: ShippingRate, b: ShippingRate) => {
        return parseFloat(a.amount || '0') - parseFloat(b.amount || '0');
      });
      setRates(sortedRates);
      if (sortedRates.length === 1) {
        setSelectedRateId(sortedRates[0].object_id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load shipping options';
      console.error('Error fetching order:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderAndRates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const selectedRate = useMemo(
    () => rates.find((r) => r.object_id === selectedRateId) ?? null,
    [rates, selectedRateId]
  );

  const selectedShipping = selectedRate ? parseFloat(selectedRate.amount || '0') : 0;

  const resolvedPricing = useMemo(() => {
    const lines = order?.orderitem_set ?? [];
    const fromLines = sumLineTotals(lines);
    const apiMerch = pricing?.merchandise_subtotal ?? 0;
    const merchandiseSubtotal = fromLines > 0 ? fromLines : apiMerch;
    const couponDiscount = pricing?.coupon_discount ?? 0;
    const productSaleSavings = pricing?.product_sale_savings ?? 0;
    const listSubtotal = pricing?.list_subtotal ?? merchandiseSubtotal + productSaleSavings;
    const couponCode = pricing?.coupon_code ?? '';
    const merchandiseAfterCoupon =
      pricing?.merchandise_after_coupon ??
      Math.max(0, merchandiseSubtotal - couponDiscount);
    return {
      listSubtotal,
      productSaleSavings,
      merchandiseSubtotal,
      couponCode,
      couponDiscount,
      merchandiseAfterCoupon,
    };
  }, [order, pricing]);

  const totalBeforeTax = useMemo(() => {
    if (selectedRate) {
      return parseFloat(selectedRate.total_with_shipping || '0');
    }
    return resolvedPricing.merchandiseAfterCoupon;
  }, [selectedRate, resolvedPricing.merchandiseAfterCoupon]);

  const totalsConsistent = useMemo(() => {
    if (!selectedRate) {
      return true;
    }
    const expected =
      resolvedPricing.merchandiseAfterCoupon + selectedShipping;
    return Math.abs(expected - totalBeforeTax) < 0.02;
  }, [selectedRate, resolvedPricing.merchandiseAfterCoupon, selectedShipping, totalBeforeTax]);

  const handleSelectRate = async (rateId: string) => {
    setSelectedRateId(rateId);
    setSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const csrfToken =
        getCookie('csrftoken') ||
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`/api/orders/${orderId}/select-shipping/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ rate_id: rateId }),
      });

      if (!response.ok) {
        throw new Error(
          await parseJsonApiError(response.clone(), 'Failed to select shipping rate')
        );
      }

      const data = await response.json();
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to select shipping rate';
      console.error('Error selecting shipping rate:', err);
      setMessage(msg);
      setMessageType('danger');
      setShowMessage(true);
      setSubmitting(false);
    }
  };

  const pageShell = (heroLead: string, children: React.ReactNode) => (
    <div className="product-landing select-shipping">
      <section className="product-landing__hero">
        <div className="product-landing__container store-page__heroRow">
          <div className="store-page__heroMain">
            <p className="product-landing__eyebrow">Store · Step 2 of 2</p>
            <h1 className="product-landing__h1">Shipping</h1>
            <p className="product-landing__lead">{heroLead}</p>
          </div>
        </div>
      </section>
      <section className="product-landing__section store-page__section select-shipping__section">
        <div className="product-landing__container">{children}</div>
      </section>
    </div>
  );

  if (loading) {
    return pageShell(
      'Fetching Canada Post rates for your order…',
      <div className="store-page__loadingWrap">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return pageShell(
      'We could not load shipping options for this order.',
      <>
        <div className="store-page__error" role="alert">
          <i className="fas fa-exclamation-triangle store-page__errorIcon" aria-hidden />
          <span>{error}</span>
        </div>
        <div className="store-page__ctaRow">
          <Link to="/product/cart/checkout/" className="product-landing__ctaGhost store-page__linkBtn">
            Back to checkout
          </Link>
          <Link to="/product/cart/" className="product-landing__ctaPrimary store-page__linkBtn">
            Back to cart
          </Link>
        </div>
      </>
    );
  }

  return pageShell(
    'Pick a delivery speed. Your order total is shown on the right; tax is added at payment.',
    <>
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={() => setShowMessage(false)}
        duration={5000}
      />

      <div className="select-shipping__layout">
        {order && (
          <aside className="select-shipping__summary">
            <div className="store-page__panel select-shipping__summaryPanel">
              <div className="store-page__panelHead">
                <h2 className="store-page__panelTitle">Order #{order.id}</h2>
              </div>
              <div className="store-page__panelBody store-page__panelBody--padded">
                {order.orderitem_set?.length ? (
                  <ul className="store-page__itemList select-shipping__lineList">
                    {order.orderitem_set.map((line, idx) => (
                      <li key={`${line.product?.title ?? 'item'}-${idx}`} className="store-page__itemRow select-shipping__lineRow">
                        <div className="select-shipping__lineMain">
                          <span className="store-page__itemName">{line.product?.title ?? 'Item'}</span>
                          <span className="select-shipping__lineMeta">
                            {line.quantity > 1 ? `${line.quantity} × ` : ''}
                            {typeof line.list_price === 'number' &&
                            typeof line.unit_price === 'number' &&
                            line.list_price > line.unit_price ? (
                              <>
                                <span className="order-pricing-breakdown__was">
                                  ${formatMoney(line.list_price)}
                                </span>{' '}
                                ${formatMoney(line.unit_price)}
                              </>
                            ) : typeof line.unit_price === 'number' ? (
                              `$${formatMoney(line.unit_price)}`
                            ) : (
                              ''
                            )}
                          </span>
                        </div>
                        <span className="select-shipping__lineTotal">
                          {typeof line.line_total === 'number'
                            ? `$${formatMoney(line.line_total)}`
                            : `×${line.quantity}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="select-shipping__muted">No line items listed.</p>
                )}

                <div className="store-page__divider" />

                <div className="select-shipping__priceBreakdown">
                  <OrderPricingBreakdown
                    emphasizeTotal
                    pricing={{
                      listSubtotal: resolvedPricing.listSubtotal,
                      productSaleSavings: resolvedPricing.productSaleSavings,
                      merchandiseSubtotal: resolvedPricing.merchandiseSubtotal,
                      couponCode: resolvedPricing.couponCode,
                      couponDiscount: resolvedPricing.couponDiscount,
                      shippingCost: selectedRate ? selectedShipping : null,
                      totalLabel: 'Total (before tax)',
                      totalAmount: selectedRate ? totalBeforeTax : null,
                    }}
                  />

                  {!totalsConsistent && selectedRate && (
                    <p className="select-shipping__warn" role="status">
                      Totals are being recalculated. Refresh if this looks wrong.
                    </p>
                  )}
                  <p className="select-shipping__summaryNote">
                    HST/GST is added on the Stripe payment screen.
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/product/cart/checkout/"
              className="product-landing__ctaGhost store-page__linkBtn select-shipping__backLink"
            >
              <i className="fas fa-arrow-left me-2" aria-hidden />
              Edit checkout details
            </Link>
          </aside>
        )}

        <div className="select-shipping__main">
          <div className="store-page__panel select-shipping__optionsPanel">
            <div className="store-page__panelHead select-shipping__optionsHead">
              <div>
                <h2 className="store-page__panelTitle">Delivery</h2>
                <p className="select-shipping__muted select-shipping__optionsSub">
                  {rates.length > 0
                    ? `${rates.length} Canada Post option${rates.length !== 1 ? 's' : ''}`
                    : 'No rates returned for this address.'}
                </p>
              </div>
              <div className="select-shipping__carrierMark" aria-label="Shipped via Canada Post">
                <i className="fas fa-envelope select-shipping__carrierIcon" aria-hidden />
                <span className="select-shipping__carrierName">Canada Post</span>
              </div>
            </div>

            <div className="store-page__panelBody store-page__panelBody--padded">
              {rates.length > 0 ? (
                <>
                  <ul className="select-shipping__rateList" role="radiogroup" aria-label="Shipping options">
                    {rates.map((rate, index) => {
                      const serviceName =
                        rate.servicelevel?.name || rate._canadapost_service_name || 'Standard shipping';
                      const shippingAmount = parseFloat(rate.amount || '0');
                      const uniqueKey = rate.object_id || `rate-${index}`;
                      const isSelected = selectedRateId === rate.object_id;

                      return (
                        <li key={uniqueKey} className="select-shipping__rateItem">
                          <button
                            type="button"
                            className={`select-shipping__rateCard${isSelected ? ' select-shipping__rateCard--selected' : ''}`}
                            role="radio"
                            aria-checked={isSelected}
                            disabled={submitting}
                            onClick={() => setSelectedRateId(rate.object_id)}
                          >
                            <span className="select-shipping__radio" aria-hidden>
                              {isSelected ? (
                                <i className="fas fa-circle-dot" />
                              ) : (
                                <i className="far fa-circle" />
                              )}
                            </span>
                            <span className="select-shipping__rateMain">
                              <span className="select-shipping__rateName">{serviceName}</span>
                              <span className="select-shipping__rateEta">{buildDeliveryHint(rate)}</span>
                            </span>
                            <span className="select-shipping__rateShippingAmt">
                              +${formatMoney(shippingAmount)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="select-shipping__actions">
                    <button
                      type="button"
                      className="product-landing__ctaPrimary store-page__linkBtn select-shipping__cta"
                      onClick={() => selectedRateId && handleSelectRate(selectedRateId)}
                      disabled={!selectedRateId || submitting}
                      aria-busy={submitting}
                    >
                      {submitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin me-2" aria-hidden />
                          Redirecting to payment…
                        </>
                      ) : (
                        'Continue to payment'
                      )}
                    </button>
                    {selectedRate && (
                      <p className="select-shipping__ctaNote">
                        You will pay <strong>${formatMoney(totalBeforeTax)}</strong> before tax on the
                        next screen.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="store-page__empty select-shipping__empty">
                  <div className="store-page__emptyIcon" aria-hidden>
                    <i className="fas fa-box-open" />
                  </div>
                  <h3 className="store-page__emptyTitle">No shipping options</h3>
                  <p className="store-page__emptyBody">
                    We could not get a Canada Post rate for this address or parcel. Check your postal
                    code and try again, or contact support.
                  </p>
                  <div className="store-page__ctaRow">
                    <Link to="/product/cart/checkout/" className="product-landing__ctaGhost store-page__linkBtn">
                      Back to checkout
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectShipping;
