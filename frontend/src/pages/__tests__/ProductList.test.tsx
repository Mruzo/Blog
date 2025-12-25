import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductList from '../ProductList';
import { CartProvider } from '../../contexts/CartContext';

// Mock fetch
global.fetch = jest.fn();

const mockProducts = [
  {
    uuid: 'product-1',
    title: 'Test Product 1',
    slug: 'test-product-1',
    description: 'Test description',
    price: 29.99,
    discount_percentage: 0,
    discounted_price: 29.99,
    available: true,
    stock: 10,
    images: [
      {
        id: 1,
        image: 'http://example.com/image1.jpg',
        caption: 'Image 1',
        alt_text: 'Image 1'
      }
    ]
  }
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <CartProvider>
        {component}
      </CartProvider>
    </BrowserRouter>
  );
};

describe('ProductList', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders loading spinner initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<ProductList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders products after loading', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockProducts })
    });

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Add to cart')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('renders product images correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockProducts })
    });

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      const images = screen.getAllByAltText('Image 1');
      expect(images.length).toBeGreaterThan(0);
    });
  });

  it('displays discounted price when discount exists', async () => {
    const discountedProduct = {
      ...mockProducts[0],
      discount_percentage: 10,
      discounted_price: 26.99,
      price: 29.99
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [discountedProduct] })
    });

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText(/C\$26.99/i)).toBeInTheDocument();
      expect(screen.getByText(/C\$29.99/i)).toBeInTheDocument();
    });
  });
});




