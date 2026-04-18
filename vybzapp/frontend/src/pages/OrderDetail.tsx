import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  payment_completed_at?: string | null;
  total: number;
  subtotal: number;
  product_sale_savings?: number;
  coupon_code?: string;
  coupon_discount?: number;
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

function mapOrderApiResponse(data: any): Order {
  const shippingAddress = data.shipping_address || {};
  const items = (data.items || []).map((item: any) => ({
    id: item.id,
    product_name: item.product?.title || 'Unknown Product',
    quantity: item.quantity,
    price: parseFloat(item.price) || 0,
    total: (parseFloat(item.price) || 0) * item.quantity,
    product_image: item.product?.images?.[0]?.image || undefined,
  }));

  const itemsSum = items.reduce((sum: number, item: OrderItem) => sum + item.total, 0);
  const shipping_cost = parseFloat(data.shipping_cost) || 0;

  const merchFromApi =
    data.merchandise_subtotal !== undefined && data.merchandise_subtotal !== null
      ? parseFloat(data.merchandise_subtotal)
      : NaN;
  const subtotal = Number.isFinite(merchFromApi) ? merchFromApi : itemsSum;

  const productSaleFromApi =
    data.product_sale_savings !== undefined && data.product_sale_savings !== null
      ? parseFloat(data.product_sale_savings)
      : NaN;
  const product_sale_savings = Number.isFinite(productSaleFromApi)
    ? productSaleFromApi
    : 0;

  const coupon_discount = parseFloat(data.coupon_discount) || 0;
  const coupon_code = (data.coupon_code || '').trim();
  const hasPromo =
    Boolean(coupon_code) || coupon_discount > 0;

  const taxFromApi =
    data.tax_amount !== undefined && data.tax_amount !== null ? parseFloat(data.tax_amount) : NaN;

  const grandFromApi =
    data.grand_total !== undefined && data.grand_total !== null ? parseFloat(data.grand_total) : NaN;

  let tax = Number.isFinite(taxFromApi) ? taxFromApi : NaN;
  let total = Number.isFinite(grandFromApi) ? grandFromApi : NaN;

  if (!Number.isFinite(total)) {
    tax = Number.isFinite(tax) ? tax : 0;
    total = Math.max(0, subtotal - coupon_discount + shipping_cost + tax);
  } else if (!Number.isFinite(tax)) {
    tax = total - (subtotal - coupon_discount + shipping_cost);
    if (!Number.isFinite(tax) || tax < 0) {
      tax = 0;
    }
  }

  let first_name = '';
  let last_name = '';
  if (shippingAddress.full_name) {
    const nameParts = shippingAddress.full_name.split(' ');
    first_name = nameParts[0] || '';
    last_name = nameParts.slice(1).join(' ') || '';
  } else {
    first_name = shippingAddress.first_name || '';
    last_name = shippingAddress.last_name || '';
  }

  return {
    id: data.id,
    order_number: data.order_number || data.ref_code || `ORD-${data.id}`,
    status: (data.status || 'pending').toLowerCase(),
    payment_completed_at: data.payment_completed_at || null,
    total,
    subtotal,
    product_sale_savings: product_sale_savings > 0 ? product_sale_savings : undefined,
    coupon_code: coupon_code || undefined,
    coupon_discount: hasPromo ? coupon_discount : undefined,
    shipping_cost,
    tax,
    created_at: data.ordered_date || data.order_date || data.start_date || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
    tracking_number: data.tracking_number || undefined,
    estimated_delivery: undefined,
    shipping_address: {
      first_name,
      last_name,
      address_line_1: shippingAddress.address_line_1 || shippingAddress.street_address || '',
      address_line_2: shippingAddress.address_line_2 || shippingAddress.apartment_address || undefined,
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postal_code: shippingAddress.postal_code || shippingAddress.zip || '',
      country: shippingAddress.country || shippingAddress.country_code || '',
      phone: shippingAddress.phone || undefined,
    },
    billing_address: {
      first_name,
      last_name,
      address_line_1: shippingAddress.address_line_1 || shippingAddress.street_address || '',
      address_line_2: shippingAddress.address_line_2 || shippingAddress.apartment_address || undefined,
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postal_code: shippingAddress.postal_code || shippingAddress.zip || '',
      country: shippingAddress.country || shippingAddress.country_code || '',
      phone: shippingAddress.phone || undefined,
    },
    items,
  };
}

/** Match `SmallButton` sizing for native invoice `<a>` / `<button>` controls */
const orderActionNativeStyle: React.CSSProperties = {
  padding: '0.3rem 0.5rem',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
  fontWeight: 900,
};

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Token ${token}`;
        }

        const response = await fetch(`/api/orders/${orderId}/`, {
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Order not found');
          }
          throw new Error(`Failed to load order: ${response.statusText}`);
        }

        const data = await response.json();
        setOrder(mapOrderApiResponse(data));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load order details.';
        setError(errorMessage);
        setMessage(errorMessage);
        setMessageType('danger');
        setShowMessage(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const refetchOrder = async () => {
    if (!orderId) return;
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Token ${token}`;
    const response = await fetch(`/api/orders/${orderId}/`, { headers, credentials: 'include' });
    if (!response.ok) throw new Error('Failed to refresh order.');
    const data = await response.json();
    setOrder(mapOrderApiResponse(data));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'ordered':
        return 'primary';
      case 'label_created':
        return 'info';
      case 'shipped':
        return 'primary';
      case 'processing':
        return 'warning';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'fas fa-hourglass-half';
      case 'ordered':
        return 'fas fa-credit-card';
      case 'label_created':
        return 'fas fa-tag';
      case 'shipped':
        return 'fas fa-shipping-fast';
      case 'processing':
        return 'fas fa-clock';
      case 'delivered':
        return 'fas fa-check-circle';
      case 'cancelled':
        return 'fas fa-times-circle';
      case 'failed':
        return 'fas fa-exclamation-triangle';
      default:
        return 'fas fa-question-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'ordered':
        return 'Payment received';
      case 'processing':
        return 'Processing';
      case 'label_created':
        return 'Label created';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      case 'failed':
        return 'Failed';
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
  };

  const canDownloadInvoice = (o: Order) => {
    if (!o.payment_completed_at) return false;
    const s = o.status.toLowerCase();
    if (s === 'pending' || s === 'failed') return false;
    // Only show once the order is in a "completed fulfillment" state
    return ['shipped', 'delivered'].includes(s);
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const handleCancelOrder = async () => {
    const s = (order?.status || '').toLowerCase();

    // Processing+ is manual request (no automatic backend change)
    if (s !== 'pending') {
      setMessage('Cancellation requested. If fulfillment has started, our team will review and confirm by email.');
      setMessageType('info');
      setShowMessage(true);
      return;
    }

    if (!orderId) return;

    setIsCancelling(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Token ${token}`;

      const response = await fetch(`/api/orders/${orderId}/cancel/`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to cancel order.');
      }

      await refetchOrder();
      setMessage('Order cancelled successfully.');
      setMessageType('success');
      setShowMessage(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order.';
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsCancelling(false);
    }
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
          <div className="d-flex align-items-center justify-content-between gap-2 w-100">
            <span className={`badge bg-${getStatusColor(order.status)}`}>
              <i className={`${getStatusIcon(order.status)} me-1`}></i>
              {getStatusLabel(order.status)}
            </span>
            <BackButton to="/product/my-orders/" />
          </div>
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
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <h6 className="subtext-btn-sm mb-1 text-truncate" title={item.product_name}>
                      {item.product_name}
                    </h6>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span className="text-muted subtext-btn-sm">Qty: {item.quantity}</span>
                      <span className="subtext-btn-sm text-nowrap">${item.price.toFixed(2)} each</span>
                    </div>
                  </div>
                  <div className="text-end ms-3 flex-shrink-0">
                    <div className="subtext-btn-sm fw-bold text-nowrap">${item.total.toFixed(2)}</div>
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
              {(order.product_sale_savings ?? 0) > 0 && (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="subtext-btn-sm text-muted">Regular price:</span>
                    <span className="subtext-btn-sm text-muted">
                      ${(order.subtotal + (order.product_sale_savings ?? 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="subtext-btn-sm">Discount:</span>
                    <span className="subtext-btn-sm text-success">
                      -${(order.product_sale_savings ?? 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div className="d-flex justify-content-between mb-2">
                <span className="subtext-btn-sm">
                  {(order.product_sale_savings ?? 0) > 0 ? 'Sale price:' : 'Sale Price:'}
                </span>
                <span className="subtext-btn-sm">${order.subtotal.toFixed(2)}</span>
              </div>
              {(order.coupon_code || (order.coupon_discount ?? 0) > 0) && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="subtext-btn-sm">
                    {order.coupon_code ? (
                      <>
                        Promo code: <span className="fw-bold">{order.coupon_code}</span>
                      </>
                    ) : (
                      'Discount'
                    )}
                  </span>
                  <span className="subtext-btn-sm text-success">
                    {(order.coupon_discount ?? 0) > 0
                      ? `-$${(order.coupon_discount ?? 0).toFixed(2)}`
                      : '—'}
                  </span>
                </div>
              )}
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

          {/* Actions: safe actions first; destructive / special last. Stack on mobile with spacing; row + right-aligned on md+. */}
          <div
            className="d-flex flex-column flex-md-row flex-md-wrap justify-content-md-end align-items-stretch align-items-md-center"
            style={{ gap: '0.65rem' }}
            role="group"
            aria-label="Order actions"
          >
            <SmallButton
              variant="primary"
              to="/product/"
              className="d-flex justify-content-center align-items-center"
            >
              <i className="fas fa-shopping-cart me-1"></i> &nbsp;Continue Shopping
            </SmallButton>
            {canDownloadInvoice(order) ? (
              <a
                href={`/api/orders/${order.id}/invoice/`}
                className="btn btn-outline-secondary btn-sm subtext-btn-sm d-flex justify-content-center align-items-center"
                style={orderActionNativeStyle}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-file-pdf me-1"></i> &nbsp;Download Invoice
              </a>
            ) : (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm subtext-btn-sm d-flex justify-content-center align-items-center"
                style={orderActionNativeStyle}
                disabled
                title={
                  !order.payment_completed_at
                    ? 'Invoice becomes available after payment is completed.'
                    : 'Invoice becomes available after your order ships.'
                }
              >
                <i className="fas fa-file-pdf me-1"></i> &nbsp;Invoice unavailable
              </button>
            )}
            {(order.status === 'pending' || order.status === 'processing') && (
              <SmallButton
                variant="outline-danger"
                onClick={handleCancelOrder}
                className="d-flex justify-content-center align-items-center"
                disabled={isCancelling}
              >
                <i className="fas fa-times me-1">&nbsp;</i>
                {order.status === 'pending' ? (isCancelling ? 'Cancelling…' : 'Cancel Order') : 'Request Cancellation'}
              </SmallButton>
            )}
            {order.status === 'delivered' && (
              <SmallButton
                variant="outline-warning"
                to={`/product/returns/create/${order.id}/`}
                className="d-flex justify-content-center align-items-center"
              >
                <i className="fas fa-undo me-1"></i>Request Return
              </SmallButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;










