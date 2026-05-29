import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useApi } from '../contexts/ApiContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import OrderPricingBreakdown from '../components/OrderPricingBreakdown';
import { OrderPricingSummary } from '../utils/orderPricing';

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

interface ShippingAddress {
  full_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
}

interface SavedAddress {
  id: number;
  label: string;
  full_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  is_default: boolean;
}

interface CouponPreview {
  coupon_code: string;
  coupon_discount: number;
  merchandise_after_coupon: number;
}

const Checkout: React.FC = () => {
  const { cartItems, totalPrice, cartTotals, isLoading } = useCart();
  const { currentUser } = useApi();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  const [formData, setFormData] = useState<ShippingAddress>({
    full_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country_code: 'CA'
  });

  // High Priority: Fetch saved addresses on mount
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/addresses/', {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.addresses) {
            setSavedAddresses(data.addresses);
            // Auto-select default address if available
            const defaultAddress = data.addresses.find((addr: SavedAddress) => addr.is_default);
            if (defaultAddress) {
              handleSelectSavedAddress(defaultAddress.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching saved addresses:', error);
      }
    };

    if (currentUser) {
      fetchSavedAddresses();
    }
  }, [currentUser]);

  const handleSelectSavedAddress = (addressId: number | string) => {
    const address = savedAddresses.find(addr => addr.id === Number(addressId));
    if (address) {
      setFormData({
        full_name: address.full_name,
        address_line_1: address.address_line_1,
        address_line_2: address.address_line_2 || '',
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country_code: address.country_code,
      });
      setSelectedAddressId(address.id);
    }
  };

  const handleUseNewAddress = () => {
    setFormData({
      full_name: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country_code: 'CA'
    });
    setSelectedAddressId(null);
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponPreview(null);
      setCouponError('');
      return;
    }
    setCouponApplying(true);
    setCouponError('');
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      const csrfToken =
        getCookie('csrftoken') ||
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      const response = await fetch('/api/coupons/preview/', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ coupon_code: code }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setCouponPreview(null);
        setCouponError(data.error || 'Invalid coupon code.');
        return;
      }
      setCouponPreview({
        coupon_code: data.coupon_code,
        coupon_discount: data.coupon_discount,
        merchandise_after_coupon: data.merchandise_after_coupon,
      });
      setCouponCode(data.coupon_code);
    } catch {
      setCouponPreview(null);
      setCouponError('Could not validate coupon. Try again.');
    } finally {
      setCouponApplying(false);
    }
  };

  const checkoutPricing: OrderPricingSummary = useMemo(
    () => ({
      listSubtotal: cartTotals.listSubtotal,
      productSaleSavings: cartTotals.productSaleSavings,
      merchandiseSubtotal: cartTotals.merchandiseSubtotal || totalPrice,
      couponCode: couponPreview?.coupon_code,
      couponDiscount: couponPreview?.coupon_discount,
      totalLabel: 'Estimated before shipping',
      totalAmount: couponPreview?.merchandise_after_coupon ?? cartTotals.merchandiseSubtotal ?? totalPrice,
    }),
    [cartTotals, totalPrice, couponPreview]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear selected address when user manually edits
    if (selectedAddressId) {
      setSelectedAddressId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser && !guestEmail.trim()) {
      setMessage('Email is required for guest checkout.');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add authentication token if available
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Add CSRF token for POST requests
      const csrfToken = getCookie('csrftoken') || 
                       document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch('/api/checkout/', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          ...(couponCode.trim() ? { coupon_code: couponCode.trim() } : {}),
          ...(!currentUser && guestEmail.trim() ? { email: guestEmail.trim() } : {}),
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle inventory validation errors
        if (errorData.unavailable_items || errorData.insufficient_stock_items) {
          let errorMessage = errorData.error || 'Some items in your cart are no longer available or have insufficient stock.';
          
          // Add details about unavailable items
          if (errorData.unavailable_items && errorData.unavailable_items.length > 0) {
            const unavailableList = errorData.unavailable_items
              .map((item: any) => `${item.product} (${item.reason})`)
              .join(', ');
            errorMessage += `\n\nUnavailable: ${unavailableList}`;
          }
          
          // Add details about insufficient stock items
          if (errorData.insufficient_stock_items && errorData.insufficient_stock_items.length > 0) {
            const insufficientList = errorData.insufficient_stock_items
              .map((item: any) => `${item.product}: Only ${item.available} available (requested ${item.requested_quantity})`)
              .join(', ');
            errorMessage += `\n\nInsufficient Stock: ${insufficientList}`;
          }
          
          throw new Error(errorMessage);
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to process checkout');
      }

      const data = await response.json();
      
      // High Priority: Save address if requested
      if (saveAddress && currentUser) {
        try {
          const token = localStorage.getItem('authToken');
          const saveHeaders: HeadersInit = {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          };
          
          // Add CSRF token for POST requests
          const saveCsrfToken = getCookie('csrftoken') || 
                               document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
          if (saveCsrfToken) {
            saveHeaders['X-CSRFToken'] = saveCsrfToken;
          }
          
          await fetch('/api/addresses/save/', {
            method: 'POST',
            headers: saveHeaders,
            credentials: 'include',
            body: JSON.stringify({
              ...formData,
              label: addressLabel || 'Saved Address',
              is_default: savedAddresses.length === 0, // Set as default if first address
            }),
          });
        } catch (error) {
          console.error('Error saving address:', error);
          // Don't block checkout if address save fails
        }
      }
      
      // Redirect to shipping selection with order ID
      navigate(`/product/cart/shipping/${data.order_id}/`);
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      setMessage(error.message || 'Failed to process checkout');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  // Redirect if cart is empty
  useEffect(() => {
    if (!isLoading && cartItems.length === 0) {
      navigate('/product/cart/');
    }
  }, [cartItems.length, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="product-landing">
        <section className="product-landing__hero">
          <div className="product-landing__container store-page__heroRow">
            <div className="store-page__heroMain">
              <p className="product-landing__eyebrow">Store</p>
              <h1 className="product-landing__h1">Checkout</h1>
              <p className="product-landing__lead">Preparing your order…</p>
            </div>
          </div>
        </section>
        <section className="product-landing__section store-page__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner />
          </div>
        </section>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="product-landing">
      <section className="product-landing__hero">
        <div className="product-landing__container store-page__heroRow">
          <div className="store-page__heroMain">
            <p className="product-landing__eyebrow">Store</p>
            <h1 className="product-landing__h1">Checkout</h1>
            <p className="product-landing__lead">Confirm shipping and apply a coupon before choosing rates.</p>
          </div>
          <div className="store-page__heroActions">
            <Link to="/product/cart/" className="product-landing__ctaGhost store-page__linkBtn">
              Back to cart
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
            onClose={handleCloseMessage}
            duration={5000}
          />

          <div className="store-page__panel">
            <div className="store-page__panelHead">
              <h2 className="store-page__panelTitle">Cart summary</h2>
            </div>
            <div className="store-page__panelBody store-page__panelBody--padded">
              <ul className="store-page__itemList" style={{ marginBottom: '0.75rem' }}>
                {cartItems.map((item) => (
                  <li key={item.uuid} className="store-page__itemRow">
                    <div className="store-page__itemMain">
                      <div className="store-page__itemName" title={item.title}>
                        {item.title}
                      </div>
                      <div className="store-page__itemQty">Qty {item.quantity}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="store-page__itemQty">
                        {item.list_price != null && item.list_price > item.price ? (
                          <>
                            <span className="order-pricing-breakdown__was">
                              ${item.list_price.toFixed(2)}
                            </span>{' '}
                            ${item.price.toFixed(2)} each
                          </>
                        ) : (
                          <>${item.price.toFixed(2)} each</>
                        )}
                      </div>
                      <div className="store-page__itemPrice">${item.item_total.toFixed(2)}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <OrderPricingBreakdown pricing={checkoutPricing} />
            </div>
          </div>

          <div className="store-page__couponRow">
            <label className="store-page__label" htmlFor="coupon_code" style={{ marginBottom: 0 }}>
              Coupon
            </label>
            <div className="store-page__couponApply">
              <input
                type="text"
                className="store-page__input"
                id="coupon_code"
                name="coupon_code"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter code"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponPreview(null);
                  setCouponError('');
                }}
              />
              <button
                type="button"
                className="product-landing__ctaGhost store-page__linkBtn"
                onClick={handleApplyCoupon}
                disabled={couponApplying || !couponCode.trim()}
              >
                {couponApplying ? 'Checking…' : 'Apply'}
              </button>
            </div>
            {couponError && (
              <p className="store-page__couponError" role="alert">
                {couponError}
              </p>
            )}
            {couponPreview && !couponError && (
              <p className="store-page__couponOk" role="status">
                Coupon <strong>{couponPreview.coupon_code}</strong> applied — saves $
                {couponPreview.coupon_discount.toFixed(2)} on items.
              </p>
            )}
          </div>

          <div className="store-page__formCard">
            {!currentUser && (
              <div className="store-page__guestBlock" style={{ marginBottom: '1.25rem' }}>
                <p className="product-landing__lead" style={{ marginBottom: '0.75rem' }}>
                  Checking out as a guest.{' '}
                  <Link to={`/login/?next=${encodeURIComponent('/product/cart/checkout/')}`}>
                    Sign in
                  </Link>{' '}
                  to use saved addresses and order history.
                </p>
                <div className="store-page__field">
                  <label className="store-page__label" htmlFor="guest_email">
                    Email for receipt and updates <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="store-page__input"
                    id="guest_email"
                    name="guest_email"
                    autoComplete="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            <h2 className="product-landing__h2" style={{ marginBottom: '1rem' }}>
              Shipping information
            </h2>

            {currentUser && savedAddresses.length > 0 && (
              <div className="store-page__field" style={{ marginBottom: '1rem' }}>
                <label className="store-page__label" htmlFor="saved_address">
                  Use saved address
                </label>
                <select
                  className="store-page__select"
                  id="saved_address"
                  value={selectedAddressId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectSavedAddress(e.target.value);
                    } else {
                      handleUseNewAddress();
                    }
                  }}
                >
                  <option value="">Enter new address</option>
                  {savedAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.label} {addr.is_default ? '(Default)' : ''} — {addr.address_line_1}, {addr.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="store-page__formGrid">
                <div className="store-page__field">
                  <label className="store-page__label" htmlFor="full_name">
                    Full name
                  </label>
                  <input
                    type="text"
                    className="store-page__input"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="store-page__field">
                  <label className="store-page__label" htmlFor="address_line_1">
                    Address line 1
                  </label>
                  <input
                    type="text"
                    className="store-page__input"
                    id="address_line_1"
                    name="address_line_1"
                    value={formData.address_line_1}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="store-page__field">
                  <label className="store-page__label" htmlFor="address_line_2">
                    Address line 2
                  </label>
                  <input
                    type="text"
                    className="store-page__input"
                    id="address_line_2"
                    name="address_line_2"
                    value={formData.address_line_2}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="store-page__field">
                  <label className="store-page__label" htmlFor="city">
                    City
                  </label>
                  <input
                    type="text"
                    className="store-page__input"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="store-page__field">
                  <label className="store-page__label" htmlFor="state">
                    State / Province
                  </label>
                  <input
                    type="text"
                    className="store-page__input"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="store-page__field">
                  <label className="store-page__label" htmlFor="postal_code">
                    Postal code
                  </label>
                  <input
                    type="text"
                    className="store-page__input"
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="store-page__field">
                  <label className="store-page__label" htmlFor="country_code">
                    Country
                  </label>
                  <select
                    className="store-page__select"
                    id="country_code"
                    name="country_code"
                    value={formData.country_code}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="CA">Canada</option>
                    <option value="US">United States</option>
                  </select>
                </div>
              </div>

              {currentUser && (
                <div className="store-page__checkRow">
                  <label className="store-page__checkbox" htmlFor="save_address">
                    <input
                      type="checkbox"
                      id="save_address"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                    />
                    <span>Save this address for future use</span>
                  </label>
                  {saveAddress && (
                    <div className="store-page__field" style={{ marginTop: '0.65rem' }}>
                      <label className="store-page__label" htmlFor="address_label_input">
                        Address label
                      </label>
                      <input
                        type="text"
                        className="store-page__input"
                        id="address_label_input"
                        placeholder="Home, Work, …"
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        maxLength={50}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="store-page__formSubmit">
                <button
                  type="submit"
                  className="product-landing__ctaPrimary store-page__linkBtn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing…' : 'View shipping rates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Checkout;
