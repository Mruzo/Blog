import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';

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
  const navigate = useNavigate();
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
      // Debug: log the rates to see what we're getting
      console.log('Shipping rates received:', JSON.stringify(data.rates, null, 2));
      console.log('First rate structure:', data.rates && data.rates[0] ? JSON.stringify(data.rates[0], null, 2) : 'No rates');
      
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
        throw new Error('Failed to select shipping rate');
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
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container text-center p-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <BackButton to="/product/cart/" variant="primary" />
      </div>
    );
  }

  return (
    <div className="container text-center p-1 mt-0">
      <div className="container mt-5 p-0">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="flex-grow-1">
            <h2 className="subtext-btn text-decoration-none mb-0">Select Shipping Option</h2>
          </div>
          <div className="d-flex gap-2">
            <BackButton to="/product/cart/checkout/" />
          </div>
        </div>
        

        <MessagePopup
          message={message}
          type={messageType}
          show={showMessage}
          onClose={handleCloseMessage}
          duration={5000}
        />

        {error && (
          <div>
            <p className="alert alert-danger m-1">{error}</p>
          </div>
        )}

        

        {rates.length > 0 ? (
          <>
            <hr />

            <div className="table-responsive mt-4 font-quicksand">
              <table className="table table-bordered table-striped table-sm text-center mb-0">
                <thead className="thead-light">
                  {/* Top header with image */}
                  <tr>
                    <th colSpan={4} className="p-1">
                      <img 
                        src={rates[0].provider_image_200} 
                        alt={rates[0].provider} 
                        style={{ height: '30px' }}
                      />
                    </th>
                  </tr>
                  {/* Column titles */}
                  <tr>
                    <th>Service</th>
                    <th>Days</th>
                    <th>Cost</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate, index) => {
                    // Debug: log each rate
                    console.log('Rendering rate:', rate);
                    const serviceName = rate.servicelevel?.name || rate._canadapost_service_name || 'Standard Shipping';
                    const estimatedDays = rate.estimated_days || 0;
                    // Use object_id if available, otherwise use index to ensure unique keys
                    const uniqueKey = rate.object_id || `rate-${index}`;
                    return (
                      <tr className="subtext-btn-sm" key={uniqueKey}>
                        <td className="p-0 align-middle">
                          {serviceName}
                        </td>
                        <td className="p-0 align-middle">
                          {estimatedDays > 0 ? `${estimatedDays} day${estimatedDays !== 1 ? 's' : ''}` : 'N/A'}
                        </td>
                      <td className="p-0 align-middle">${parseFloat(rate.amount || '0').toFixed(2)}</td>
                      <td className="p-1 align-middle">
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleSelectRate(rate.object_id)}
                          disabled={submitting}
                        >
                          {submitting ? 'Processing...' : `$${parseFloat(rate.total_with_shipping || '0').toFixed(2)}`}
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>No shipping options available.</p>
        )}
      </div>
    </div>
  );
};

export default SelectShipping;
