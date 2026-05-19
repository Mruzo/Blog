import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';

const Cart: React.FC = () => {
  const { cartItems, totalPrice, updateQuantity, removeItem, isLoading } = useCart();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
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
    navigate('/product/cart/checkout/');
  };

  const MAX_ITEMS_PER_PRODUCT = 4;
  const quantityRange = Array.from({ length: MAX_ITEMS_PER_PRODUCT }, (_, i) => i + 1);

  if (isLoading) {
    return (
      <div className="product-landing">
        <section className="product-landing__hero">
          <div className="product-landing__container store-page__heroRow">
            <div className="store-page__heroMain">
              <p className="product-landing__eyebrow">Store</p>
              <h1 className="product-landing__h1">Cart</h1>
              <p className="product-landing__lead">Loading your cart…</p>
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

  return (
    <div className="product-landing">
      <section className="product-landing__hero">
        <div className="product-landing__container store-page__heroRow">
          <div className="store-page__heroMain">
            <p className="product-landing__eyebrow">Store</p>
            <h1 className="product-landing__h1">Shopping cart</h1>
            <p className="product-landing__lead">Review quantities before checkout—up to four per product.</p>
          </div>
          {cartItems.length > 0 && (
            <div className="store-page__heroActions">
              <Link to="/product/" className="product-landing__ctaGhost store-page__linkBtn">
                Continue shopping
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="product-landing__section store-page__section">
        <div className="product-landing__container">
          <MessagePopup
            message={message}
            type={messageType}
            show={showMessage}
            onClose={handleCloseMessage}
            duration={3000}
          />

          {cartItems.length > 0 ? (
            <>
              <div className="store-page__cartList">
                {cartItems.map((product) => (
                  <div key={product.uuid} className="store-page__cartLine">
                    <div className="store-page__cartTitleRow">
                      <span className="store-page__cartTitle">{product.title}</span>
                      <button
                        type="button"
                        className="store-page__cartRemove"
                        onClick={() => handleRemoveItem(product.uuid)}
                        disabled={isLoading}
                        title="Remove from cart"
                        aria-label={`Remove ${product.title} from cart`}
                      >
                        <i className="fas fa-trash" aria-hidden />
                      </button>
                    </div>
                    <div className="store-page__cartControls">
                      <span className="store-page__cartEach">${product.price.toFixed(2)} each</span>
                      <label className="visually-hidden" htmlFor={`qty-${product.uuid}`}>
                        Quantity for {product.title}
                      </label>
                      <select
                        id={`qty-${product.uuid}`}
                        className="store-page__cartSelect"
                        value={product.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(String(product.uuid), parseInt(e.target.value, 10))
                        }
                      >
                        {quantityRange.map((i) => (
                          <option value={i} key={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                      <span className="store-page__cartLineTot">${product.item_total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="store-page__cartTotBar">
                <span className="store-page__cartTotalLabel" id="cart-total-price">
                  Total: ${totalPrice.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  className="product-landing__ctaPrimary store-page__linkBtn"
                >
                  Checkout
                </button>
              </div>
            </>
          ) : (
            <div className="store-page__infoBanner" role="status">
              Your cart is empty.{' '}
              <Link to="/product/">Continue shopping</Link>.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Cart;
