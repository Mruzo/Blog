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
  merchandise_subtotal: number;
  product_sale_savings?: number;
  shipping_cost: number;
  tax: number;
  coupon_code?: string;
  coupon_discount?: number;
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
    product_image?: string;
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
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Token ${token}`;
        }

        const response = await fetch('/api/orders/', {
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load orders.');
        }

        const data = await response.json();
        const ordersData = (data?.results || data) as any[];

        const mappedOrders: Order[] = (ordersData || []).map((o: any) => {
          const shippingAddress = o.shipping_address || {};
          const items = (o.items || []).map((item: any) => {
            const price = parseFloat(item.price) || 0;
            const quantity = Number(item.quantity) || 0;
            const product_image = item.product?.images?.[0]?.image as string | undefined;
            return {
              id: item.id,
              product_name: item.product?.title || 'Unknown Product',
              quantity,
              price,
              total: price * quantity,
              product_image,
            };
          });
          const itemsSum = items.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
          const shippingCost = parseFloat(o.shipping_cost) || 0;

          const merchFromApi =
            o.merchandise_subtotal !== undefined && o.merchandise_subtotal !== null
              ? parseFloat(o.merchandise_subtotal)
              : NaN;
          const subtotal = Number.isFinite(merchFromApi) ? merchFromApi : itemsSum;

          const productSaleFromApi =
            o.product_sale_savings !== undefined && o.product_sale_savings !== null
              ? parseFloat(o.product_sale_savings)
              : NaN;
          const product_sale_savings = Number.isFinite(productSaleFromApi)
            ? productSaleFromApi
            : 0;

          const coupon_discount = parseFloat(o.coupon_discount) || 0;
          const coupon_code = (o.coupon_code || '').trim();
          const hasPromo = Boolean(coupon_code) || coupon_discount > 0;

          const taxFromApi =
            o.tax_amount !== undefined && o.tax_amount !== null ? parseFloat(o.tax_amount) : NaN;
          const grandFromApi =
            o.grand_total !== undefined && o.grand_total !== null ? parseFloat(o.grand_total) : NaN;

          let tax = Number.isFinite(taxFromApi) ? taxFromApi : NaN;
          let total = Number.isFinite(grandFromApi) ? grandFromApi : NaN;

          if (!Number.isFinite(total)) {
            tax = Number.isFinite(tax) ? tax : 0;
            total = Math.max(0, subtotal - coupon_discount + shippingCost + tax);
          } else if (!Number.isFinite(tax)) {
            tax = total - (subtotal - coupon_discount + shippingCost);
            if (!Number.isFinite(tax) || tax < 0) {
              tax = 0;
            }
          }

          const fullName = shippingAddress.full_name || '';
          const nameParts = typeof fullName === 'string' ? fullName.split(' ') : [];
          const firstName = shippingAddress.first_name || nameParts[0] || '';
          const lastName = shippingAddress.last_name || nameParts.slice(1).join(' ') || '';

          return {
            id: o.id,
            order_number: o.order_number || o.ref_code || `ORD-${o.id}`,
            status: (o.status || 'pending').toLowerCase(),
            total,
            merchandise_subtotal: subtotal,
            product_sale_savings: product_sale_savings > 0 ? product_sale_savings : undefined,
            shipping_cost: shippingCost,
            tax,
            coupon_code: coupon_code || undefined,
            coupon_discount: hasPromo ? coupon_discount : undefined,
            created_at: o.ordered_date || o.order_date || o.created_at || new Date().toISOString(),
            shipping_address: {
              first_name: firstName,
              last_name: lastName,
              address_line_1: shippingAddress.address_line_1 || shippingAddress.street_address || '',
              city: shippingAddress.city || '',
              state: shippingAddress.state || '',
              postal_code: shippingAddress.postal_code || shippingAddress.zip || '',
              country: shippingAddress.country || shippingAddress.country_code || '',
            },
            items,
          };
        });

        setOrders(mappedOrders);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load orders.';
        setError(errorMessage);
        setMessage(errorMessage);
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
                  <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <div className="min-w-0">
                      <h6 className="subtext-btn-sm mb-1">Order #{order.order_number}</h6>
                      <small className="text-muted">
                        Placed on {new Date(order.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <span className={`badge bg-${getStatusColor(order.status)} flex-shrink-0`}>
                      <i className={`${getStatusIcon(order.status)} me-1`}>&nbsp;</i>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-8">
                      <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-2">
                        <h6 className="subtext-btn-sm mb-0">Items ordered</h6>
                        {/* <small className="text-muted">
                          {order.items.length} {order.items.length === 1 ? 'line' : 'lines'}
                          {' · '}
                          {order.items.reduce((sum, li) => sum + li.quantity, 0)} pcs
                        </small> */}
                      </div>

                      {order.items.length > 0 && (
                        <div
                          className="d-flex flex-nowrap gap-2 pb-2 mb-3 border-bottom"
                          style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
                          aria-label="Product thumbnails for this order"
                        >
                          {order.items.map((item) => (
                            <div
                              key={`thumb-${item.id}`}
                              className="position-relative flex-shrink-0"
                              title={`${item.product_name} × ${item.quantity}`}
                            >
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt=""
                                  className="rounded border bg-white"
                                  style={{
                                    width: '56px',
                                    height: '56px',
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                />
                              ) : (
                                <div
                                  className="rounded border bg-light d-flex align-items-center justify-content-center text-muted"
                                  style={{ width: '56px', height: '56px' }}
                                  aria-hidden
                                >
                                  <i className="fas fa-image small" />
                                </div>
                              )}
                              <span
                                className="position-absolute badge rounded-pill bg-light text-dark border-light"
                                style={{
                                  fontSize: '0.65rem',
                                  bottom: '-0.15rem',
                                  right: '-0.15rem',
                                  padding: '0.2em 0.45em',
                                }}
                              >
                                ×{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <ul className="list-unstyled mb-0">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="d-flex justify-content-between align-items-start gap-2 py-2 border-bottom border-light"
                          >
                            <div className="min-w-0 flex-grow-1">
                              <div className="subtext-btn-sm text-truncate" title={item.product_name}>
                                {item.product_name}
                              </div>
                              <small className="text-muted">Qty {item.quantity}</small>
                            </div>
                            <span className="subtext-btn-sm text-nowrap flex-shrink-0">
                              ${item.total.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
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
                      {order.status === 'delivered' && (
                        <SmallButton 
                          variant="outline-warning"
                          to={`/product/returns/create/${order.id}/`}
                        >
                          <i className="fas fa-undo me-1"></i>Request Return
                        </SmallButton>
                      )}
                    </div>
                    <div className="text-muted subtext-btn-sm text-end">
                      {(order.coupon_code || (order.coupon_discount ?? 0) > 0) && (
                        <div className="mb-1">
                          {order.coupon_code && (
                            <span>
                              Code <span className="fw-bold text-dark">{order.coupon_code}</span>
                              {' '}
                            </span>
                          )}
                          {(order.coupon_discount ?? 0) > 0 && (
                            <span className="text-success">
                              -${(order.coupon_discount ?? 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                      <div>
                        Total: <span className="fw-bold text-dark">${order.total.toFixed(2)}</span>
                      </div>
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










