import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import PageHeader from '../components/PageHeader';
import SmallButton from '../components/SmallButton';
import BackButton from '../components/BackButton';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  product_image?: string;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  created_at: string;
  updated_at: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  billing_address: {
    first_name: string;
    last_name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  items: OrderItem[];
  tracking_number?: string;
  estimated_delivery?: string;
}

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      setLoading(true);
      try {
        // Replace with actual API call
        const response = await new Promise<Order>((resolve) => 
          setTimeout(() => resolve({
            id: parseInt(orderId),
            order_number: `ORD-2024-${orderId.padStart(3, '0')}`,
            status: 'shipped',
            total: 99.99,
            subtotal: 89.99,
            shipping_cost: 5.99,
            tax: 4.01,
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-16T14:20:00Z',
            tracking_number: '1Z999AA1234567890',
            estimated_delivery: '2024-01-20T00:00:00Z',
            shipping_address: {
              first_name: 'Chris',
              last_name: 'Creator',
              address_line_1: '123 Main St',
              address_line_2: 'Apt 4B',
              city: 'New York',
              state: 'NY',
              postal_code: '10001',
              country: 'USA',
              phone: '+1 (555) 123-4567'
            },
            billing_address: {
              first_name: 'Chris',
              last_name: 'Creator',
              address_line_1: '123 Main St',
              address_line_2: 'Apt 4B',
              city: 'New York',
              state: 'NY',
              postal_code: '10001',
              country: 'USA',
              phone: '+1 (555) 123-4567'
            },
            items: [
              {
                id: 1,
                product_name: '3D Comic Model Pack',
                quantity: 1,
                price: 49.99,
                total: 49.99,
                product_image: '/api/placeholder/100/100'
              },
              {
                id: 2,
                product_name: 'Premium Sound Effects',
                quantity: 2,
                price: 25.00,
                total: 50.00,
                product_image: '/api/placeholder/100/100'
              }
            ]
          }), 1000)
        );
        setOrder(response);
      } catch (err) {
        setError('Failed to load order details.');
        setMessage('Failed to load order details.');
        setMessageType('danger');
        setShowMessage(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

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

  const handleCancelOrder = () => {
    setMessage('Order cancellation requested! We will process this within 24 hours.');
    setMessageType('info');
    setShowMessage(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !order) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error || 'Order not found'}
        </div>
        <BackButton to="/product/my-orders/" />
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <PageHeader
        title={`Order #${order.order_number}`}
        description={`Placed on ${new Date(order.created_at).toLocaleDateString()}`}
        actions={
          <>
            <span className={`badge bg-${getStatusColor(order.status)} me-2`}>
              <i className={`${getStatusIcon(order.status)} me-1`}></i>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <BackButton to="/product/my-orders/" />
          </>
        }
      />

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={5000}
      />

      <div className="row">
        {/* Order Items */}
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Order Items</h6>
            </div>
            <div className="card-body p-0">
              {order.items.map((item) => (
                <div key={item.id} className="d-flex align-items-center p-3 border-bottom">
                  <div className="me-3">
                    {item.product_image ? (
                      <img 
                        src={item.product_image} 
                        alt={item.product_name}
                        className="rounded"
                        style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div 
                        className="bg-light rounded d-flex align-items-center justify-content-center"
                        style={{ width: '60px', height: '60px' }}
                      >
                        <i className="fas fa-image text-muted"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="subtext-btn-sm mb-1">{item.product_name}</h6>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted subtext-btn-sm">Qty: {item.quantity}</span>
                      <span className="subtext-btn-sm">${item.price.toFixed(2)} each</span>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="subtext-btn-sm fw-bold">${item.total.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary & Addresses */}
        <div className="col-lg-4">
          {/* Order Summary */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Order Summary</h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span className="subtext-btn-sm">Subtotal:</span>
                <span className="subtext-btn-sm">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="subtext-btn-sm">Shipping:</span>
                <span className="subtext-btn-sm">${order.shipping_cost.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="subtext-btn-sm">Tax:</span>
                <span className="subtext-btn-sm">${order.tax.toFixed(2)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span className="subtext-btn-sm fw-bold">Total:</span>
                <span className="subtext-btn-sm fw-bold">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Shipping Address</h6>
            </div>
            <div className="card-body">
              <div className="subtext-btn-sm">
                <div>{order.shipping_address.first_name} {order.shipping_address.last_name}</div>
                <div>{order.shipping_address.address_line_1}</div>
                {order.shipping_address.address_line_2 && (
                  <div>{order.shipping_address.address_line_2}</div>
                )}
                <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</div>
                <div>{order.shipping_address.country}</div>
                {order.shipping_address.phone && (
                  <div className="mt-2">
                    <i className="fas fa-phone me-1"></i>
                    {order.shipping_address.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tracking Information */}
          {order.tracking_number && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h6 className="subtext-btn-sm mb-0">Tracking Information</h6>
              </div>
              <div className="card-body">
                <div className="subtext-btn-sm">
                  <div className="mb-2">
                    <strong>Tracking Number:</strong><br />
                    <code>{order.tracking_number}</code>
                  </div>
                  {order.estimated_delivery && (
                    <div>
                      <strong>Estimated Delivery:</strong><br />
                      {new Date(order.estimated_delivery).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="d-grid gap-2">
            {order.status === 'processing' && (
              <SmallButton 
                variant="outline-danger"
                onClick={handleCancelOrder}
              >
                <i className="fas fa-times me-1"></i>Cancel Order
              </SmallButton>
            )}
            <SmallButton 
              variant="outline-primary"
              to="/product/"
            >
              <i className="fas fa-shopping-cart me-1"></i>Continue Shopping
            </SmallButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;





