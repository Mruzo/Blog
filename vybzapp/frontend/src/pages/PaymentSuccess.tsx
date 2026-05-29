import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import OrderPricingBreakdown from '../components/OrderPricingBreakdown';
import { parseJsonApiError } from '../utils/parseJsonApiError';
import { OrderPricingSummary } from '../utils/orderPricing';

interface Order {
  id: number;
  order_date: string;
  status: string;
  shipping_cost: number;
  tracking_number?: string;
  label_url?: string;
  shipping_provider?: string;
  coupon_code?: string;
  coupon_discount?: number;
  merchandise_subtotal?: number;
  product_sale_savings?: number;
  tax_amount?: number;
  grand_total?: number;
  orderitem_set: Array<{
    product: {
      title: string;
    };
    quantity: number;
  }>;
  shipping_address: {
    full_name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country_code: string;
  };
}

function buildPricingFromOrder(order: Order): OrderPricingSummary {
  const merch = order.merchandise_subtotal ?? 0;
  const productSavings = order.product_sale_savings ?? 0;
  return {
    listSubtotal: merch + productSavings,
    productSaleSavings: productSavings,
    merchandiseSubtotal: merch,
    couponCode: order.coupon_code,
    couponDiscount: order.coupon_discount,
    shippingCost: order.shipping_cost ?? 0,
    taxAmount: order.tax_amount,
    showTax: (order.tax_amount ?? 0) > 0,
    totalLabel: 'Total paid',
    totalAmount: order.grand_total,
  };
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [shippingSuccess, setShippingSuccess] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      fetchOrderDetails(sessionId);
    } else {
      setMessage('No session ID provided');
      setMessageType('danger');
      setShowMessage(true);
      setLoading(false);
    }
  }, [searchParams]);

  const fetchOrderDetails = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`/api/payment/success/?session_id=${sessionId}`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(
          await parseJsonApiError(response.clone(), 'Failed to fetch order details')
        );
      }

      const data = await response.json();
      setOrder(data.order);
      setShippingSuccess(data.shipping_success || false);

      if (data.shipping_success) {
        setMessage('Order placed successfully! Shipping label has been created.');
        setMessageType('success');
      } else {
        setMessage(
          'Order placed successfully, but there was an issue creating the shipping label. Our team will handle this manually.'
        );
        setMessageType('warning');
      }
      setShowMessage(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load order details';
      console.error('Error fetching order details:', error);
      setMessage(msg);
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="product-landing">
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner />
          </div>
        </section>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="product-landing">
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container">
            <div className="store-page__error" role="alert">
              Order not found
            </div>
            <Link to="/product/" className="product-landing__ctaPrimary store-page__linkBtn">
              Continue shopping
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const pricing = buildPricingFromOrder(order);

  return (
    <div className="product-landing payment-success">
      <section className="product-landing__hero">
        <div className="product-landing__container">
          <p className="product-landing__eyebrow">Store</p>
          <h1 className="product-landing__h1">Thank you!</h1>
          <p className="product-landing__lead">
            Payment received for order #{order.id}.
          </p>
        </div>
      </section>

      <section className="product-landing__section store-page__section">
        <div className="product-landing__container">
          <MessagePopup
            message={message}
            type={messageType}
            show={showMessage}
            onClose={() => setShowMessage(false)}
            duration={8000}
          />

          <div className="payment-success__layout">
            <div className="store-page__panel">
              <div className="store-page__panelHead">
                <h2 className="store-page__panelTitle">Order items</h2>
              </div>
              <div className="store-page__panelBody store-page__panelBody--padded">
                <ul className="store-page__itemList">
                  {order.orderitem_set.map((item, index) => (
                    <li key={index} className="store-page__itemRow">
                      <span className="store-page__itemName">{item.product.title}</span>
                      <span className="store-page__itemQty">×{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="store-page__panel">
              <div className="store-page__panelHead">
                <h2 className="store-page__panelTitle">Order total</h2>
              </div>
              <div className="store-page__panelBody store-page__panelBody--padded">
                <OrderPricingBreakdown pricing={pricing} />
              </div>
            </div>

            <div className="store-page__panel">
              <div className="store-page__panelHead">
                <h2 className="store-page__panelTitle">Ship to</h2>
              </div>
              <div className="store-page__panelBody store-page__panelBody--padded">
                <address className="payment-success__address">
                  <strong>{order.shipping_address.full_name}</strong>
                  <br />
                  {order.shipping_address.address_line_1}
                  <br />
                  {order.shipping_address.address_line_2 && (
                    <>
                      {order.shipping_address.address_line_2}
                      <br />
                    </>
                  )}
                  {order.shipping_address.city}, {order.shipping_address.state}{' '}
                  {order.shipping_address.postal_code}
                  <br />
                  {order.shipping_address.country_code}
                </address>
              </div>
            </div>

            {shippingSuccess && order.tracking_number && (
              <div className="store-page__infoBanner payment-success__tracking">
                <p>
                  <strong>Tracking:</strong> {order.tracking_number}
                  {order.shipping_provider ? ` (${order.shipping_provider})` : ''}
                </p>
                {order.label_url && (
                  <a
                    href={order.label_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="product-landing__ctaGhost store-page__linkBtn"
                  >
                    View shipping label
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="store-page__ctaRow payment-success__actions">
            <Link to="/product/" className="product-landing__ctaPrimary store-page__linkBtn">
              Continue shopping
            </Link>
            <Link to="/product/my-orders/" className="product-landing__ctaGhost store-page__linkBtn">
              View my orders
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PaymentSuccess;
