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
  heroBody?: unknown;
  heroOk?: boolean;
  heroReject?: boolean;
  closeupBody?: unknown;
  closeupOk?: boolean;
  closeupReject?: boolean;
  insightFullBody?: unknown;
  insightFullOk?: boolean;
  insightFullReject?: boolean;
  insightCoveredBody?: unknown;
  insightCoveredOk?: boolean;
  insightCoveredReject?: boolean;
  benefitTextureBody?: unknown;
  benefitTextureOk?: boolean;
  benefitTextureReject?: boolean;
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
    heroBody = {
      id: 3,
      token: 'STORE_CATALOG_HERO',
      image: 'http://example.com/hero.jpg',
      caption: 'STORE_CATALOG_HERO',
    },
    heroOk = true,
    heroReject = false,
    closeupBody = (() => {
      const slug = (mockProducts[0] as any).slug as string;
      const token = `STORE_CLOSEUP:${slug}`;
      return {
        id: 99,
        token,
        image: 'http://example.com/closeup.jpg',
        caption: token,
      };
    })(),
    closeupOk = true,
    closeupReject = false,
    insightFullBody = (() => {
      const slug = (mockProducts[0] as any).slug as string;
      const token = `STORE_INSIGHT_FULL:${slug}`;
      return {
        id: 101,
        token,
        image: 'http://example.com/insight-full.jpg',
        caption: token,
      };
    })(),
    insightFullOk = true,
    insightFullReject = false,
    insightCoveredBody = (() => {
      const slug = (mockProducts[0] as any).slug as string;
      const token = `STORE_INSIGHT_COVERED:${slug}`;
      return {
        id: 102,
        token,
        image: 'http://example.com/insight-covered.jpg',
        caption: token,
      };
    })(),
    insightCoveredOk = true,
    insightCoveredReject = false,
    benefitTextureBody = (() => {
      const slug = (mockProducts[0] as any).slug as string;
      const token = `STORE_BENEFIT_TEXTURE:${slug}`;
      return {
        id: 103,
        token,
        image: 'http://example.com/benefit-texture.jpg',
        caption: token,
      };
    })(),
    benefitTextureOk = true,
    benefitTextureReject = false,
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

    if (url.includes('/api/site-images/by-caption/')) {
      const u = new URL(url, 'http://localhost');
      const token = (u.searchParams.get('token') || '').trim();

      if (token.toUpperCase() === 'STORE_CATALOG_HERO') {
        if (heroReject) return Promise.reject(new Error('Hero image fetch failed'));
        return Promise.resolve({ ok: heroOk, json: async () => heroBody });
      }

      if (token.toLowerCase().startsWith('store_closeup:')) {
        if (closeupReject) return Promise.reject(new Error('Close-up image fetch failed'));
        return Promise.resolve({ ok: closeupOk, json: async () => closeupBody });
      }

      if (token.toLowerCase().startsWith('store_insight_full:')) {
        if (insightFullReject) return Promise.reject(new Error('Insight full image fetch failed'));
        return Promise.resolve({ ok: insightFullOk, json: async () => insightFullBody });
      }

      if (token.toLowerCase().startsWith('store_insight_covered:')) {
        if (insightCoveredReject) return Promise.reject(new Error('Insight covered image fetch failed'));
        return Promise.resolve({ ok: insightCoveredOk, json: async () => insightCoveredBody });
      }

      if (token.toLowerCase().startsWith('store_benefit_texture:')) {
        if (benefitTextureReject) return Promise.reject(new Error('Benefit texture image fetch failed'));
        return Promise.resolve({ ok: benefitTextureOk, json: async () => benefitTextureBody });
      }

      return Promise.reject(new Error(`Unexpected site-images token in test: ${token}`));
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
      if (url.includes('/api/site-images/by-caption/')) {
        const u = new URL(url, 'http://localhost');
        const token = (u.searchParams.get('token') || '').trim();
        if (token.toUpperCase() === 'STORE_CATALOG_HERO') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 3,
              token: 'STORE_CATALOG_HERO',
              image: 'http://example.com/hero.jpg',
              caption: 'STORE_CATALOG_HERO',
            }),
          });
        }
        if (token.toLowerCase().startsWith('store_closeup:')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 99,
              token,
              image: 'http://example.com/closeup.jpg',
              caption: token,
            }),
          });
        }
        if (token.toLowerCase().startsWith('store_insight_full:')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 101,
              token,
              image: 'http://example.com/insight-full.jpg',
              caption: token,
            }),
          });
        }
        if (token.toLowerCase().startsWith('store_insight_covered:')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 102,
              token,
              image: 'http://example.com/insight-covered.jpg',
              caption: token,
            }),
          });
        }
        if (token.toLowerCase().startsWith('store_benefit_texture:')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 103,
              token,
              image: 'http://example.com/benefit-texture.jpg',
              caption: token,
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected site-images token in loading test: ${token}`));
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

  it('renders marketing hero, SKU close-up, insight pair, and premium-feel benefit when configured', async () => {
    installFetchRouter();

    renderWithProviders(<ProductList />);

    await waitFor(() => {
      expect(screen.getByAltText(/STORE_CATALOG_HERO/i)).toBeInTheDocument();
      expect(screen.getByAltText(/Test Product 1 close-up/i)).toBeInTheDocument();
      expect(
        screen.getByAltText(/Test Product 1 — desk mat visible \(uncovered\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByAltText(/Test Product 1 — desk mat mostly covered by keyboard and mouse/i)
      ).toBeInTheDocument();
      expect(
        screen.getByAltText(/Test Product 1 — premium feel, texture and material/i)
      ).toBeInTheDocument();
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
    expect(urls.filter((u) => u.includes('/api/site-images/by-caption/')).length).toBeGreaterThanOrEqual(5);
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
