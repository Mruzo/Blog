import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';

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
      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/shipping/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order and shipping rates');
      }

      const data = await response.json();
      setOrder(data.order);
      setRates(data.rates || []);
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
      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/select-shipping/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    <div className="container text-center p-0 mt-0">
      <div className="container mt-5 p-0">
        <h2 className="subtext-btn-sm text-center text-decoration-none">Select Shipping Option</h2>

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

            <div className="table-responsive mt-4">
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
                  {rates.map((rate) => (
                    <tr className="subtext-btn-sm" key={rate.object_id}>
                      <td className="p-0 align-middle">{rate.servicelevel.name}</td>
                      <td className="p-0 align-middle">{rate.estimated_days}</td>
                      <td className="p-0 align-middle">${rate.amount}</td>
                      <td className="p-1 align-middle">
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleSelectRate(rate.object_id)}
                          disabled={submitting}
                        >
                          {submitting ? 'Processing...' : `$${rate.total_with_shipping}`}
                        </button>
                      </td>
                    </tr>
                  ))}
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
