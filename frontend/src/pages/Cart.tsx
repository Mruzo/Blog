import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';

const Cart: React.FC = () => {
  const { cartItems, totalPrice, cartCount, updateQuantity, removeItem, clearCart, isLoading } = useCart();
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    try {
      await updateQuantity(productId, quantity);
      setMessage('Cart item quantity updated.');
      setMessageType('success');
      setShowMessage(true);
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      setMessage(error.message || 'Failed to update quantity.');
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

  const handleClearCart = async () => {
    try {
      await clearCart();
      setMessage('Cart cleared.');
      setMessageType('success');
      setShowMessage(true);
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      setMessage(error.message || 'Failed to clear cart.');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const quantityRange = Array.from({ length: Math.max(cartCount + 1, 4) }, (_, i) => i + 1);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container text-center p-0 mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="subtext-btn text-decoration-none mb-1">Shopping Cart</h1>
          <p className="subtext-btn-sm text-muted mb-0">Review and manage your items</p>
        </div>
        <BackButton to="/product/" />
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
            <thead className="thead-light">
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
                  <td className="justify-content-center align-items-center">{product.title}</td>
                  <td>${product.price.toFixed(2)}</td>
                  <td>
                    <select
                      className="form-control form-control-sm text-center quantity-dropdown"
                      value={product.quantity}
                      onChange={(e) => handleUpdateQuantity(product.uuid, parseInt(e.target.value))}
                      style={{ width: 'auto' }}
                    >
                      {quantityRange.map(i => (
                        <option value={i} key={i}>{i}</option>
                      ))}
                    </select>
                  </td>
                  <td className="product-total" data-product-id={product.uuid}>
                    ${product.item_total.toFixed(2)}
                  </td>
                  <td>
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
              <h5 className="subtext-btn-sm">Total: <span id="cart-total-price">${totalPrice.toFixed(2)}</span></h5>
              <div className="mt-3">
                <Link to="/product/checkout/" className="btn btn-primary me-2" style={{ backgroundColor: '#FFBC00', borderColor: '#FFBC00' }}>
                  Proceed to Checkout
                </Link>
                <button 
                  className="btn btn-danger" 
                  onClick={handleClearCart}
                  disabled={isLoading}
                >
                  Clear Cart
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