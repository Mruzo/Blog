import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useApi } from '../contexts/ApiContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';

const Cart: React.FC = () => {
  const { cartItems, totalPrice, updateQuantity, removeItem, isLoading } = useCart();
  const { currentUser } = useApi();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    // Enforce maximum of 4 items per product
    const MAX_ITEMS_PER_PRODUCT = 4;
    if (quantity > MAX_ITEMS_PER_PRODUCT) {
      setMessage(`Maximum of ${MAX_ITEMS_PER_PRODUCT} items per product allowed.`);
      setMessageType('warning');
      setShowMessage(true);
      return;
    }
    
    try {
      await updateQuantity(productId, quantity);
      setMessage('Cart item quantity updated.');
      setMessageType('success');
      setShowMessage(true);
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      // Extract detailed error message from API response
      const errorMessage = error.message || 'Failed to update quantity.';
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      await removeItem(productId);
      setMessage('Item removed from cart.');
      setMessageType('success');
      setShowMessage(true);
    } catch (error: any) {
      console.error('Error removing item:', error);
      setMessage(error.message || 'Failed to remove item from cart.');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const handleCheckoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token || !currentUser) {
      // User is not authenticated, redirect to login
      const checkoutPath = '/product/cart/checkout/';
      sessionStorage.setItem('redirectAfterLogin', checkoutPath);
      navigate(`/login/?next=${encodeURIComponent(checkoutPath)}`);
      return;
    }
    
    // User is authenticated, proceed to checkout
    navigate('/product/cart/checkout/');
  };

  // Maximum of 4 items per product
  const MAX_ITEMS_PER_PRODUCT = 4;
  const quantityRange = Array.from({ length: MAX_ITEMS_PER_PRODUCT }, (_, i) => i + 1);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container text-center p-2 mt-4">
      {/* Header */}
      <div className="d-flex align-items-center mb-4 position-relative">
        <div className="flex-grow-1 text-center">
          <h1 className="subtext-btn text-decoration-none mb-1">Shopping Cart</h1>
        </div>
        <div className="position-absolute" style={{ right: 0 }}>
          <BackButton to="/product/" />
        </div>
      </div>
      <hr />
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={3000}
      />

      {cartItems.length > 0 ? (
        <>
          <table className="table table-bordered table-striped table-sm text-center">
            <thead className="thead-light font-quicksand">
              <tr>
                <th style={{ width: '20%' }}>Product</th>
                <th style={{ width: '15%' }}>Price</th>
                <th style={{ width: '10%' }}>Qty</th>
                <th style={{ width: '15%' }}>Total</th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map(product => (
                <tr className="subtext-btn-sm" key={product.uuid}>
                  <td className="align-middle">{product.title}</td>
                  <td className="align-middle">${product.price.toFixed(2)}</td>
                  <td className="align-middle">
                    <select
                      className="form-control form-control-sm text-center quantity-dropdown"
                      value={product.quantity}
                      onChange={(e) => handleUpdateQuantity(String(product.uuid), parseInt(e.target.value))}
                      style={{ width: 'auto' }}
                    >
                      {quantityRange.map(i => (
                        <option value={i} key={i}>{i}</option>
                      ))}
                    </select>
                  </td>
                  <td className="align-middle product-total" data-product-id={product.uuid}>
                    ${product.item_total.toFixed(2)}
                  </td>
                  <td className="align-middle">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveItem(product.uuid)}
                      disabled={isLoading}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row justify-content-end mt-3">
            <div className="col-md-4 col-12 text-right">
              <h5 className="subtext-btn-sm font-weight-bold">Total: <span id="cart-total-price">${totalPrice.toFixed(2)}</span></h5>
              <div className="mt-3 d-flex gap-2 justify-content-center">
                <button 
                  onClick={handleCheckoutClick}
                  className="btn btn-primary, font-quicksand font-weight-bold" 
                  style={{ backgroundColor: '#FFBC00', borderColor: '#FFBC00' }}
                >
                  Checkout
                </button>

              </div>
            </div>
          </div>
        </>
      ) : (
                    <div className="alert alert-info subtext-btn-sm mt-4" role="alert">
                      Your cart is empty. <Link to="/product/" className="alert-link">Continue shopping</Link>.
                    </div>
      )}
    </div>
  );
};

export default Cart;