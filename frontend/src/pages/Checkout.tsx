import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';

interface ShippingAddress {
  full_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
}

const Checkout: React.FC = () => {
  const { cartItems, totalPrice, isLoading } = useCart();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ShippingAddress>({
    full_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country_code: 'CA'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:8000/api/checkout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to process checkout');
      }

      const data = await response.json();
      
      // Redirect to shipping selection with order ID
      navigate(`/product/shipping/${data.order_id}/`);
      
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
    return <LoadingSpinner />;
  }

  if (cartItems.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="container text-center p-1 mt-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="subtext-btn text-decoration-none mb-1">Cart Checkout</h2>
          <p className="subtext-btn-sm text-muted mb-0">Complete your order with shipping information</p>
        </div>
        <BackButton to="/product/cart/" />
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

      {/* Shipping Address Form */}
      <div className="subtext-btn-sm text-decoration-none">
        <h2 className="subtext-btn text-decoration-none mt-4">Shipping Information</h2>
        <hr />
        <form className="text-center subtext-btn-sm" onSubmit={handleSubmit}>
          <div className="row">
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
