import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useApi } from '../contexts/ApiContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';

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

const Checkout: React.FC = () => {
  const { cartItems, totalPrice, isLoading } = useCart();
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

  // Check authentication on mount and handle redirects
  useEffect(() => {
    // Check if user is authenticated - check token first (immediate check)
    const token = localStorage.getItem('authToken');
    if (!token) {
      // No token, redirect immediately
      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      navigate(`/login/?next=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }
    
    // If we have a token but no user yet, wait a moment for user to load
    // If after a short delay there's still no user, redirect
    if (!currentUser) {
      const timeout = setTimeout(() => {
        // Still no user after waiting, redirect to login
        const currentPath = window.location.pathname;
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        navigate(`/login/?next=${encodeURIComponent(currentPath)}`, { replace: true });
      }, 1000); // Wait 1 second for user to load
      
      return () => clearTimeout(timeout);
    }
  }, [navigate, currentUser]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!isLoading && cartItems.length === 0) {
      navigate('/product/cart/');
    }
  }, [cartItems.length, isLoading, navigate]);

  // Show loading spinner while checking authentication or cart
  const token = localStorage.getItem('authToken');
  if (isLoading || !token || !currentUser) {
    return <LoadingSpinner />;
  }

  if (cartItems.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="container text-center p-2 mt-5">
      {/* Header */}
      <div className="d-flex align-items-center mb-4 position-relative">
        <div className="flex-grow-1 text-center">
          <h2 className="subtext-btn text-decoration-none mb-1">Cart Checkout</h2>
        </div>
        <div className="position-absolute" style={{ right: 0 }}>
          <BackButton />
        </div>
      </div>
      <hr />
      
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={5000}
      />

      {/* Cart Summary */}
                      <table className="subtext-btn-sm table table-bordered table-striped table-sm text-center">
        <thead className="thead-light">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
                        <tbody className="subtext-btn-sm">
          {cartItems.map(item => (
            <tr key={item.uuid}>
              <td>{item.title}</td>
              <td>{item.quantity}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>${item.item_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="subtext-btn-sm"><strong>Sub Total: ${totalPrice.toFixed(2)}</strong></p>

      <div className="row justify-content-end mb-3">
        <div className="col-6 col-md-4 text-left subtext-btn-sm text-decoration-none">
          <div className="d-flex flex-nowrap align-items-center">
            <label htmlFor="coupon_code" className="form-label mb-0 text-nowrap me-2 flex-shrink-0">
              Coupon&nbsp;
            </label>
            <input
              type="text"
              className="form-control text-uppercase flex-grow-1"
              id="coupon_code"
              name="coupon_code"
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              style={{ minWidth: 0 }}
            />
          </div>
          <small className="form-text text-muted d-block mt-1">
            
          </small>
        </div>
      </div>

      {/* Shipping Address Form */}
      <div className="subtext-btn-sm text-decoration-none">
        <h2 className="subtext-btn text-decoration-none mt-4">Shipping Information</h2>
        <hr />
        
        {/* High Priority: Saved Addresses Selection */}
        {savedAddresses.length > 0 && (
          <div className="mb-3">
            <label htmlFor="saved_address" className="form-label">Use Saved Address:</label>
            <select
              className="form-control mb-2"
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
              <option value="">Enter New Address</option>
              {savedAddresses.map(addr => (
                <option key={addr.id} value={addr.id}>
                  {addr.label} {addr.is_default ? '(Default)' : ''} - {addr.address_line_1}, {addr.city}
                </option>
              ))}
            </select>
          </div>
        )}

        <form className="text-center subtext-btn-sm" onSubmit={handleSubmit}>
          <div className="row p-2">
            <div className="col-6 mb-1 p-1">
              <label htmlFor="full_name" className="form-label col-12 p-0 m-0">Full Name:</label>
              <input
                type="text"
                className="form-control"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="col-6 mb-1 p-1">
              <label htmlFor="address_line_1" className="form-label col-12 p-0 m-0">Address Line 1:</label>
              <input
                type="text"
                className="form-control"
                id="address_line_1"
                name="address_line_1"
                value={formData.address_line_1}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="col-6 mb-1 p-1">
              <label htmlFor="address_line_2" className="form-label col-12 p-0 m-0">Address Line 2:</label>
              <input
                type="text"
                className="form-control"
                id="address_line_2"
                name="address_line_2"
                value={formData.address_line_2}
                onChange={handleInputChange}
              />
            </div>
            <div className="col-6 mb-1 p-1">
              <label htmlFor="city" className="form-label col-12 p-0 m-0">City:</label>
              <input
                type="text"
                className="form-control"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="col-6 mb-1 p-1">
              <label htmlFor="state" className="form-label col-12 p-0 m-0">State/Province:</label>
              <input
                type="text"
                className="form-control"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="col-6 mb-1 p-1">
              <label htmlFor="postal_code" className="form-label col-12 p-0 m-0">Postal Code:</label>
              <input
                type="text"
                className="form-control"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="col-6 mb-1 p-1">
              <label htmlFor="country_code" className="form-label col-12 p-0 m-0">Country:</label>
              <select
                className="form-control"
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
          
          {/* High Priority: Save Address Option */}
          {currentUser && (
            <div className="row p-2">
              <div className="col-12 mb-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="save_address"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="save_address">
                    Save this address for future use
                  </label>
                </div>
                {saveAddress && (
                  <div className="mt-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Address label (e.g., Home, Work)"
                      value={addressLabel}
                      onChange={(e) => setAddressLabel(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <button 
            type="submit" 
            className="subtext-btn-sm text-center btn my-1 btn-success"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'View Shipping Rates'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
