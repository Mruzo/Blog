import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import Register from '../pages/Register';
import Login from '../pages/Login';
import Home from '../pages/Home';
import { ApiProvider } from '../contexts/ApiContext';
import { CartProvider } from '../contexts/CartContext';

// Mock API context
const mockRegister = jest.fn();
const mockCurrentUser = null;

jest.mock('../contexts/ApiContext', () => ({
  ...jest.requireActual('../contexts/ApiContext'),
  useApi: () => ({
    register: mockRegister,
    currentUser: mockCurrentUser,
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
              <Route path="/" element={<Home />} />
              <Route path="/login/" element={<Login />} />
              <Route path="/register/" element={<Register />} />
            </Routes>
          </Layout>
        </CartProvider>
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Register Flow Integration', () => {
  beforeEach(() => {
    mockRegister.mockClear();
  });

  it('user can click register link from login page and see registration form', () => {
    renderApp();

    // Navigate to login page first
    const loginButton = screen.getByRole('link', { name: /login/i });
    fireEvent.click(loginButton);

    // Wait for login form
    waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    // Find and click register link
    const registerLink = screen.getByText(/Register here/i).closest('a');
    expect(registerLink).toBeInTheDocument();
    
    // Navigate to register page
    fireEvent.click(registerLink!);

    // Verify registration form is displayed
    waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  it('complete registration flow: navigate -> fill form -> submit -> success', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'test-token',
      user: { 
        id: 1, 
        username: 'newuser', 
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User'
      },
      message: 'Registration successful. Please check your email to verify your account.',
      email_verification_required: true
    });

    renderApp();

    // Navigate to register page (via direct route or from login)
    const loginButton = screen.getByRole('link', { name: /login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    const registerLink = screen.getByText(/Register here/i).closest('a');
    fireEvent.click(registerLink!);

    // Wait for registration form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    // Fill in registration form
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Verify register API was called with correct data
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'newpass123',
        password2: 'newpass123',
        first_name: 'New',
        last_name: 'User',
        accept_terms: true
      });
    });

    // Verify success message appears
    await waitFor(() => {
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('registration form shows error when passwords do not match', async () => {
    renderApp();

    // Navigate to register page
    const loginButton = screen.getByRole('link', { name: /login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    const registerLink = screen.getByText(/Register here/i).closest('a');
    fireEvent.click(registerLink!);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    // Fill form with mismatched passwords
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'differentpass' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Verify error message appears and API was not called
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  it('registration form shows error when terms are not accepted', async () => {
    renderApp();

    // Navigate to register page
    const loginButton = screen.getByRole('link', { name: /login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    const registerLink = screen.getByText(/Register here/i).closest('a');
    fireEvent.click(registerLink!);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    // Fill form without accepting terms
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    // Don't check terms checkbox
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Verify error message appears and API was not called
    await waitFor(() => {
      expect(screen.getByText(/You must accept the Terms/i)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  it('registration form shows error on API failure', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Username already exists'
        }
      }
    });

    renderApp();

    // Navigate to register page
    const loginButton = screen.getByRole('link', { name: /login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    const registerLink = screen.getByText(/Register here/i).closest('a');
    fireEvent.click(registerLink!);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'existinguser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });
  });

  it('user can navigate back to login from register page', () => {
    renderApp();

    // Navigate to register page
    const loginButton = screen.getByRole('link', { name: /login/i });
    fireEvent.click(loginButton);

    waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    const registerLink = screen.getByText(/Register here/i).closest('a');
    fireEvent.click(registerLink!);

    waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    // Find and click login link
    const loginLink = screen.getByText(/Log in here/i).closest('a');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login/');
    
    fireEvent.click(loginLink!);

    // Verify login form is displayed
    waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });
});



