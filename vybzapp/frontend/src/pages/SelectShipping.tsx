import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import { parseJsonApiError } from '../utils/parseJsonApiError';

// Helper function to get CSRF token from cookies
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
  provider_image_200: string;
  servicelevel: {
    name: string;
  };
  estimated_days: number;
  amount: string;
  total_with_shipping: string;
  _canadapost_service_name?: string; // Optional Canada Post service name fallback
}

interface Order {
  id: number;
  customer: {
    username: string;
  };
  order_date: string;
  status: string;
  shipping_cost: number;
  orderitem_set: Array<{
    product: {
      title: string;
    };
    quantity: number;
  }>;
}

const SelectShipping: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (orderId) {
      fetchOrderAndRates();
    }
  }, [orderId]);

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

      // Sort rates by cost (amount) from lowest to highest
      const sortedRates = (data.rates || []).sort((a: ShippingRate, b: ShippingRate) => {
        const amountA = parseFloat(a.amount || '0');
        const amountB = parseFloat(b.amount || '0');
        return amountA - amountB;
      });
      setRates(sortedRates);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      setError(error.message || 'Failed to load shipping options');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRate = async (rateId: string) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Add CSRF token for POST requests
      const csrfToken = getCookie('csrftoken') || 
                       document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(`/api/orders/${orderId}/select-shipping/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ rate_id: rateId })
      });

      if (!response.ok) {
        throw new Error(
          await parseJsonApiError(response.clone(), 'Failed to select shipping rate')
        );
      }

      const data = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
      
    } catch (error: any) {
      console.error('Error selecting shipping rate:', error);
      setMessage(error.message || 'Failed to select shipping rate');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  if (loading) {
    return (
      <div className="product-landing">
        <section className="product-landing__hero">
          <div className="product-landing__container store-page__heroRow">
            <div className="store-page__heroMain">
              <p className="product-landing__eyebrow">Store</p>
              <h1 className="product-landing__h1">Shipping</h1>
              <p className="product-landing__lead">Loading carrier rates…</p>
            </div>
          </div>
        </section>
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner />
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-landing">
        <section className="product-landing__hero">
          <div className="product-landing__container store-page__heroRow">
            <div className="store-page__heroMain">
              <p className="product-landing__eyebrow">Store</p>
              <h1 className="product-landing__h1">Shipping</h1>
              <p className="product-landing__lead">We could not load shipping options.</p>
            </div>
          </div>
        </section>
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container">
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
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="product-landing">
      <section className="product-landing__hero">
        <div className="product-landing__container store-page__heroRow">
          <div className="store-page__heroMain">
            <p className="product-landing__eyebrow">Store</p>
            <h1 className="product-landing__h1">Choose shipping</h1>
            <p className="product-landing__lead">
              Pick a service level. You will continue to secure payment after confirming the total.
            </p>
          </div>
          <div className="store-page__heroActions">
            <Link to="/product/cart/checkout/" className="product-landing__ctaGhost store-page__linkBtn">
              Back to checkout
            </Link>
          </div>
        </div>
      </section>

      <section className="product-landing__section store-page__section">
        <div className="product-landing__container">
          <MessagePopup
            message={message}
            type={messageType}
            show={showMessage}
            onClose={handleCloseMessage}
            duration={5000}
          />

          {order && (
            <div className="store-page__panel" style={{ marginBottom: '1.25rem' }}>
              <div className="store-page__panelHead">
                <h2 className="store-page__panelTitle">Order #{order.id}</h2>
              </div>
              <div className="store-page__panelBody store-page__panelBody--padded product-landing__body">
                {order.orderitem_set?.length ? (
                  <ul className="store-page__itemList">
                    {order.orderitem_set.map((line, idx) => (
                      <li key={`${line.product?.title ?? 'item'}-${idx}`} className="store-page__itemRow">
                        <span className="store-page__itemName">{line.product?.title ?? 'Item'}</span>
                        <span className="store-page__itemQty">×{line.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0 }}>Order {order.id}</p>
                )}
              </div>
            </div>
          )}

          {rates.length > 0 ? (
            <>
              <div className="store-page__rateProvider">
                <img src={rates[0].provider_image_200} alt={rates[0].provider} />
              </div>
              <div className="store-page__rateList">
                {rates.map((rate, index) => {
                  const serviceName =
                    rate.servicelevel?.name || rate._canadapost_service_name || 'Standard shipping';
                  const estimatedDays = rate.estimated_days || 0;
                  const uniqueKey = rate.object_id || `rate-${index}`;
                  return (
                    <div className="store-page__rateCard" key={uniqueKey}>
                      <div>
                        <div className="store-page__rateService">{serviceName}</div>
                        <div className="store-page__rateMeta">
                          {estimatedDays > 0
                            ? `${estimatedDays} business day${estimatedDays !== 1 ? 's' : ''} est.`
                            : 'Delivery estimate unavailable'}
                          {' · '}
                          Shipping ${parseFloat(rate.amount || '0').toFixed(2)}
                        </div>
                      </div>
                      <div className="store-page__ratePick">
                        <button
                          type="button"
                          className="product-landing__ctaPrimary store-page__linkBtn"
                          onClick={() => handleSelectRate(rate.object_id)}
                          disabled={submitting}
                        >
                          {submitting ? 'Processing…' : `Pay $${parseFloat(rate.total_with_shipping || '0').toFixed(2)}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="product-landing__body">No shipping options available.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default SelectShipping;
