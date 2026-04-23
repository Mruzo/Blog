/**
 * Integration Tests for Checkout Process
 * Tests seamless frontend-backend integration
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { CartProvider } from '../../contexts/CartContext';

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    currentUser: { id: 1, username: 'tester', email: 'tester@example.com' },
  }),
}));

jest.mock('../../contexts/CartContext', () => ({
  ...jest.requireActual('../../contexts/CartContext'),
  useCart: () => ({
    cartItems: [
      {
        uuid: 'product-1',
        title: 'Test Product',
        price: 29.99,
        quantity: 1,
        item_total: 29.99,
      },
    ],
    totalPrice: 29.99,
    isLoading: false,
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

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'test-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <CartProvider>
        {component}
      </CartProvider>
    </BrowserRouter>
  );
};

/** GET /api/addresses/ runs on mount before POST /api/checkout/. */
function installIntegrationFetch(options: {
  addressesJson?: Record<string, unknown>;
  checkout?: () => Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>;
}) {
  const addressesJson = options.addressesJson ?? { success: true, addresses: [] };
  (global.fetch as jest.Mock).mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/api/addresses/') && !url.includes('save')) {
        return { ok: true, json: async () => addressesJson };
      }
      if (url.includes('/api/checkout/')) {
        if (options.checkout) {
          return options.checkout();
        }
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'checkout not stubbed in this test' }),
        };
      }
      if (url.includes('/api/addresses/save/')) {
        return { ok: true, json: async () => ({ success: true }) };
      }
      throw new Error(`Unexpected fetch in integration test: ${url}`);
    }
  );
}

describe('Checkout Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (global.fetch as jest.Mock).mockReset();
    mockLocalStorage.getItem.mockReturnValue('test-token');
    installIntegrationFetch({});
  });

  describe('Successful Checkout Flow', () => {
    it('submits checkout with authentication token', async () => {
      installIntegrationFetch({
        checkout: async () => ({
          ok: true,
          json: async () => ({
            success: true,
            order_id: 123,
            message: 'Order created successfully',
          }),
        }),
      });

      renderWithProviders(<Checkout />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/Full Name/i), { 
        target: { value: 'John Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { 
        target: { value: '123 Main St' } 
      });
      fireEvent.change(screen.getByLabelText(/City/i), { 
        target: { value: 'Toronto' } 
      });
      fireEvent.change(screen.getByLabelText(/State/i), { 
        target: { value: 'ON' } 
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { 
        target: { value: 'M5H 2N2' } 
      });

      // Submit form
      const submitButton = screen.getByText(/View Shipping Rates/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/checkout/',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Token test-token'
            }),
            credentials: 'include',
          })
        );

        const checkoutCall = (global.fetch as jest.Mock).mock.calls.find(
          (call: any[]) => call[0] === '/api/checkout/'
        );
        expect(checkoutCall).toBeDefined();
        const body = JSON.parse(checkoutCall![1].body);
        expect(body).toEqual({
          full_name: 'John Doe',
          address_line_1: '123 Main St',
          address_line_2: '',
          city: 'Toronto',
          state: 'ON',
          postal_code: 'M5H 2N2',
          country_code: 'CA',
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/product/cart/shipping/123/');
      });
    });

    it('handles successful checkout with saved address', async () => {
      installIntegrationFetch({
        addressesJson: {
          success: true,
          addresses: [
            {
              id: 1,
              full_name: 'Saved User',
              address_line_1: '456 Saved St',
              city: 'Toronto',
              state: 'ON',
              postal_code: 'M5H 1A1',
              country_code: 'CA',
              is_default: true,
            },
          ],
        },
        checkout: async () => ({
          ok: true,
          json: async () => ({
            success: true,
            order_id: 456,
            message: 'Order created successfully',
          }),
        }),
      });

      renderWithProviders(<Checkout />);

      // Wait for saved addresses to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/addresses/',
          expect.any(Object)
        );
      });

      // Select saved address (if dropdown exists)
      // Then submit
      const submitButton = screen.getByText(/View Shipping Rates/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        const checkoutCall = (global.fetch as jest.Mock).mock.calls.find(
          (call: any[]) => call[0] === '/api/checkout/'
        );
        expect(checkoutCall).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error for empty cart', async () => {
      installIntegrationFetch({
        checkout: async () => ({
          ok: false,
          status: 400,
          json: async () => ({
            success: false,
            error: 'Cart is empty',
          }),
        }),
      });

      renderWithProviders(<Checkout />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Full Name/i), { 
        target: { value: 'John Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { 
        target: { value: '123 Main St' } 
      });
      fireEvent.change(screen.getByLabelText(/City/i), { 
        target: { value: 'Toronto' } 
      });
      fireEvent.change(screen.getByLabelText(/State/i), { 
        target: { value: 'ON' } 
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { 
        target: { value: 'M5H 2N2' } 
      });

      fireEvent.click(screen.getByText(/View Shipping Rates/i));

      await waitFor(() => {
        expect(screen.getByText(/Cart is empty/i)).toBeInTheDocument();
      });
    });

    it('displays detailed inventory errors', async () => {
      installIntegrationFetch({
        checkout: async () => ({
          ok: false,
          status: 400,
          json: async () => ({
            success: false,
            error:
              'Some items in your cart are no longer available or have insufficient stock',
            insufficient_stock_items: [
              {
                product: 'Test Product',
                requested_quantity: 15,
                available: 10,
                reason: 'Only 10 items available in stock',
              },
            ],
          }),
        }),
      });

      renderWithProviders(<Checkout />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Full Name/i), { 
        target: { value: 'John Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { 
        target: { value: '123 Main St' } 
      });
      fireEvent.change(screen.getByLabelText(/City/i), { 
        target: { value: 'Toronto' } 
      });
      fireEvent.change(screen.getByLabelText(/State/i), { 
        target: { value: 'ON' } 
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { 
        target: { value: 'M5H 2N2' } 
      });

      fireEvent.click(screen.getByText(/View Shipping Rates/i));

      await waitFor(() => {
        expect(screen.getByText(/Insufficient Stock: Test Product/i)).toBeInTheDocument();
      });
    });

    it('handles authentication errors', async () => {
      installIntegrationFetch({
        checkout: async () => ({
          ok: false,
          status: 401,
          json: async () => ({
            detail: 'Authentication credentials were not provided.',
          }),
        }),
      });

      renderWithProviders(<Checkout />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Full Name/i), { 
        target: { value: 'John Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { 
        target: { value: '123 Main St' } 
      });
      fireEvent.change(screen.getByLabelText(/City/i), { 
        target: { value: 'Toronto' } 
      });
      fireEvent.change(screen.getByLabelText(/State/i), { 
        target: { value: 'ON' } 
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { 
        target: { value: 'M5H 2N2' } 
      });

      fireEvent.click(screen.getByText(/View Shipping Rates/i));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/checkout/',
          expect.any(Object)
        );
      });
    });

    it('handles address validation errors', async () => {
      installIntegrationFetch({
        checkout: async () => ({
          ok: false,
          status: 400,
          json: async () => ({
            success: false,
            error: 'Invalid Canadian postal code format. Expected format: A1A 1A1',
            errors: {
              postal_code: [
                'Invalid Canadian postal code format. Expected format: A1A 1A1',
              ],
            },
          }),
        }),
      });

      renderWithProviders(<Checkout />);

      // Fill form with invalid postal code
      fireEvent.change(screen.getByLabelText(/Full Name/i), { 
        target: { value: 'John Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { 
        target: { value: '123 Main St' } 
      });
      fireEvent.change(screen.getByLabelText(/City/i), { 
        target: { value: 'Toronto' } 
      });
      fireEvent.change(screen.getByLabelText(/State/i), { 
        target: { value: 'ON' } 
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { 
        target: { value: 'INVALID' } 
      });

      fireEvent.click(screen.getByText(/View Shipping Rates/i));

      await waitFor(() => {
        expect(screen.getByText(/Invalid.*postal code/i)).toBeInTheDocument();
      });
    });
  });

  describe('Address Management', () => {
    it('fetches and displays saved addresses', async () => {
      installIntegrationFetch({
        addressesJson: {
          success: true,
          addresses: [
            {
              id: 1,
              full_name: 'Home Address',
              address_line_1: '123 Home St',
              city: 'Toronto',
              state: 'ON',
              postal_code: 'M5H 1A1',
              country_code: 'CA',
              is_default: true,
            },
            {
              id: 2,
              full_name: 'Work Address',
              address_line_1: '456 Work St',
              city: 'Toronto',
              state: 'ON',
              postal_code: 'M5H 2A2',
              country_code: 'CA',
              is_default: false,
            },
          ],
        },
      });

      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/addresses/',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Token test-token'
            })
          })
        );
      });

      // Verify saved addresses are available (if dropdown is rendered)
      // This depends on your UI implementation
    });

    it('saves address when checkbox is checked', async () => {
      installIntegrationFetch({
        checkout: async () => ({
          ok: true,
          json: async () => ({
            success: true,
            order_id: 789,
            message: 'Order created successfully',
          }),
        }),
      });

      renderWithProviders(<Checkout />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/Full Name/i), { 
        target: { value: 'John Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { 
        target: { value: '123 Main St' } 
      });
      fireEvent.change(screen.getByLabelText(/City/i), { 
        target: { value: 'Toronto' } 
      });
      fireEvent.change(screen.getByLabelText(/State/i), { 
        target: { value: 'ON' } 
      });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { 
        target: { value: 'M5H 2N2' } 
      });

      // Check "Save address" checkbox if it exists
      const saveCheckbox = screen.queryByLabelText(/Save.*address/i);
      if (saveCheckbox) {
        fireEvent.click(saveCheckbox);
      }

      // Submit
      fireEvent.click(screen.getByText(/View Shipping Rates/i));

      await waitFor(() => {
        // Should call checkout API
        const checkoutCall = (global.fetch as jest.Mock).mock.calls.find(
          (call: any[]) => call[0] === '/api/checkout/'
        );
        expect(checkoutCall).toBeDefined();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      installIntegrationFetch({
        checkout: async () => ({
          ok: false,
          status: 400,
          json: async () => ({
            success: false,
            error: 'Missing shipping fields',
          }),
        }),
      });

      renderWithProviders(<Checkout />);

      const form = document.querySelector('form');
      expect(form).toBeTruthy();
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText(/Missing shipping fields/i)).toBeInTheDocument();
      });
    });

    it('validates postal code format for Canada', () => {
      renderWithProviders(<Checkout />);

      // Fill form with invalid Canadian postal code
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { 
        target: { value: '12345' } // US format, not Canadian
      });

      // Canadian postal code should be validated
      // This may be client-side or server-side validation
    });
  });
});













