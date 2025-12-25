import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import PasswordReset from '../pages/PasswordReset';
import PasswordResetDone from '../pages/PasswordResetDone';
import { ApiProvider } from '../contexts/ApiContext';
import { CartProvider } from '../contexts/CartContext';

// Mock fetch
global.fetch = jest.fn();

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock API context
jest.mock('../contexts/ApiContext', () => ({
  ...jest.requireActual('../contexts/ApiContext'),
  useApi: () => ({
    login: jest.fn(),
    currentUser: null,
    loadStories: jest.fn(),
    loadPublicStories: jest.fn(),
    isLoading: false,
    error: null
  })
}));

// Mock CartContext
jest.mock('../contexts/CartContext', () => ({
  ...jest.requireActual('../contexts/CartContext'),
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

const renderApp = () => {
  return render(
    <BrowserRouter>
      <ApiProvider>
        <CartProvider>
          <Layout user={null}>
            <Routes>
              <Route path="/login/" element={<Login />} />
              <Route path="/password-reset/" element={<PasswordReset />} />
              <Route path="/password-reset/done/" element={<PasswordResetDone />} />
            </Routes>
          </Layout>
        </CartProvider>
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Forgot Password Flow Integration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it('user can click forgot password link from login page', () => {
    // Start at login page
    window.history.pushState({}, 'Login', '/login/');
    renderApp();

    // Find forgot password link
    const forgotPasswordLink = screen.getByText(/Forgot your Password/i).closest('a');
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/password-reset/');
  });

  it('complete forgot password flow: login -> forgot password -> submit email -> done page', async () => {
    // Start at login page
    window.history.pushState({}, 'Login', '/login/');
    renderApp();

    // Step 1: Click forgot password link
    const forgotPasswordLink = screen.getByText(/Forgot your Password/i).closest('a');
    expect(forgotPasswordLink).toBeInTheDocument();
    
    // Navigate to password reset page
    fireEvent.click(forgotPasswordLink!);

    // Step 2: Wait for password reset form to appear
    await waitFor(() => {
      expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    // Step 3: Fill in email
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Step 4: Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200
    });

    // Step 5: Submit form
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    // Step 6: Verify API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/password-reset/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    // Step 7: Verify navigation to done page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/password-reset/done/');
    });
  });

  it('forgot password link is visible on login page', () => {
    window.history.pushState({}, 'Login', '/login/');
    renderApp();

    expect(screen.getByText(/Forgot your Password/i)).toBeInTheDocument();
  });

  it('password reset form validates email format', async () => {
    window.history.pushState({}, 'Password Reset', '/password-reset/');
    renderApp();

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeRequired();
  });

  it('shows loading state during password reset request', async () => {
    window.history.pushState({}, 'Password Reset', '/password-reset/');
    renderApp();

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    // Mock a slow API response
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    fireEvent.change(screen.getByLabelText(/email address/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/Sending/i)).toBeInTheDocument();
    });
  });

  it('displays error message if password reset request fails', async () => {
    window.history.pushState({}, 'Password Reset', '/password-reset/');
    renderApp();

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    fireEvent.change(screen.getByLabelText(/email address/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/An error occurred/i)).toBeInTheDocument();
    });
  });
});



