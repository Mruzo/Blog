import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import PageHeader from '../components/PageHeader';
import SmallButton from '../components/SmallButton';

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    address_line_1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Replace with actual API call
        const response = await new Promise<Order[]>((resolve) => 
          setTimeout(() => resolve([
            {
              id: 1,
              order_number: 'ORD-2024-001',
              status: 'shipped',
              total: 99.99,
              created_at: '2024-01-15T10:30:00Z',
              shipping_address: {
                first_name: 'Chris',
                last_name: 'Creator',
                address_line_1: '123 Main St',
                city: 'New York',
                state: 'NY',
                postal_code: '10001',
                country: 'USA'
              },
              items: [
                {
                  id: 1,
                  product_name: '3D Comic Model Pack',
                  quantity: 1,
                  price: 49.99,
                  total: 49.99
                },
                {
                  id: 2,
                  product_name: 'Premium Sound Effects',
                  quantity: 2,
                  price: 25.00,
                  total: 50.00
                }
              ]
            },
            {
              id: 2,
              order_number: 'ORD-2024-002',
              status: 'processing',
              total: 149.99,
              created_at: '2024-01-20T14:15:00Z',
              shipping_address: {
                first_name: 'Chris',
                last_name: 'Creator',
                address_line_1: '123 Main St',
                city: 'New York',
                state: 'NY',
                postal_code: '10001',
                country: 'USA'
              },
              items: [
                {
                  id: 3,
                  product_name: 'Character Animation Kit',
                  quantity: 1,
                  price: 149.99,
                  total: 149.99
                }
              ]
            }
          ]), 1000)
        );
        setOrders(response);
      } catch (err) {
        setError('Failed to load orders.');
        setMessage('Failed to load orders.');
        setMessageType('danger');
        setShowMessage(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'shipped':
        return 'success';
      case 'processing':
        return 'warning';
      case 'delivered':
        return 'info';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'shipped':
        return 'fas fa-shipping-fast';
      case 'processing':
        return 'fas fa-clock';
      case 'delivered':
        return 'fas fa-check-circle';
      case 'cancelled':
        return 'fas fa-times-circle';
      default:
        return 'fas fa-question-circle';
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
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <PageHeader
        title="My Orders"
        description="View and manage your order history"
      />

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={3000}
      />

      {orders.length === 0 ? (
        <div className="text-center py-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5">
              <i className="fas fa-shopping-bag fa-4x text-muted mb-3"></i>
              <h5 className="subtext-btn-sm text-muted mb-3">No orders yet</h5>
              <p className="subtext-btn-sm text-muted mb-4">
                Start shopping to see your orders here.
              </p>
              <Link to="/product/" className="btn btn-primary subtext-btn-sm">
                <i className="fas fa-shopping-cart me-1"></i>Start Shopping
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          {orders.map((order) => (
            <div key={order.id} className="col-12 mb-4">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="subtext-btn-sm mb-1">Order #{order.order_number}</h6>
                      <small className="text-muted">
                        Placed on {new Date(order.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span className={`badge bg-${getStatusColor(order.status)}`}>
                        <i className={`${getStatusIcon(order.status)} me-1`}></i>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <span className="subtext-btn-sm fw-bold">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-8">
                      <h6 className="subtext-btn-sm mb-3">Items Ordered</h6>
                      {order.items.map((item) => (
                        <div key={item.id} className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <span className="subtext-btn-sm">{item.product_name}</span>
                            <small className="text-muted d-block">Qty: {item.quantity}</small>
                          </div>
                          <span className="subtext-btn-sm">${item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="col-md-4">
                      <h6 className="subtext-btn-sm mb-3">Shipping Address</h6>
                      <div className="subtext-btn-sm">
                        <div>{order.shipping_address.first_name} {order.shipping_address.last_name}</div>
                        <div>{order.shipping_address.address_line_1}</div>
                        <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</div>
                        <div>{order.shipping_address.country}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card-footer bg-transparent border-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex gap-2">
                      <SmallButton 
                        variant="outline-primary"
                        to={`/product/order/${order.id}/`}
                      >
                        <i className="fas fa-eye me-1"></i>View Details
                      </SmallButton>
                      {order.status === 'processing' && (
                        <SmallButton 
                          variant="outline-danger"
                          onClick={() => {
                            setMessage('Order cancellation requested!');
                            setMessageType('info');
                            setShowMessage(true);
                          }}
                        >
                          <i className="fas fa-times me-1"></i>Cancel Order
                        </SmallButton>
                      )}
                    </div>
                    <div className="text-muted subtext-btn-sm">
                      Total: <span className="fw-bold">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;





