import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from '../../contexts/CartContext';

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    currentUser: { id: 1, username: 'tester', email: 'tester@example.com' },
  }),
}));

// eslint-disable-next-line import/first -- Checkout imports ApiContext; load after jest mocks
import Checkout from '../Checkout';

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
    cartTotals: {
      listSubtotal: 29.99,
      productSaleSavings: 0,
      merchandiseSubtotal: 29.99,
    },
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

/** Mount runs GET /api/addresses/ before any checkout POST; stub by URL. */
function installCheckoutFetch(options?: {
  checkout?:
    | { kind: 'success'; orderId: number }
    | { kind: 'reject'; error: Error };
}) {
  (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : String(input);
    if (url.includes('/api/addresses/')) {
      return {
        ok: true,
        json: async () => ({ success: true, addresses: [] }),
      };
    }
    if (url.includes('/api/checkout/')) {
      const co = options?.checkout;
      if (co?.kind === 'success') {
        const orderId = co.orderId;
        return {
          ok: true,
          json: async () => ({ order_id: orderId }),
        };
      }
      if (co?.kind === 'reject') {
        throw co.error;
      }
      return {
        ok: false,
        json: async () => ({ error: 'checkout not stubbed in this test' }),
      };
    }
    throw new Error(`Unexpected fetch in Checkout.test: ${url}`);
  });
}

function checkoutRequestBody() {
  const checkoutCall = (global.fetch as jest.Mock).mock.calls.find((c) =>
    String(c[0]).includes('/api/checkout/')
  );
  expect(checkoutCall).toBeDefined();
  return JSON.parse((checkoutCall![1] as RequestInit).body as string);
}

describe('Checkout', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (global.fetch as jest.Mock).mockReset();
    installCheckoutFetch();
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) =>
      key === 'authToken' ? 'test-token' : null
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders checkout form', () => {
    renderWithProviders(<Checkout />);
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Returns: unused items within 30 days/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Terms/i })).toHaveAttribute('href', '/terms/');
  });

  it('navigates to shipping page on successful submit', async () => {
    installCheckoutFetch({ checkout: { kind: 'success', orderId: 123 } });

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

    const fetchBody = checkoutRequestBody();
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
    installCheckoutFetch({
      checkout: { kind: 'reject', error: new Error('Failed to process checkout') },
    });

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
    installCheckoutFetch({ checkout: { kind: 'success', orderId: 456 } });

    renderWithProviders(<Checkout />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'New York' } });
    fireEvent.change(screen.getByLabelText(/State/i), { target: { value: 'NY' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '10001' } });
    fireEvent.change(screen.getByLabelText(/Coupon/i), { target: { value: ' save10 ' } });

    fireEvent.click(screen.getByText(/View Shipping Rates/i));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/product/cart/shipping/456/');
    });

    const fetchBody = checkoutRequestBody();
    expect(fetchBody.coupon_code).toBe('save10');
  });
});




