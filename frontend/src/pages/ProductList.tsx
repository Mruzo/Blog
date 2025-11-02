import React, { useState, useEffect } from 'react';
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

const ProductList: React.FC<ProductListProps> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/products/');
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
      await addToCart(productId, quantity);
      setMessage('Product added to cart successfully!');
      setMessageType('success');
      setShowMessage(true);
    } catch (err) {
      console.error('Error adding to cart:', err);
      setMessage('Failed to add product to cart');
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
                                <h6 className="card-title subtext-btn my-auto">
                                  <p className="card-text">
                                    <span style={{ color: '#DC2229' }}>
                                      <b>C${product.discounted_price.toFixed(2)}</b>
                                    </span>
                                    <br />
                                    <span className="subtext-btn-sm text-dark">
                                      <b style={{ textDecoration: 'line-through' }}>C${product.price}</b>
                                      <b style={{ color: '#DC2229' }}> &nbsp; -{product.discount_percentage}% </b>
                                      <b className="text-dark"> Original Price</b>
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
                            <button
                              className="btn subtext-btn-sm shadow mb-0 bg-body-tertiary justify-content-center text-dark rounded-5 mt-1 p-1 add-to-cart-btn my-auto"
                              data-product-id={product.uuid}
                              data-quantity="1"
                              style={{ backgroundColor: '#FFBC00' }}
                              type="button"
                              onClick={() => handleAddToCart(product.uuid, 1)}
                            >
                              Add to cart
                            </button>
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
  );
};

export default ProductList;
