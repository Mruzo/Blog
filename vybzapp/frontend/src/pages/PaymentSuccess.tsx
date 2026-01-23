import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';

interface Order {
  id: number;
  order_date: string;
  status: string;
  shipping_cost: number;
  tracking_number?: string;
  label_url?: string;
  shipping_provider?: string;
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

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrder(data.order);
      setShippingSuccess(data.shipping_success || false);
      
      if (data.shipping_success) {
        setMessage('Order placed successfully! Shipping label has been created.');
        setMessageType('success');
      } else {
        setMessage('Order placed successfully, but there was an issue creating the shipping label. Our team will handle this manually.');
        setMessageType('warning');
      }
      setShowMessage(true);
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      setMessage(error.message || 'Failed to load order details');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!order) {
    return (
      <div className="container text-center p-5">
        <div className="alert alert-danger" role="alert">
          Order not found
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/product/')}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="container text-center p-5">
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={8000}
      />

      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h2 className="subtext-btn-sm text-decoration-none mb-0">Order Confirmation</h2>
            </div>
            <div className="card-body">
              <div className="alert alert-success" role="alert">
                <h4 className="alert-heading">Payment Successful!</h4>
                <p>Thank you for your order. Your payment has been processed successfully.</p>
                <hr />
                <p className="mb-0">
                  <strong>Order ID:</strong> #{order.id}
                </p>
              </div>

              {/* Order Details */}
              <div className="row mt-4">
                <div className="col-md-6">
                  <h5 className="subtext-btn-sm">Order Items</h5>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.orderitem_set.map((item, index) => (
                        <tr key={index}>
                          <td>{item.product.title}</td>
                          <td>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h5 className="subtext-btn-sm">Shipping Address</h5>
                  <address>
                    <strong>{order.shipping_address.full_name}</strong><br />
                    {order.shipping_address.address_line_1}<br />
                    {order.shipping_address.address_line_2 && (
                      <>
                        {order.shipping_address.address_line_2}<br />
                      </>
                    )}
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}<br />
                    {order.shipping_address.country_code}
                  </address>
                </div>
              </div>

              {/* Shipping Information */}
              {shippingSuccess && order.tracking_number && (
                <div className="alert alert-info mt-3">
                  <h6>Shipping Information</h6>
                  <p><strong>Tracking Number:</strong> {order.tracking_number}</p>
                  {order.shipping_provider && (
                    <p><strong>Carrier:</strong> {order.shipping_provider}</p>
                  )}
                  {order.label_url && (
                    <p>
                      <a href={order.label_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                        View Shipping Label
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4">
                <button 
                  className="btn btn-primary me-2" 
                  onClick={() => navigate('/product/')}
                >
                  Continue Shopping
                </button>
                <button 
                  className="btn btn-outline-primary" 
                  onClick={() => navigate('/product/my-orders/')}
                >
                  View My Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;









