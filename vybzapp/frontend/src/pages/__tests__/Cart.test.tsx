import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Cart from '../Cart';
import { CartProvider } from '../../contexts/CartContext';

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    currentUser: { id: 1, username: 'tester', email: 'tester@example.com' },
  }),
}));

const mockUseCart = jest.fn();

jest.mock('../../contexts/CartContext', () => ({
  ...jest.requireActual('../../contexts/CartContext'),
  useCart: () => mockUseCart(),
}));

const defaultCart = {
  cartItems: [
    {
      uuid: 'product-1',
      title: 'Test Product',
      price: 29.99,
      quantity: 2,
      item_total: 59.98,
    },
  ],
  totalPrice: 59.98,
  cartTotals: {
    listSubtotal: 59.98,
    productSaleSavings: 0,
    merchandiseSubtotal: 59.98,
  },
  cartCount: 2,
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn(),
  isLoading: false,
};

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <BrowserRouter>
      <CartProvider>{component}</CartProvider>
    </BrowserRouter>
  );

describe('Cart', () => {
  beforeEach(() => {
    mockUseCart.mockReturnValue(defaultCart);
  });

  it('renders cart items', () => {
    renderWithProviders(<Cart />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getAllByText('$59.98').length).toBeGreaterThan(0);
  });

  it('renders empty cart message when cart is empty', () => {
    mockUseCart.mockReturnValueOnce({
      ...defaultCart,
      cartItems: [],
      totalPrice: 0,
      cartCount: 0,
    });
    renderWithProviders(<Cart />);
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
  });

  it('renders checkout button', () => {
    renderWithProviders(<Cart />);
    expect(screen.getByRole('button', { name: /checkout/i })).toBeInTheDocument();
  });

  it('renders continue shopping link when empty', () => {
    mockUseCart.mockReturnValueOnce({
      ...defaultCart,
      cartItems: [],
      totalPrice: 0,
      cartCount: 0,
    });
    renderWithProviders(<Cart />);
    const link = screen.getByRole('link', { name: /continue shopping/i });
    expect(link).toHaveAttribute('href', '/product/');
  });
});
