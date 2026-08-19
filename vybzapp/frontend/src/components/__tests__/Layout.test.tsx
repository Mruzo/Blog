import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import { CartProvider } from '../../contexts/CartContext';
import { GuideProvider } from '../../contexts/GuideContext';

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    authInitialized: true,
  }),
}));

// Mock CartContext
jest.mock('../../contexts/CartContext', () => ({
  ...jest.requireActual('../../contexts/CartContext'),
  useCart: () => ({
    cartItems: [],
    totalPrice: 0,
    cartCount: 0,
    cartInitialized: true,
    updateQuantity: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    isLoading: false
  })
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <GuideProvider>
        <CartProvider>
          {component}
        </CartProvider>
      </GuideProvider>
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

      const loginLinks = screen.getAllByRole('link', { name: /login/i });
      expect(loginLinks.length).toBeGreaterThanOrEqual(1);
      const loginButton = loginLinks.find((link) => link.id === 'login-btn') ?? loginLinks[0];
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

      const loginLinks = screen.getAllByRole('link', { name: /login/i });
      expect(loginLinks.length).toBeGreaterThanOrEqual(1);
      const loginButton = loginLinks.find((link) => link.id === 'login-btn') ?? loginLinks[0];
      const icon = loginButton.querySelector('.fa-sign-in-alt');
      expect(icon).toBeInTheDocument();
    });

    it('login button navigates to /login/ when clicked', () => {
      renderWithProviders(
        <Layout user={null}>
          <div>Test Content</div>
        </Layout>
      );

      const loginLinks = screen.getAllByRole('link', { name: /login/i });
      expect(loginLinks.length).toBeGreaterThanOrEqual(1);
      const loginButton = loginLinks.find((link) => link.id === 'login-btn') ?? loginLinks[0];
      expect(loginButton).toHaveAttribute('href', '/login/');
    });

    it('clicking login button navigates to login page', () => {
      const { container } = renderWithProviders(
        <Layout user={null}>
          <div>Test Content</div>
        </Layout>
      );

      const loginLinks = screen.getAllByRole('link', { name: /login/i });
      expect(loginLinks.length).toBeGreaterThanOrEqual(1);
      const loginButton = loginLinks.find((link) => link.id === 'login-btn') ?? loginLinks[0];
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
      expect(loginButton).toBeNull();
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

      expect(screen.getAllByRole('link', { name: /stories/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /studios/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /store/i }).length).toBeGreaterThanOrEqual(1);
    });
  });
});

