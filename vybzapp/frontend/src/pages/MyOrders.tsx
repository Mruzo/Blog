import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';

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

  /** CSS modifier for `.store-page__status--*` (matches product-page pill styling). */
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

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const hero = (
    <section className="product-landing__hero">
      <div className="product-landing__container">
        <p className="product-landing__eyebrow">Store</p>
        <h1 className="product-landing__h1">My orders</h1>
        <p className="product-landing__lead">
          View status, line items, and shipping details for every purchase.
        </p>
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="product-landing">
        {hero}
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
        {hero}
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container">
            <div className="store-page__error" role="alert">
              <i className="fas fa-exclamation-triangle store-page__errorIcon" aria-hidden />
              <span>{error}</span>
            </div>
            <div className="store-page__ctaRow">
              <Link to="/product/" className="product-landing__ctaPrimary store-page__linkBtn">
                Back to shop
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="product-landing">
      {hero}

      <section className="product-landing__section store-page__section">
        <div className="product-landing__container">
          <MessagePopup
            message={message}
            type={messageType}
            show={showMessage}
            onClose={handleCloseMessage}
            duration={3000}
          />

          {orders.length === 0 ? (
            <div className="store-page__empty">
              <div className="store-page__emptyIcon" aria-hidden>
                <i className="fas fa-shopping-bag" />
              </div>
              <h2 className="product-landing__h2 store-page__emptyTitle">No orders yet</h2>
              <p className="product-landing__body store-page__emptyBody">
                When you check out, your orders will show up here with tracking-friendly status.
              </p>
              <Link to="/product/" className="product-landing__ctaPrimary store-page__linkBtn">
                Browse deskmats
              </Link>
            </div>
          ) : (
            <ul className="store-page__list">
              {orders.map((order) => (
                <li key={order.id} className="store-page__card">
                  <div className="store-page__cardHeader">
                    <div className="store-page__cardTitleBlock">
                      <h2 className="store-page__cardTitle">Order #{order.order_number}</h2>
                      <p className="store-page__cardMeta">
                        Placed {new Date(order.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span
                      className={`store-page__status store-page__status--${getStatusVariant(order.status)}`}
                    >
                      <i className={getStatusIcon(order.status)} aria-hidden />
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="store-page__cardBody">
                    <div className="store-page__bodyMain">
                      <h3 className="product-landing__h3 store-page__blockLabel">Items</h3>

                      {order.items.length > 0 && (
                        <div
                          className="store-page__thumbRow"
                          aria-label="Product thumbnails for this order"
                        >
                          {order.items.map((item) => (
                            <div
                              key={`thumb-${item.id}`}
                              className="store-page__thumbWrap"
                              title={`${item.product_name} × ${item.quantity}`}
                            >
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt=""
                                  className="store-page__thumbImg"
                                />
                              ) : (
                                <div className="store-page__thumbPlaceholder" aria-hidden>
                                  <i className="fas fa-image" />
                                </div>
                              )}
                              <span className="store-page__thumbQty">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <ul className="store-page__itemList">
                        {order.items.map((item) => (
                          <li key={item.id} className="store-page__itemRow">
                            <div className="store-page__itemMain">
                              <div className="store-page__itemName" title={item.product_name}>
                                {item.product_name}
                              </div>
                              <div className="store-page__itemQty">Qty {item.quantity}</div>
                            </div>
                            <div className="store-page__itemPrice">${item.total.toFixed(2)}</div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="store-page__bodyAside">
                      <h3 className="product-landing__h3 store-page__blockLabel">Ship to</h3>
                      <div className="store-page__address product-landing__body">
                        <div>
                          {order.shipping_address.first_name} {order.shipping_address.last_name}
                        </div>
                        <div>{order.shipping_address.address_line_1}</div>
                        <div>
                          {order.shipping_address.city}, {order.shipping_address.state}{' '}
                          {order.shipping_address.postal_code}
                        </div>
                        <div>{order.shipping_address.country}</div>
                      </div>
                    </div>
                  </div>

                  <div className="store-page__footer">
                    <div className="store-page__actions">
                      <Link
                        to={`/product/order/${order.id}/`}
                        className="product-landing__ctaPrimary store-page__linkBtn"
                      >
                        View details
                      </Link>
                      {order.status === 'processing' && (
                        <button
                          type="button"
                          className="product-landing__ctaGhost store-page__linkBtn"
                          onClick={() => {
                            setMessage('Order cancellation requested!');
                            setMessageType('info');
                            setShowMessage(true);
                          }}
                        >
                          Cancel order
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
                    <div className="store-page__totals">
                      {(order.coupon_code || (order.coupon_discount ?? 0) > 0) && (
                        <div className="store-page__couponLine">
                          {order.coupon_code && (
                            <span>
                              Code <strong>{order.coupon_code}</strong>{' '}
                            </span>
                          )}
                          {(order.coupon_discount ?? 0) > 0 && (
                            <span className="store-page__couponSave">
                              −${(order.coupon_discount ?? 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="store-page__totalLine">
                        Total <span className="store-page__totalAmt">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default MyOrders;
