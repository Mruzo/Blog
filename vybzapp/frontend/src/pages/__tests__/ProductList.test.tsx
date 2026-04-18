import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ProductList from '../ProductList';
import { CartProvider } from '../../contexts/CartContext';

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
        alt_text: 'Image 1',
      },
    ],
  },
];

interface FetchRouterOptions {
  productsBody?: unknown;
  productsOk?: boolean;
  productsError?: Error;
  featuredBody?: unknown;
  featuredOk?: boolean;
  featuredReject?: boolean;
  cartBody?: Record<string, unknown>;
}

/** Routes ProductList + CartProvider fetches (mirrors production URLs). */
function installFetchRouter(options: FetchRouterOptions = {}) {
  const {
    productsBody = { results: mockProducts },
    productsOk = true,
    productsError,
    featuredBody = { active: false, coupon: null },
    featuredOk = true,
    featuredReject = false,
    cartBody = { cart_items: [], total_price: 0 },
  } = options;

  (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : String(input);

    if (url.includes('/api/cart/add/')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          cart: {
            cart_items: [
              {
                uuid: mockProducts[0].uuid,
                title: mockProducts[0].title,
                price: mockProducts[0].price,
                quantity: 1,
                item_total: mockProducts[0].price,
              },
            ],
            total_price: mockProducts[0].price,
          },
        }),
      });
    }

    if (url.includes('/api/cart/')) {
      return Promise.resolve({
        ok: true,
        json: async () => cartBody,
      });
    }

    if (url.includes('/api/products/')) {
      if (productsError) {
        return Promise.reject(productsError);
      }
      return Promise.resolve({
        ok: productsOk,
        json: async () => productsBody,
      });
    }

    if (url.includes('/api/coupons/featured/')) {
      if (featuredReject) {
        return Promise.reject(new Error('Featured coupon fetch failed'));
      }
      return Promise.resolve({
        ok: featuredOk,
        json: async () => featuredBody,
      });
    }

    return Promise.reject(new Error(`Unexpected fetch URL in test: ${url}`));
  });
}

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <BrowserRouter>
      <CartProvider>{component}</CartProvider>
    </BrowserRouter>
  );

describe('ProductList', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders loading spinner initially', () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/api/products/')) {
        return new Promise(() => {});
      }
      if (url.includes('/api/cart/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ cart_items: [], total_price: 0 }),
        });
      }
      if (url.includes('/api/coupons/featured/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ active: false, coupon: null }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    renderWithProviders(<ProductList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders products after loading', async () => {
    installFetchRouter();

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Add to cart')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    installFetchRouter({ productsError: new Error('Failed to fetch') });

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('renders product images correctly', async () => {
    installFetchRouter();

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
      price: 29.99,
    };

    installFetchRouter({ productsBody: { results: [discountedProduct] } });

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText(/C\$26.99/i)).toBeInTheDocument();
      expect(screen.getByText(/C\$29.99/i)).toBeInTheDocument();
    });
  });
});

describe('ProductList — storefront featured coupon (API + Cart integration)', () => {
  const PROMO_DESCRIPTION = 'STOREFRONT_COUPON_TEST_LINE';

  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('requests products, cart, and featured coupon endpoints on mount', async () => {
    installFetchRouter({
      featuredBody: {
        active: true,
        coupon: { code: 'SAVE', description: PROMO_DESCRIPTION },
      },
    });

    renderWithProviders(<ProductList />);

    await waitFor(() => expect(screen.getByText('Test Product 1')).toBeInTheDocument());

    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/api/products/'))).toBe(true);
    expect(urls.some((u) => u.includes('/api/cart/'))).toBe(true);
    expect(urls.some((u) => u.includes('/api/coupons/featured/'))).toBe(true);
  });

  it('shows full-bleed billboard with trimmed coupon description when featured is active', async () => {
    installFetchRouter({
      featuredBody: {
        active: true,
        coupon: { code: 'SAVE', description: `  ${PROMO_DESCRIPTION}  ` },
      },
    });

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      expect(screen.getByTestId('storefront-coupon-billboard')).toBeInTheDocument();
    });

    expect(screen.getByTestId('storefront-coupon-billboard')).toHaveTextContent(PROMO_DESCRIPTION);
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
  });

  it('does not render billboard when featured API is inactive', async () => {
    installFetchRouter({
      featuredBody: { active: false, coupon: null },
    });

    renderWithProviders(<ProductList />);

    await waitFor(() => expect(screen.getByText('Test Product 1')).toBeInTheDocument());

    expect(screen.queryByTestId('storefront-coupon-billboard')).toBeNull();
  });

  it('does not render billboard when featured description is only whitespace', async () => {
    installFetchRouter({
      featuredBody: {
        active: true,
        coupon: { code: 'SAVE', description: '   \n\t  ' },
      },
    });

    renderWithProviders(<ProductList />);

    await waitFor(() => expect(screen.getByText('Test Product 1')).toBeInTheDocument());

    expect(screen.queryByTestId('storefront-coupon-billboard')).toBeNull();
  });

  it('still loads products when featured coupon fetch fails', async () => {
    installFetchRouter({ featuredReject: true });

    renderWithProviders(<ProductList />);

    await waitFor(() => expect(screen.getByText('Test Product 1')).toBeInTheDocument());

    expect(screen.queryByTestId('storefront-coupon-billboard')).toBeNull();
  });

  it('still loads products when featured response is not OK', async () => {
    installFetchRouter({ featuredOk: false, featuredBody: {} });

    renderWithProviders(<ProductList />);

    await waitFor(() => expect(screen.getByText('Test Product 1')).toBeInTheDocument());

    expect(screen.queryByTestId('storefront-coupon-billboard')).toBeNull();
  });

  it('keeps promo visible and cart POST works after Add to cart', async () => {
    installFetchRouter({
      featuredBody: {
        active: true,
        coupon: { code: 'SAVE', description: PROMO_DESCRIPTION },
      },
    });

    renderWithProviders(<ProductList />);

    await waitFor(() => expect(screen.getByText('Add to cart')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Add to cart'));

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const addCall = calls.find((c) => String(c[0]).includes('/api/cart/add/'));
      expect(addCall).toBeDefined();
      expect(addCall![1]).toEqual(expect.objectContaining({ method: 'POST' }));
    });

    expect(screen.getByTestId('storefront-coupon-billboard')).toHaveTextContent(PROMO_DESCRIPTION);
  });
});
