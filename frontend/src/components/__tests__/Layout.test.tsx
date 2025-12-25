import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import { CartProvider } from '../../contexts/CartContext';

// Mock CartContext
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <CartProvider>
        {component}
      </CartProvider>
    </BrowserRouter>
  );
};

describe('Layout', () => {
  describe('Login Button', () => {
    it('renders login button when user is not authenticated', () => {
      renderWithProviders(
        <Layout user={null}>
          <div>Test Content</div>
        </Layout>
      );

      const loginButton = screen.getByRole('link', { name: /login/i });
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveAttribute('href', '/login/');
      expect(loginButton).toHaveAttribute('id', 'login-btn');
    });

    it('login button has correct icon', () => {
      renderWithProviders(
        <Layout user={null}>
          <div>Test Content</div>
        </Layout>
      );

      const loginButton = screen.getByRole('link', { name: /login/i });
      const icon = loginButton.querySelector('.fa-sign-in-alt');
      expect(icon).toBeInTheDocument();
    });

    it('login button navigates to /login/ when clicked', () => {
      renderWithProviders(
        <Layout user={null}>
          <div>Test Content</div>
        </Layout>
      );

      const loginButton = screen.getByRole('link', { name: /login/i });
      expect(loginButton).toHaveAttribute('href', '/login/');
    });

    it('clicking login button navigates to login page', () => {
      const { container } = renderWithProviders(
        <Layout user={null}>
          <div>Test Content</div>
        </Layout>
      );

      const loginButton = screen.getByRole('link', { name: /login/i });
      expect(loginButton).toHaveAttribute('href', '/login/');
      
      // Verify it's a Link component that will navigate
      expect(loginButton.tagName).toBe('A');
    });

    it('does not render login button when user is authenticated', () => {
      renderWithProviders(
        <Layout user={{ first_name: 'John', username: 'john' }}>
          <div>Test Content</div>
        </Layout>
      );

      const loginButton = screen.queryByRole('link', { name: /login/i });
      expect(loginButton).not.toBeInTheDocument();
    });

    it('renders profile button when user is authenticated', () => {
      renderWithProviders(
        <Layout user={{ first_name: 'John', username: 'john' }}>
          <div>Test Content</div>
        </Layout>
      );

      const profileButton = screen.getByRole('link', { name: /john|profile/i });
      expect(profileButton).toBeInTheDocument();
      expect(profileButton).toHaveAttribute('id', 'profile-btn');
    });
  });

  describe('Navigation', () => {
    it('renders navigation links', () => {
      renderWithProviders(
        <Layout user={null}>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByRole('link', { name: /stories/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /studios/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /store/i })).toBeInTheDocument();
    });
  });
});

