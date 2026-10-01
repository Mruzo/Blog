import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import NumberStepper from '../components/NumberStepper';
import OrderPricingBreakdown from '../components/OrderPricingBreakdown';
import { OrderPricingSummary } from '../utils/orderPricing';
import { parseJsonApiError } from '../utils/parseJsonApiError';

interface CatalogProduct {
  uuid: string;
  title: string;
  price: number;
  discounted_price?: number;
  stock: number;
  images?: Array<{ image?: string }>;
}

interface SaleLine {
  uuid: string;
  title: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

interface CompletedSale {
  id: number;
  status: string;
  payment_method?: string;
  contact_email?: string;
  grand_total?: number;
  merchandise_subtotal?: number;
  tax_amount?: number;
  coupon_discount?: number;
  product_sale_savings?: number;
  orderitem_set?: Array<{ product: { title: string }; quantity: number }>;
  shipping_address?: { full_name?: string };
}

function authHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('authToken');
  if (token) {
    headers.Authorization = `Token ${token}`;
  }
  const csrf =
    document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('csrftoken='))?.slice(10) ||
    document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  if (csrf) {
    headers['X-CSRFToken'] = csrf;
  }
  return headers;
}

function unitPriceOf(product: CatalogProduct): number {
  const discounted = product.discounted_price;
  if (discounted != null && Number.isFinite(Number(discounted))) {
    return Number(discounted);
  }
  return Number(product.price) || 0;
}

const StaffInPersonSale: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState<CompletedSale | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/products/', { credentials: 'include' });
        if (!response.ok) {
          throw new Error(await parseJsonApiError(response.clone(), 'Could not load products'));
        }
        const data = await response.json();
        const results = (data.results || data) as CatalogProduct[];
        setProducts(Array.isArray(results) ? results : []);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Could not load products');
        setMessageType('danger');
        setShowMessage(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const finishCard = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/staff/in-person-sale/complete/?session_id=${encodeURIComponent(sessionId)}`,
          { headers: authHeaders(), credentials: 'include' }
        );
        if (!response.ok) {
          throw new Error(await parseJsonApiError(response.clone(), 'Could not complete card sale'));
        }
        const data = await response.json();
        setCompleted(data.order);
        setInvoiceUrl(data.invoice_url || `/api/staff/in-person-sale/${data.order.id}/invoice/`);
        setMessage(
          data.invoice_emailed
            ? 'Card payment received. Invoice emailed to the customer.'
            : 'Card payment received. Invoice is ready.'
        );
        setMessageType('success');
        setShowMessage(true);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Could not complete card sale');
        setMessageType('danger');
        setShowMessage(true);
      } finally {
        setIsLoading(false);
      }
    };
    finishCard();
  }, [sessionId]);

  const merchandiseSubtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines]
  );

  const pricing: OrderPricingSummary = {
    listSubtotal: merchandiseSubtotal,
    productSaleSavings: 0,
    merchandiseSubtotal,
    shippingCost: 0,
    totalLabel: 'Total due',
    totalAmount: merchandiseSubtotal,
  };

  const addProduct = (product: CatalogProduct) => {
    if ((product.stock || 0) < 1) return;
    setLines((prev) => {
      const existing = prev.find((line) => line.uuid === product.uuid);
      if (existing) {
        return prev.map((line) =>
          line.uuid === product.uuid
            ? { ...line, quantity: Math.min(line.stock, line.quantity + 1) }
            : line
        );
      }
      return [
        ...prev,
        {
          uuid: product.uuid,
          title: product.title,
          unitPrice: unitPriceOf(product),
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
  };

  const resetSale = () => {
    setLines([]);
    setCustomerName('');
    setCustomerEmail('');
    setPaymentMethod('cash');
    setCompleted(null);
    setInvoiceUrl(null);
  };

  const downloadInvoice = async () => {
    if (!invoiceUrl) return;
    try {
      const response = await fetch(invoiceUrl, {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await parseJsonApiError(response.clone(), 'Could not download invoice'));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${completed?.id || 'sale'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not download invoice');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) {
      setMessage('Add at least one product.');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }
    if (!customerName.trim()) {
      setMessage('Customer name is required.');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }
    if (!customerEmail.trim()) {
      setMessage('Customer email is required so we can send the invoice.');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/staff/in-person-sale/', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          payment_method: paymentMethod,
          items: lines.map((line) => ({ uuid: line.uuid, quantity: line.quantity })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Could not complete sale');
      }
      if (data.checkout_url) {
        window.location.assign(data.checkout_url);
        return;
      }
      setCompleted(data.order);
      setInvoiceUrl(data.invoice_url || `/api/staff/in-person-sale/${data.order.id}/invoice/`);
      setMessage(
        data.invoice_emailed
          ? 'Cash sale complete. Invoice emailed to the customer.'
          : 'Cash sale complete. Invoice is ready.'
      );
      setMessageType('success');
      setShowMessage(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not complete sale');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="product-landing">
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner />
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
            <p className="product-landing__eyebrow">Staff</p>
            <h1 className="product-landing__h1">In-person sale</h1>
            <p className="product-landing__lead">
              Ring up a complete sale, take cash or card, then hand the order over. The customer gets an invoice.
            </p>
          </div>
          <div className="store-page__heroActions">
            <Link to="/product/" className="product-landing__ctaGhost store-page__linkBtn">
              Back to Store
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
            onClose={() => setShowMessage(false)}
            duration={6000}
          />

          {completed ? (
            <div className="store-page__panel">
              <div className="store-page__panelHead">
                <h2 className="store-page__panelTitle">Sale complete — order #{completed.id}</h2>
              </div>
              <div className="store-page__panelBody store-page__panelBody--padded">
                <p className="product-landing__body">
                  Paid by {completed.payment_method === 'cash' ? 'cash' : 'card'}. Hand this order to{' '}
                  <strong>{completed.shipping_address?.full_name || customerName || 'the customer'}</strong>.
                  {(completed.contact_email || customerEmail) ? (
                    <>
                      {' '}
                      Invoice emailed to{' '}
                      <strong>{completed.contact_email || customerEmail}</strong>.
                    </>
                  ) : null}
                </p>
                <ul className="store-page__itemList">
                  {(completed.orderitem_set || []).map((item, idx) => (
                    <li key={`${item.product.title}-${idx}`} className="store-page__itemRow">
                      <span className="store-page__itemName">{item.product.title}</span>
                      <span className="store-page__itemQty">×{item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <p className="store-page__summaryRow store-page__summaryRow--strong">
                  <span>Total</span>
                  <span>${Number(completed.grand_total || 0).toFixed(2)}</span>
                </p>
                <div className="store-page__ctaRow" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="product-landing__ctaPrimary store-page__linkBtn"
                    onClick={downloadInvoice}
                  >
                    Download invoice
                  </button>
                  <button
                    type="button"
                    className="product-landing__ctaGhost store-page__linkBtn"
                    onClick={resetSale}
                  >
                    New sale
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form className="staff-sale__layout" onSubmit={handleSubmit}>
              <div className="store-page__panel">
                <div className="store-page__panelHead">
                  <h2 className="store-page__panelTitle">Products</h2>
                </div>
                <div className="store-page__panelBody store-page__panelBody--padded">
                  <ul className="store-page__itemList">
                    {products.map((product) => (
                      <li key={product.uuid} className="store-page__itemRow">
                        <div className="store-page__itemMain">
                          <div className="store-page__itemName">{product.title}</div>
                          <div className="store-page__itemQty">
                            ${unitPriceOf(product).toFixed(2)} · {product.stock} in stock
                          </div>
                        </div>
                        <button
                          type="button"
                          className="product-landing__ctaGhost store-page__linkBtn"
                          onClick={() => addProduct(product)}
                          disabled={(product.stock || 0) < 1}
                        >
                          Add
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="store-page__formCard">
                <h2 className="store-page__panelTitle">This sale</h2>

                <div className="staff-sale__section">
                  {lines.length === 0 ? (
                    <p className="staff-sale__empty">Add a product to start this sale.</p>
                  ) : (
                    <ul className="store-page__itemList">
                      {lines.map((line) => (
                        <li key={line.uuid} className="store-page__itemRow">
                          <div className="store-page__itemMain">
                            <div className="store-page__itemName">{line.title}</div>
                            <div className="store-page__itemQty">${line.unitPrice.toFixed(2)} each</div>
                          </div>
                          <NumberStepper
                            id={`qty-${line.uuid}`}
                            name={`qty-${line.uuid}`}
                            value={line.quantity}
                            min={1}
                            onChange={(value) =>
                              setLines((prev) =>
                                prev.map((item) =>
                                  item.uuid === line.uuid
                                    ? { ...item, quantity: Math.min(item.stock, value) }
                                    : item
                                )
                              )
                            }
                          />
                          <button
                            type="button"
                            className="product-landing__ctaGhost store-page__linkBtn"
                            onClick={() => setLines((prev) => prev.filter((item) => item.uuid !== line.uuid))}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="staff-sale__totals">
                    <OrderPricingBreakdown pricing={pricing} />
                  </div>
                </div>

                <div className="staff-sale__section">
                  <h3 className="staff-sale__sectionTitle">Customer</h3>
                  <div className="staff-sale__customerGrid">
                    <div className="store-page__field">
                      <label className="store-page__label" htmlFor="customer_name">
                        Customer name
                      </label>
                      <input
                        id="customer_name"
                        className="store-page__input"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div className="store-page__field">
                      <label className="store-page__label" htmlFor="customer_email">
                        Customer email
                      </label>
                      <input
                        id="customer_email"
                        type="email"
                        className="store-page__input"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="staff-sale__section">
                  <h3 className="staff-sale__sectionTitle">Payment</h3>
                  <div
                    className="store-page__fulfillList store-page__fulfillList--split"
                    role="radiogroup"
                    aria-label="Payment method"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'cash'}
                      className={`store-page__fulfillCard${paymentMethod === 'cash' ? ' store-page__fulfillCard--selected' : ''}`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <span className="store-page__fulfillName">Cash</span>
                      <span className="store-page__fulfillMeta">Take payment now and email the invoice</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'card'}
                      className={`store-page__fulfillCard${paymentMethod === 'card' ? ' store-page__fulfillCard--selected' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <span className="store-page__fulfillName">Credit card</span>
                      <span className="store-page__fulfillMeta">Charge in Stripe, then email the invoice</span>
                    </button>
                  </div>
                </div>

                <div className="store-page__formSubmit">
                  <button
                    type="submit"
                    className="product-landing__ctaPrimary store-page__linkBtn"
                    disabled={isSubmitting || lines.length === 0}
                  >
                    {isSubmitting
                      ? 'Processing…'
                      : paymentMethod === 'cash'
                        ? 'Complete cash sale'
                        : 'Charge card'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default StaffInPersonSale;
