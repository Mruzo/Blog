import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Home from '../pages/Home';
import { ApiProvider } from '../contexts/ApiContext';
import { CartProvider } from '../contexts/CartContext';

// Mock API context
const mockLogin = jest.fn();
const mockCurrentUser = null;

jest.mock('../contexts/ApiContext', () => ({
  ...jest.requireActual('../contexts/ApiContext'),
  useApi: () => ({
    login: mockLogin,
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
            </Routes>
          </Layout>
        </CartProvider>
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Login Flow Integration', () => {
  beforeEach(() => {
    mockLogin.mockClear();
    sessionStorage.clear();
  });

  it('user can click login button and see login form', () => {
    renderApp();

    // Find and click login button
    const loginButton = screen.getByRole('link', { name: /login/i });
    expect(loginButton).toBeInTheDocument();
    
    // Navigate to login page
    fireEvent.click(loginButton);

    // Verify login form is displayed
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('complete login flow: click button -> fill form -> submit -> success', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser', first_name: 'Test' }
    });

    renderApp();

    // Step 1: Click login button
    const loginButton = screen.getByRole('link', { name: /login/i });
    fireEvent.click(loginButton);

    // Step 2: Wait for login form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    // Step 3: Fill in login form
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });

    // Step 4: Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Step 5: Verify login API was called
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'testpass123');
    });
  });

  it('login form shows error on invalid credentials', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        data: {
          non_field_errors: ['Invalid username or password.']
        }
      }
    });

    renderApp();

    // Navigate to login
    const loginButton = screen.getByRole('link', { name: /login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Invalid username or password/i)).toBeInTheDocument();
    });
  });
});

