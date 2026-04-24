import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import { snmovApiUrl } from '../utils/snmovApi';

interface ProductImage {
  id: number;
  image: string;
  caption: string;
  alt_text: string;
}

interface Product {
  uuid: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  discount_percentage: number;
  discounted_price: number;
  available: boolean;
  stock: number;
  images: ProductImage[];
}

interface ProductListProps {
  // Add any props if needed
}

/** Must match exactly one SiteImage.caption in admin (case-insensitive on server). */
const STORE_CATALOG_HERO_CAPTION = 'STORE_CATALOG_HERO';

/** Per-SKU close-up: SiteImage.caption must be exactly `STORE_CLOSEUP:<product-slug>` for that product row. */
const STORE_CLOSEUP_PREFIX = 'STORE_CLOSEUP:';

/** Insight pair (full mat vs covered): captions `STORE_INSIGHT_FULL:<slug>` and `STORE_INSIGHT_COVERED:<slug>`. */
const STORE_INSIGHT_FULL_PREFIX = 'STORE_INSIGHT_FULL:';
const STORE_INSIGHT_COVERED_PREFIX = 'STORE_INSIGHT_COVERED:';

/** Buy grid — “Premium feel” card: caption `STORE_BENEFIT_TEXTURE:<slug>`. */
const STORE_BENEFIT_TEXTURE_PREFIX = 'STORE_BENEFIT_TEXTURE:';

interface SiteImageHeroPayload {
  id: number;
  token: string;
  image: string;
  caption: string;
}

/** Full-bleed black strip: exact coupon description, marquee when it overflows. */
const StorefrontCouponBillboard: React.FC<{ text: string }> = ({ text }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const [durationSec, setDurationSec] = useState(20);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq || typeof mq.addEventListener !== 'function') return;
    const sync = () => setReducedMotion(Boolean(mq.matches));
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const m = measureRef.current;
    if (!outer || !m) return;
    const textW = m.scrollWidth;
    const outerW = outer.clientWidth;
    const overflow = textW > outerW + 1;
    setNeedsMarquee(overflow);
    const pxPerSec = 48;
    setDurationSec(Math.max(14, (textW + outerW) / pxPerSec));
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, text]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const scrollableReduced = reducedMotion && needsMarquee;

  return (
    <div
      ref={outerRef}
      data-testid="storefront-coupon-billboard"
      className={`storefront-coupon-billboard font-quicksand${scrollableReduced ? ' storefront-coupon-billboard--scrollable' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span ref={measureRef} className="storefront-coupon-billboard__measure">
        {text}
      </span>

      {needsMarquee && !reducedMotion && (
        <div
          className="storefront-coupon-billboard__track"
          style={{ animationDuration: `${durationSec}s` }}
        >
          <span className="storefront-coupon-billboard__segment">{text}</span>
          <span className="storefront-coupon-billboard__segment" aria-hidden>
            {text}
          </span>
        </div>
      )}

      {needsMarquee && reducedMotion && (
        <div className="storefront-coupon-billboard__static" style={{ textAlign: 'left', width: 'max-content', minWidth: '100%' }}>
          {text}
        </div>
      )}

      {!needsMarquee && (
        <div className="storefront-coupon-billboard__static">{text}</div>
      )}
    </div>
  );
};

const ProductList: React.FC<ProductListProps> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [heroSiteImage, setHeroSiteImage] = useState<SiteImageHeroPayload | null>(null);
  const [closeupSiteImage, setCloseupSiteImage] = useState<SiteImageHeroPayload | null>(null);
  const [insightFullSiteImage, setInsightFullSiteImage] = useState<SiteImageHeroPayload | null>(null);
  const [insightCoveredSiteImage, setInsightCoveredSiteImage] = useState<SiteImageHeroPayload | null>(null);
  const [benefitTextureSiteImage, setBenefitTextureSiteImage] = useState<SiteImageHeroPayload | null>(null);
  const [storefrontCouponDescription, setStorefrontCouponDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const { addToCart, cartItems } = useCart();
  const buySectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const featuredProduct = useMemo(() => products.find((p) => p.available) || products[0] || null, [products]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ token: STORE_CATALOG_HERO_CAPTION });
        const res = await fetch(snmovApiUrl(`site-images/by-caption/?${qs.toString()}`));
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SiteImageHeroPayload;
        if (cancelled) return;
        if (data?.image) {
          setHeroSiteImage(data);
        }
      } catch {
        /* ignore hero image fetch failures; placeholder remains */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCloseupSiteImage(null);
      if (!featuredProduct?.slug) return;

      const token = `${STORE_CLOSEUP_PREFIX}${featuredProduct.slug}`;
      try {
        const qs = new URLSearchParams({
          token,
          product_slug: featuredProduct.slug,
        });
        const res = await fetch(snmovApiUrl(`site-images/by-caption/?${qs.toString()}`));
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SiteImageHeroPayload;
        if (cancelled) return;
        if (data?.image) {
          setCloseupSiteImage(data);
        }
      } catch {
        /* ignore close-up fetch failures; placeholder remains */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featuredProduct?.slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInsightFullSiteImage(null);
      if (!featuredProduct?.slug) return;

      const token = `${STORE_INSIGHT_FULL_PREFIX}${featuredProduct.slug}`;
      try {
        const qs = new URLSearchParams({
          token,
          product_slug: featuredProduct.slug,
        });
        const res = await fetch(snmovApiUrl(`site-images/by-caption/?${qs.toString()}`));
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SiteImageHeroPayload;
        if (cancelled) return;
        if (data?.image) {
          setInsightFullSiteImage(data);
        }
      } catch {
        /* ignore insight image fetch failures; placeholder remains */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featuredProduct?.slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInsightCoveredSiteImage(null);
      if (!featuredProduct?.slug) return;

      const token = `${STORE_INSIGHT_COVERED_PREFIX}${featuredProduct.slug}`;
      try {
        const qs = new URLSearchParams({
          token,
          product_slug: featuredProduct.slug,
        });
        const res = await fetch(snmovApiUrl(`site-images/by-caption/?${qs.toString()}`));
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SiteImageHeroPayload;
        if (cancelled) return;
        if (data?.image) {
          setInsightCoveredSiteImage(data);
        }
      } catch {
        /* ignore insight image fetch failures; placeholder remains */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featuredProduct?.slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBenefitTextureSiteImage(null);
      if (!featuredProduct?.slug) return;

      const token = `${STORE_BENEFIT_TEXTURE_PREFIX}${featuredProduct.slug}`;
      try {
        const qs = new URLSearchParams({
          token,
          product_slug: featuredProduct.slug,
        });
        const res = await fetch(snmovApiUrl(`site-images/by-caption/?${qs.toString()}`));
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SiteImageHeroPayload;
        if (cancelled) return;
        if (data?.image) {
          setBenefitTextureSiteImage(data);
        }
      } catch {
        /* ignore benefit image fetch failures; placeholder remains */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featuredProduct?.slug]);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (els.length === 0) return;

    // Respect reduced motion automatically (no fancy scroll reveals).
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      !!window.matchMedia('(prefers-reduced-motion: reduce)')?.matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [products.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(snmovApiUrl('coupons/featured/'));
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.active && data.coupon) {
          const raw = (data.coupon.description ?? '').toString();
          const trimmed = raw.trim();
          if (trimmed) {
            setStorefrontCouponDescription(trimmed);
          } else {
            setStorefrontCouponDescription(null);
          }
        } else if (!cancelled) {
          setStorefrontCouponDescription(null);
        }
      } catch {
        /* ignore promo fetch failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(snmovApiUrl('products/'));
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.results || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string, quantity: number = 1) => {
    try {
      // Check current cart quantity for this product
      const existingItem = cartItems.find(item => item.uuid === productId);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      const newQuantity = currentQuantity + quantity;
      
      // Enforce maximum of 4 items per product
      if (newQuantity > 4) {
        const maxAllowed = 4 - currentQuantity;
        if (maxAllowed <= 0) {
          setMessage('Maximum of 4 items per product allowed. You already have 4 in your cart.');
        } else {
          setMessage(`Maximum of 4 items per product allowed. You can add ${maxAllowed} more.`);
        }
        setMessageType('warning');
        setShowMessage(true);
        return;
      }
      
      await addToCart(productId, quantity);
      setMessage('Product added to cart successfully!');
      setMessageType('success');
      setShowMessage(true);
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      // Extract error message from API response
      let errorMessage = 'Failed to add product to cart';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const currentQty = featuredProduct
    ? cartItems.find((i) => i.uuid === featuredProduct.uuid)?.quantity ?? 0
    : 0;
  const isMaxReached = currentQty >= 4;
  const priceDisplay = (p: Product) => {
    const priceNum = Number((p as any).price);
    const discountedNum = Number((p as any).discounted_price);
    const safePrice = Number.isFinite(priceNum) ? priceNum : 0;
    const safeDiscounted = Number.isFinite(discountedNum) ? discountedNum : safePrice;
    const pct = Number((p as any).discount_percentage) || 0;

    if (pct > 0) {
      return (
        <>
          <span className="product-landing__priceNow">C${safeDiscounted.toFixed(2)}</span>
          <span className="product-landing__priceWas">C${safePrice.toFixed(2)}</span>
          <span className="product-landing__priceBadge">-{pct}%</span>
        </>
      );
    }
    return <span className="product-landing__priceNow">C${safePrice.toFixed(2)}</span>;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container text-center p-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      {storefrontCouponDescription && (
        <StorefrontCouponBillboard text={storefrontCouponDescription} />
      )}
      <div className="product-landing">
        <MessagePopup
          message={message}
          type={messageType}
          show={showMessage}
          onClose={handleCloseMessage}
          duration={3000}
        />

        {/* 1) Hero */}
        <section className="product-landing__section product-landing__hero" data-reveal>
          <div className="product-landing__container">
            <div className="product-landing__heroGrid">
              <div className="product-landing__heroCopy">
                <p className="product-landing__eyebrow">Desk mat</p>
                <h2 className="product-landing__h1">Designed for what you see</h2>
                <p className="product-landing__lead">
                A desk mat that brings subtle vibrance and comfort to the parts of your workspace that actually stay visible.
                </p>
                <div className="product-landing__ctaRow">
                  <button
                    type="button"
                    className="product-landing__ctaPrimary"
                    onClick={() => buySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    Shop desk mat
                  </button>
                  <button
                    type="button"
                    className="product-landing__ctaGhost"
                    onClick={() => document.getElementById('product-insight')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    See more
                  </button>
                </div>
              </div>
              <div className="product-landing__heroVisual" aria-label="Hero image">
                <div className="product-landing__imagePlaceholder product-landing__imagePlaceholder--hero">
                  {heroSiteImage ? (
                    <img
                      className="product-landing__heroImg"
                      src={heroSiteImage.image}
                      alt={heroSiteImage.caption || 'Store catalog hero image'}
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <div className="product-landing__placeholderLabel">
                      Hero: create a Site image whose caption is exactly “{STORE_CATALOG_HERO_CAPTION}”
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2) Insight */}
        <section id="product-insight" className="product-landing__section" data-reveal>
          <div className="product-landing__container">
            <div className="product-landing__twoCol">
              <div className="product-landing__imagePlaceholder product-landing__imagePlaceholder--insight">
                {insightFullSiteImage ? (
                  <img
                    className="product-landing__productImg"
                    src={insightFullSiteImage.image}
                    alt={
                      featuredProduct
                        ? `${featuredProduct.title} — desk mat visible (uncovered)`
                        : 'Desk mat visible (uncovered)'
                    }
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="product-landing__placeholderLabel">
                    {featuredProduct?.slug
                      ? `Insight (full mat): set a Site image caption to “${STORE_INSIGHT_FULL_PREFIX}${featuredProduct.slug}” (linked to this product)`
                      : 'Insight (full mat): add an available product to configure SKU-scoped insight tokens'}
                  </div>
                )}
              </div>
              <div className="product-landing__imagePlaceholder product-landing__imagePlaceholder--insight">
                {insightCoveredSiteImage ? (
                  <img
                    className="product-landing__productImg"
                    src={insightCoveredSiteImage.image}
                    alt={
                      featuredProduct
                        ? `${featuredProduct.title} — desk mat mostly covered by keyboard and mouse`
                        : 'Desk mat mostly covered by keyboard and mouse'
                    }
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="product-landing__placeholderLabel">
                    {featuredProduct?.slug
                      ? `Insight (covered mat): set a Site image caption to “${STORE_INSIGHT_COVERED_PREFIX}${featuredProduct.slug}” (linked to this product)`
                      : 'Insight (covered mat): add an available product to configure SKU-scoped insight tokens'}
                  </div>
                )}
              </div>
              <div className="product-landing__twoColCopy">
                <h3 className="product-landing__h2">Most desk mats are designed inefficiently.</h3>
                <p className="product-landing__body">
                When you actually use a desk mat, your keyboard and mouse cover most of the mat's surface.
                So why is every inch designed the same?.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3) Visual Proof */}
        {/* <section className="product-landing__section" data-reveal>
          <div className="product-landing__container">
            <div className="product-landing__proof">
              <div className="product-landing__proofVisual product-landing__imagePlaceholder">
                <div className="product-landing__placeholderLabel">
                  Image placeholder: annotated top-down view (covered area vs visible area)
                </div>
                <div className="product-landing__proofTag product-landing__proofTag--a">Covered area</div>
                <div className="product-landing__proofTag product-landing__proofTag--b">Visible area</div>
              </div>
              <div className="product-landing__proofCopy">
                <h3 className="product-landing__h2">Proof in one glance</h3>
                <p className="product-landing__body">
                  A simple overlay explains the coverage so customers understand the fit in under five seconds.
                </p>
              </div>
            </div>
          </div>
        </section> */}

        {/* 4) Product + Benefits */}
        <section ref={buySectionRef} className="product-landing__section product-landing__buy" data-reveal>
          <div className="product-landing__container">
            <div className="product-landing__buyHeader">
              <h3 className="product-landing__h2">Experience the Bliss</h3>
              <p className="product-landing__body">Premium feel, clean look, built for daily use.</p>
            </div>

            <div className="product-landing__buyGrid">
              <div className="product-landing__productCard">
                <div className="product-landing__productVisual product-landing__imagePlaceholder">
                  {closeupSiteImage ? (
                    <img
                      className="product-landing__productImg"
                      src={closeupSiteImage.image}
                      alt={featuredProduct ? `${featuredProduct.title} close-up` : 'Product close-up'}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="product-landing__placeholderLabel">
                      {featuredProduct?.slug
                        ? `Close-up: set a Site image caption to “${STORE_CLOSEUP_PREFIX}${featuredProduct.slug}” (linked to this product)`
                        : 'Close-up: add an available product to configure SKU-scoped close-up tokens'}
                    </div>
                  )}
                </div>
                <div className="product-landing__productMeta">
                  <div className="product-landing__productTitleRow">
                    <div className="product-landing__productTitle">
                      {featuredProduct ? featuredProduct.title : 'Deskmat'}
                    </div>
                    {featuredProduct && (
                      <div className="product-landing__price">{priceDisplay(featuredProduct)}</div>
                    )}
                  </div>
                  <ul className="product-landing__bullets">
                    <li>Focused design for a cleaner setup</li>
                    <li>Subtle vibrance without distraction</li>
                    <li>Smooth, comfortable surface for everyday use</li>
                    <li>Durable, high-quality build</li>
                  </ul>
                  <div className="product-landing__buyRow">
                    <button
                      className="product-landing__ctaPrimary"
                      type="button"
                      disabled={!featuredProduct || !featuredProduct.available || isMaxReached}
                      onClick={(e) => {
                        e.preventDefault();
                        if (featuredProduct && !isMaxReached) handleAddToCart(featuredProduct.uuid, 1);
                      }}
                      title={isMaxReached ? 'Maximum of 4 items per product' : 'Add to cart'}
                    >
                      {isMaxReached ? 'Max (4)' : 'Add to cart'}
                    </button>
                    <div className="product-landing__finePrint">
                      {featuredProduct?.available ? 'Ships after checkout.' : 'Unavailable'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="product-landing__benefitCard">
                <div className="product-landing__imagePlaceholder product-landing__imagePlaceholder--mini">
                  {benefitTextureSiteImage ? (
                    <img
                      className="product-landing__productImg"
                      src={benefitTextureSiteImage.image}
                      alt={
                        featuredProduct
                          ? `${featuredProduct.title} — premium feel, texture and material`
                          : 'Premium feel, texture and material'
                      }
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="product-landing__placeholderLabel">
                      {featuredProduct?.slug
                        ? `Premium feel: set a Site image caption to “${STORE_BENEFIT_TEXTURE_PREFIX}${featuredProduct.slug}” (linked to this product)`
                        : 'Premium feel: add an available product to configure SKU-scoped benefit tokens'}
                    </div>
                  )}
                </div>
                <h4 className="product-landing__h3">Premium feel, Clean edges</h4>
                <p className="product-landing__body">A surface that feels deliberate—smooth where it matters, stable where it counts.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5) Final CTA */}
        <section className="product-landing__section product-landing__final" data-reveal>
          <div className="product-landing__container product-landing__finalInner">
            <h3 className="product-landing__h2">Ready to upgrade your desk?</h3>
            <p className="product-landing__body">
              Keep it clean. Keep it visible. Make your setup feel intentional.
            </p>
            <button
              type="button"
              className="product-landing__ctaPrimary"
              onClick={() => buySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Get the desk mat
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default ProductList;
