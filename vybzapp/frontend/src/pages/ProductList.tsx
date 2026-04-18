import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';

interface ProductImage {
  id: number;
  image: string;
  caption: string;
  alt_text: string;
}

interface Product {
  uuid: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  discount_percentage: number;
  discounted_price: number;
  available: boolean;
  stock: number;
  images: ProductImage[];
}

interface ProductListProps {
  // Add any props if needed
}

/** Full-bleed black strip: exact coupon description, marquee when it overflows. */
const StorefrontCouponBillboard: React.FC<{ text: string }> = ({ text }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const [durationSec, setDurationSec] = useState(20);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq || typeof mq.addEventListener !== 'function') return;
    const sync = () => setReducedMotion(Boolean(mq.matches));
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const m = measureRef.current;
    if (!outer || !m) return;
    const textW = m.scrollWidth;
    const outerW = outer.clientWidth;
    const overflow = textW > outerW + 1;
    setNeedsMarquee(overflow);
    const pxPerSec = 48;
    setDurationSec(Math.max(14, (textW + outerW) / pxPerSec));
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, text]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const scrollableReduced = reducedMotion && needsMarquee;

  return (
    <div
      ref={outerRef}
      data-testid="storefront-coupon-billboard"
      className={`storefront-coupon-billboard font-quicksand${scrollableReduced ? ' storefront-coupon-billboard--scrollable' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span ref={measureRef} className="storefront-coupon-billboard__measure">
        {text}
      </span>

      {needsMarquee && !reducedMotion && (
        <div
          className="storefront-coupon-billboard__track"
          style={{ animationDuration: `${durationSec}s` }}
        >
          <span className="storefront-coupon-billboard__segment">{text}</span>
          <span className="storefront-coupon-billboard__segment" aria-hidden>
            {text}
          </span>
        </div>
      )}

      {needsMarquee && reducedMotion && (
        <div className="storefront-coupon-billboard__static" style={{ textAlign: 'left', width: 'max-content', minWidth: '100%' }}>
          {text}
        </div>
      )}

      {!needsMarquee && (
        <div className="storefront-coupon-billboard__static">{text}</div>
      )}
    </div>
  );
};

const ProductList: React.FC<ProductListProps> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [storefrontCouponDescription, setStorefrontCouponDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const { addToCart, cartItems } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/coupons/featured/');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.active && data.coupon) {
          const raw = (data.coupon.description ?? '').toString();
          const trimmed = raw.trim();
          if (trimmed) {
            setStorefrontCouponDescription(trimmed);
          } else {
            setStorefrontCouponDescription(null);
          }
        } else if (!cancelled) {
          setStorefrontCouponDescription(null);
        }
      } catch {
        /* ignore promo fetch failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products/');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.results || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string, quantity: number = 1) => {
    try {
      // Check current cart quantity for this product
      const existingItem = cartItems.find(item => item.uuid === productId);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      const newQuantity = currentQuantity + quantity;
      
      // Enforce maximum of 4 items per product
      if (newQuantity > 4) {
        const maxAllowed = 4 - currentQuantity;
        if (maxAllowed <= 0) {
          setMessage('Maximum of 4 items per product allowed. You already have 4 in your cart.');
        } else {
          setMessage(`Maximum of 4 items per product allowed. You can add ${maxAllowed} more.`);
        }
        setMessageType('warning');
        setShowMessage(true);
        return;
      }
      
      await addToCart(productId, quantity);
      setMessage('Product added to cart successfully!');
      setMessageType('success');
      setShowMessage(true);
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      // Extract error message from API response
      let errorMessage = 'Failed to add product to cart';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const switchImage = (productId: string, imageIndex: number) => {
    // Find the carousel container for this product
    const carouselContainer = document.getElementById(`carousel-${productId}`);
    if (!carouselContainer) return;

    // Remove active class from all carousel items
    const carouselItems = carouselContainer.querySelectorAll('.carousel-item');
    carouselItems.forEach((item) => {
      item.classList.remove('active');
    });

    // Add active class to the selected item
    const selectedItem = carouselItems[imageIndex];
    if (selectedItem) {
      selectedItem.classList.add('active');
    }

    // Update thumbnail borders
    const thumbnails = carouselContainer.querySelectorAll('.img-thumbnail');
    thumbnails.forEach((thumb, index) => {
      if (index === imageIndex) {
        thumb.classList.add('border-dark');
        thumb.classList.remove('border-0');
      } else {
        thumb.classList.remove('border-dark');
        thumb.classList.add('border-0');
      }
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container text-center p-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      {storefrontCouponDescription && (
        <StorefrontCouponBillboard text={storefrontCouponDescription} />
      )}
      <div className="col p-1 mt-4">
      <h3 className="text-center bold subtext-btn text-decoration-none border-0" style={{ fontWeight: 'bold' }}>
        <p className="mb-1">Desk Mats</p>
      </h3>

      <div className="container p-0">
        <MessagePopup
          message={message}
          type={messageType}
          show={showMessage}
          onClose={handleCloseMessage}
          duration={3000}
        />

        <div className="row d-flex flex-wrap justify-content-center">
          {products.map((product) => (
            <div key={product.uuid} className="col-md-6 col-12">
              <ul className="list-group mx-auto p-0">
                {product.available ? (
                  <li className="list-group-item row w-100 mb-2 mx-auto d-flex justify-content-center shadow">
                    <div className="subtext-btn p-0">
                      <h6 className="subtext-btn border-bottom mb-" style={{ fontWeight: 'bold' }}>
                        {product.title}
                      </h6>
                      <div className="row">
                        {/* Carousel Container */}
                        <div id={`carousel-${product.uuid}`} className="carousel slide">
                          {/* Main Image Display */}
                          <div className="carousel-inner">
                            {product.images.length > 0 ? (
                              product.images.map((image, index) => (
                                <div
                                  key={image.id}
                                  className={`carousel-item ${index === 0 ? 'active' : ''}`}
                                >
                                  <img
                                    id={`main-image-${product.uuid}`}
                                    src={image.image}
                                    alt={image.caption}
                                    className="d-block w-100"
                                    style={{ height: 'auto' }}
                                  />
                                </div>
                              ))
                            ) : (
                              <div className="carousel-item active">
                                <p className="subtext-btn-sm text-center py-3">No images available for this product.</p>
                              </div>
                            )}
                          </div>

                          {/* Thumbnail Navigation */}
                          {product.images.length > 1 && (
                            <div className="d-flex justify-content-center mt-2">
                              {product.images.map((image, index) => (
                                <div key={image.id} className="col-2 p-1">
                                  <img
                                    src={image.image}
                                    alt={image.caption}
                                    className={`img-thumbnail border ${
                                      index === 0 ? 'border-dark' : 'border-0'
                                    }`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => switchImage(product.uuid, index)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="col p-0 my-2 subtext-btn-sm border-top">
                          <div className="row align-items-center justify-content-between border-bottom">
                            <div className="col-auto">
                              {product.discount_percentage > 0 ? (
                                <h6 className="card-title subtext-btn-sm my-auto">
                                  <p className="card-text">
                                    <span style={{ color: '#DC2229', backgroundColor: '#F3F4F6'}}>
                                      
                                      <b style={{ textDecoration: 'line-through', fontSize:'0.9rem' }}>C${product.price}</b>&nbsp; 
                                      
                                      <b className="text-dark">Original Price</b>&nbsp;
                                      <b style={{ color: '#DC2229', backgroundColor: '#F3F4F6', fontStyle: 'italic', fontSize: '0.7rem' }}>-{product.discount_percentage}%</b>
                                    </span>
                                    <br />
                                    <span className=" subtext-btn text-dark">
                                    <b>C${product.discounted_price.toFixed(2)} </b>
                                    
                                    </span>
                                  </p>
                                </h6>
                              ) : (
                                <h6 className="card-title subtext-btn text-right my-auto">
                                  <span style={{ textDecoration: 'line-through', color: '#DC2229' }}></span>
                                  C${product.price}
                                </h6>
                              )}
                            </div>

                            <div className="col-auto">
                            {(() => {
                              const existingItem = cartItems.find(item => item.uuid === product.uuid);
                              const currentQuantity = existingItem ? existingItem.quantity : 0;
                              const isMaxReached = currentQuantity >= 4;
                              return (
                                <button
                                  className="btn subtext-btn-sm shadow mb-0 bg-body-tertiary justify-content-center text-dark rounded-5 mt-1 p-1 add-to-cart-btn my-auto"
                                  data-product-id={product.uuid}
                                  data-quantity="1"
                                  style={{ 
                                    backgroundColor: isMaxReached ? '#cccccc' : '#FFBC00', 
                                    position: 'relative', 
                                    zIndex: 10, 
                                    touchAction: 'manipulation',
                                    cursor: isMaxReached ? 'not-allowed' : 'pointer'
                                  }}
                                  type="button"
                                  disabled={isMaxReached}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isMaxReached) {
                                      handleAddToCart(product.uuid, 1);
                                    }
                                  }}
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                  }}
                                  title={isMaxReached ? 'Maximum of 4 items per product' : 'Add to cart'}
                                >
                                  {isMaxReached ? 'Max (4)' : 'Add to cart'}
                                </button>
                              );
                            })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li className="list-group-item row w-100 mb-2 mx-auto d-flex justify-content-center shadow">
                    <div className="subtext-btn p-0">
                      <h6 className="subtext-btn border-bottom mb-" style={{ fontWeight: 'bold' }}>
                        {product.title}
                      </h6>
                      <div className="row">
                        {/* Carousel Container for unavailable products */}
                        <div id={`carousel-${product.uuid}`} className="carousel slide">
                          <div className="carousel-inner">
                            {product.images.length > 0 ? (
                              product.images.map((image, index) => (
                                <div
                                  key={image.id}
                                  className={`carousel-item ${index === 0 ? 'active' : ''}`}
                                >
                                  <img
                                    id={`main-image-${product.uuid}`}
                                    src={image.image}
                                    alt={image.caption}
                                    className="d-block w-100"
                                    style={{ height: 'auto' }}
                                  />
                                </div>
                              ))
                            ) : (
                              <div className="carousel-item active">
                                <p className="subtext-btn-sm text-center py-3">No images available for this product.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col p-0 my-2 subtext-btn-sm border-top">
                          <div className="row align-items-center justify-content-between border-bottom">
                            <div className="col-auto">
                              <span className="subtext-btn-sm text-dark">
                                <b className="text-dark">Unavailable</b>
                              </span>
                            </div>
                            <div className="col-auto">
                            <button
                              className="btn subtext-btn-sm shadow mb-0 bg-body-tertiary justify-content-center text-dark rounded-5 my-1 p-1"
                              style={{ backgroundColor: '#FFBC00' }}
                              type="button"
                            >
                              Get notified
                            </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
};

export default ProductList;
