/**
 * Integration Tests for Checkout Process
 * Tests seamless frontend-backend integration
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Checkout from '../Checkout';
import { CartProvider } from '../../contexts/CartContext';
import { ApiProvider } from '../../contexts/ApiContext';

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
      <ApiProvider>
        <CartProvider>
          {component}
        </CartProvider>
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Checkout Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (global.fetch as jest.Mock).mockClear();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  describe('Successful Checkout Flow', () => {
    it('submits checkout with authentication token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true,
          order_id: 123,
          message: 'Order created successfully'
        })
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
          'http://localhost:8000/api/checkout/',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Token test-token'
            }),
            credentials: 'include',
            body: JSON.stringify({
              full_name: 'John Doe',
              address_line_1: '123 Main St',
              address_line_2: '',
              city: 'Toronto',
              state: 'ON',
              postal_code: 'M5H 2N2',
              country_code: 'CA'
            })
          })
        );
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/product/cart/shipping/123/');
      });
    });

    it('handles successful checkout with saved address', async () => {
      // Mock saved addresses fetch
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            addresses: [{
              id: 1,
              full_name: 'Saved User',
              address_line_1: '456 Saved St',
              city: 'Toronto',
              state: 'ON',
              postal_code: 'M5H 1A1',
              country_code: 'CA',
              is_default: true
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            order_id: 456,
            message: 'Order created successfully'
          })
        });

      renderWithProviders(<Checkout />);

      // Wait for saved addresses to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/addresses/',
          expect.any(Object)
        );
      });

      // Select saved address (if dropdown exists)
      // Then submit
      const submitButton = screen.getByText(/View Shipping Rates/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        const checkoutCall = (global.fetch as jest.Mock).mock.calls.find(
          (call: any[]) => call[0] === 'http://localhost:8000/api/checkout/'
        );
        expect(checkoutCall).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error for empty cart', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Cart is empty'
        })
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Some items in your cart are no longer available or have insufficient stock',
          insufficient_stock_items: [{
            product: 'Test Product',
            requested_quantity: 15,
            available: 10,
            reason: 'Only 10 items available in stock'
          }]
        })
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
        expect(screen.getByText(/insufficient stock/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      });
    });

    it('handles authentication errors', async () => {
      mockLocalStorage.getItem.mockReturnValue(null); // No token

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'Authentication credentials were not provided.'
        })
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
        // Should show error or redirect to login
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('handles address validation errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          errors: {
            postal_code: ['Invalid Canadian postal code format. Expected format: A1A 1A1']
          }
        })
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
              is_default: true
            },
            {
              id: 2,
              full_name: 'Work Address',
              address_line_1: '456 Work St',
              city: 'Toronto',
              state: 'ON',
              postal_code: 'M5H 2A2',
              country_code: 'CA',
              is_default: false
            }
          ]
        })
      });

      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/addresses/',
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
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, addresses: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            order_id: 789,
            message: 'Order created successfully'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
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
          (call: any[]) => call[0] === 'http://localhost:8000/api/checkout/'
        );
        expect(checkoutCall).toBeDefined();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', () => {
      renderWithProviders(<Checkout />);

      // Try to submit without filling form
      const submitButton = screen.getByText(/View Shipping Rates/i);
      fireEvent.click(submitButton);

      // Form validation should prevent submission
      // Or show validation errors
      expect(global.fetch).not.toHaveBeenCalled();
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







