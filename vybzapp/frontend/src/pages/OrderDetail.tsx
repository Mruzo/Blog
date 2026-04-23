import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';

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

  const getStatusVariant = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'ordered':
        return 'ordered';
      case 'label_created':
        return 'label_created';
      case 'shipped':
        return 'shipped';
      case 'processing':
        return 'processing';
      case 'delivered':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      case 'failed':
        return 'failed';
      default:
        return 'default';
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

  const hero = (opts?: { title?: string; lead?: string }) => (
    <section className="product-landing__hero">
      <div className="product-landing__container store-page__heroRow">
        <div className="store-page__heroMain">
          <p className="product-landing__eyebrow">Store</p>
          <h1 className="product-landing__h1">
            {opts?.title ?? (order ? `Order #${order.order_number}` : 'Order')}
          </h1>
          <p className="product-landing__lead">
            {opts?.lead ??
              (order
                ? `Placed ${new Date(order.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}`
                : 'Review your purchase and fulfillment status.')}
          </p>
        </div>
        {order && (
          <div className="store-page__heroActions">
            <span
              className={`store-page__status store-page__status--${getStatusVariant(order.status)}`}
            >
              <i className={getStatusIcon(order.status)} aria-hidden />
              {getStatusLabel(order.status)}
            </span>
            <Link to="/product/my-orders/" className="product-landing__ctaGhost store-page__linkBtn">
              All orders
            </Link>
          </div>
        )}
        {!order && (
          <Link to="/product/my-orders/" className="product-landing__ctaGhost store-page__linkBtn">
            All orders
          </Link>
        )}
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="product-landing">
        {hero({ title: 'Order', lead: 'Loading your order…' })}
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner />
          </div>
        </section>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="product-landing">
        {hero({
          title: 'Order',
          lead: 'We could not load this order.',
        })}
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container">
            <div className="store-page__error" role="alert">
              <i className="fas fa-exclamation-triangle store-page__errorIcon" aria-hidden />
              <span>{error || 'Order not found'}</span>
            </div>
            <div className="store-page__ctaRow">
              <Link to="/product/my-orders/" className="product-landing__ctaGhost store-page__linkBtn">
                Back to orders
              </Link>
              <Link to="/product/" className="product-landing__ctaPrimary store-page__linkBtn">
                Continue shopping
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="product-landing">
      {hero()}

      <section className="product-landing__section store-page__section">
        <div className="product-landing__container">
          <MessagePopup
            message={message}
            type={messageType}
            show={showMessage}
            onClose={handleCloseMessage}
            duration={5000}
          />

          <div className="store-page__detailLayout">
            <div className="store-page__detailMain">
              <div className="store-page__panel">
                <div className="store-page__panelHead">
                  <h2 className="store-page__panelTitle">Order items</h2>
                </div>
                <div className="store-page__panelBody">
                  {order.items.map((item) => (
                    <div key={item.id} className="store-page__orderItemRow">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt=""
                          className="store-page__orderThumb"
                        />
                      ) : (
                        <div className="store-page__orderThumbPh" aria-hidden>
                          <i className="fas fa-image" />
                        </div>
                      )}
                      <div className="store-page__orderItemMain">
                        <h3 className="store-page__orderItemTitle" title={item.product_name}>
                          {item.product_name}
                        </h3>
                        <div className="store-page__orderItemMeta">
                          Qty {item.quantity} · ${item.price.toFixed(2)} each
                        </div>
                      </div>
                      <div className="store-page__orderItemTotal">${item.total.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="store-page__detailAside">
              <div className="store-page__panel">
                <div className="store-page__panelHead">
                  <h2 className="store-page__panelTitle">Order summary</h2>
                </div>
                <div className="store-page__panelBody store-page__panelBody--padded">
                  {(order.product_sale_savings ?? 0) > 0 && (
                    <>
                      <div className="store-page__summaryRow">
                        <span>Regular price</span>
                        <span>${(order.subtotal + (order.product_sale_savings ?? 0)).toFixed(2)}</span>
                      </div>
                      <div className="store-page__summaryRow">
                        <span>Discount</span>
                        <span className="store-page__success">−${(order.product_sale_savings ?? 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="store-page__summaryRow">
                    <span>{(order.product_sale_savings ?? 0) > 0 ? 'Sale price' : 'Subtotal'}</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  {(order.coupon_code || (order.coupon_discount ?? 0) > 0) && (
                    <div className="store-page__summaryRow">
                      <span>
                        {order.coupon_code ? (
                          <>
                            Promo <strong>{order.coupon_code}</strong>
                          </>
                        ) : (
                          'Promo'
                        )}
                      </span>
                      <span className="store-page__success">
                        {(order.coupon_discount ?? 0) > 0
                          ? `−$${(order.coupon_discount ?? 0).toFixed(2)}`
                          : '—'}
                      </span>
                    </div>
                  )}
                  <div className="store-page__summaryRow">
                    <span>Shipping</span>
                    <span>${order.shipping_cost.toFixed(2)}</span>
                  </div>
                  <div className="store-page__summaryRow">
                    <span>Tax</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  <hr className="store-page__divider" />
                  <div className="store-page__summaryRow store-page__summaryRow--strong">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="store-page__panel" style={{ marginTop: '1rem' }}>
                <div className="store-page__panelHead">
                  <h2 className="store-page__panelTitle">Shipping address</h2>
                </div>
                <div className="store-page__panelBody store-page__panelBody--padded product-landing__body">
                  <div>
                    {order.shipping_address.first_name} {order.shipping_address.last_name}
                  </div>
                  <div>{order.shipping_address.address_line_1}</div>
                  {order.shipping_address.address_line_2 && <div>{order.shipping_address.address_line_2}</div>}
                  <div>
                    {order.shipping_address.city}, {order.shipping_address.state}{' '}
                    {order.shipping_address.postal_code}
                  </div>
                  <div>{order.shipping_address.country}</div>
                  {order.shipping_address.phone && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <i className="fas fa-phone me-1" aria-hidden />
                      {order.shipping_address.phone}
                    </div>
                  )}
                </div>
              </div>

              {order.tracking_number && (
                <div className="store-page__panel" style={{ marginTop: '1rem' }}>
                  <div className="store-page__panelHead">
                    <h2 className="store-page__panelTitle">Tracking</h2>
                  </div>
                  <div className="store-page__panelBody store-page__panelBody--padded product-landing__body">
                    <div>
                      <strong>Tracking number</strong>
                    </div>
                    <code style={{ fontSize: '0.88rem' }}>{order.tracking_number}</code>
                    {order.estimated_delivery && (
                      <div style={{ marginTop: '0.65rem' }}>
                        <strong>Estimated delivery</strong>
                        <div>{new Date(order.estimated_delivery).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="store-page__actionsCol" style={{ marginTop: '1rem' }} role="group" aria-label="Order actions">
                <Link to="/product/" className="product-landing__ctaPrimary store-page__linkBtn">
                  Continue shopping
                </Link>
                {canDownloadInvoice(order) ? (
                  <a
                    href={`/api/orders/${order.id}/invoice/`}
                    className="product-landing__ctaGhost store-page__linkBtn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download invoice
                  </a>
                ) : (
                  <button
                    type="button"
                    className="product-landing__ctaGhost store-page__linkBtn store-page__linkBtn--muted"
                    disabled
                    title={
                      !order.payment_completed_at
                        ? 'Invoice becomes available after payment is completed.'
                        : 'Invoice becomes available after your order ships.'
                    }
                  >
                    Invoice unavailable
                  </button>
                )}
                {(order.status === 'pending' || order.status === 'processing') && (
                  <button
                    type="button"
                    className="product-landing__ctaGhost store-page__linkBtn store-page__linkBtn--danger"
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                  >
                    {order.status === 'pending'
                      ? isCancelling
                        ? 'Cancelling…'
                        : 'Cancel order'
                      : 'Request cancellation'}
                  </button>
                )}
                {order.status === 'delivered' && (
                  <Link
                    to={`/product/returns/create/${order.id}/`}
                    className="product-landing__ctaGhost store-page__linkBtn"
                  >
                    Request return
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrderDetail;










