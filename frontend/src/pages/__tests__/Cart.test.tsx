import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Cart from '../Cart';
import { CartProvider } from '../../contexts/CartContext';

// Mock CartContext
jest.mock('../../contexts/CartContext', () => ({
  ...jest.requireActual('../../contexts/CartContext'),
  useCart: () => ({
    cartItems: [
      {
        uuid: 'product-1',
        title: 'Test Product',
        price: 29.99,
        quantity: 2,
        item_total: 59.98
      }
    ],
    totalPrice: 59.98,
    cartCount: 2,
    updateQuantity: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    isLoading: false
  })
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <CartProvider>
        {component}
      </CartProvider>
    </BrowserRouter>
  );
};

describe('Cart', () => {
  it('renders cart items', () => {
    renderWithProviders(<Cart />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$59.98')).toBeInTheDocument();
  });

  it('renders empty cart message when cart is empty', () => {
    jest.mock('../../contexts/CartContext', () => ({
      ...jest.requireActual('../../contexts/CartContext'),
      useCart: () => ({
        cartItems: [],
        totalPrice: 0,
        cartCount: 0,
        updateQuantity: jest.fn(),
        removeItem: jest.fn(),
        clearCart: jest.fn(),
        isLoading: false
      })
    }));

    renderWithProviders(<Cart />);
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
  });

  it('renders "Proceed to Checkout" link with correct path', () => {
    renderWithProviders(<Cart />);
    const checkoutLink = screen.getByText('Proceed to Checkout').closest('a');
    expect(checkoutLink).toHaveAttribute('href', '/product/cart/checkout/');
  });

  it('renders "Continue shopping" link with correct path when empty', () => {
    jest.mock('../../contexts/CartContext', () => ({
      ...jest.requireActual('../../contexts/CartContext'),
      useCart: () => ({
        cartItems: [],
        totalPrice: 0,
        cartCount: 0,
        updateQuantity: jest.fn(),
        removeItem: jest.fn(),
        clearCart: jest.fn(),
        isLoading: false
      })
    }));

    renderWithProviders(<Cart />);
    const continueShoppingLink = screen.getByText('Continue shopping').closest('a');
    expect(continueShoppingLink).toHaveAttribute('href', '/product/');
  });
});




