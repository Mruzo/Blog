import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Checkout from '../Checkout';
import { CartProvider } from '../../contexts/CartContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock fetch
global.fetch = jest.fn();

// Mock CartContext
jest.mock('../../contexts/CartContext', () => ({
  ...jest.requireActual('../../contexts/CartContext'),
  useCart: () => ({
    cartItems: [
      {
        uuid: 'product-1',
        title: 'Test Product',
        price: 29.99,
        quantity: 1,
        item_total: 29.99
      }
    ],
    totalPrice: 29.99,
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

describe('Checkout', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders checkout form', () => {
    renderWithProviders(<Checkout />);
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
  });

  it('navigates to shipping page on successful submit', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ order_id: 123 })
    });

    renderWithProviders(<Checkout />);

    // Fill form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'New York' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'NY' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '10001' } });

    // Submit form
    fireEvent.click(screen.getByText(/View Shipping Rates/i));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/product/cart/shipping/123/');
    });

    const fetchBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(fetchBody).toMatchObject({
      full_name: 'John Doe',
      address_line_1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
    });
    expect(fetchBody).not.toHaveProperty('coupon_code');
  });

  it('displays error message on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to process checkout'));

    renderWithProviders(<Checkout />);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'New York' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'NY' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '10001' } });
    fireEvent.click(screen.getByText(/View Shipping Rates/i));

    await waitFor(() => {
      expect(screen.getByText(/Failed to process/i)).toBeInTheDocument();
    });
  });

  it('includes coupon_code in checkout payload when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ order_id: 456 }),
    });

    renderWithProviders(<Checkout />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'New York' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'NY' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '10001' } });
    fireEvent.change(screen.getByLabelText(/Promo code/i), { target: { value: ' save10 ' } });

    fireEvent.click(screen.getByText(/View Shipping Rates/i));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/product/cart/shipping/456/');
    });

    const fetchBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(fetchBody.coupon_code).toBe(' save10 ');
  });
});




