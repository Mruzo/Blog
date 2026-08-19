import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  uuid: string;
  title: string;
  price: number;
  quantity: number;
  item_total: number;
  list_price?: number;
  item_list_total?: number;
  item_sale_savings?: number;
  discount_percentage?: number;
}

interface CartTotals {
  listSubtotal: number;
  productSaleSavings: number;
  merchandiseSubtotal: number;
}

// Helper function to get CSRF token from cookies
function getCookie(name: string): string | null {
  let cookieValue: string | null = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/** Parse DRF `{ field: ["msg"] }`, `{ error: "..." }`, or non-JSON error responses. */
function parseCartApiErrorBody(
  body: unknown,
  response: Response,
  fallback: string
): string {
  if (response.status === 429) {
    const resetTime =
      body && typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>).reset_time
        : undefined;
    const base = 'Too many requests. Please wait a moment and try again.';
    if (typeof resetTime === 'number' && resetTime > 0 && Number.isFinite(resetTime)) {
      const mins = Math.ceil(resetTime / 60);
      if (mins >= 60) {
        const hours = Math.ceil(mins / 60);
        return `${base} You can try again in about ${hours} hour${hours === 1 ? '' : 's'}.`;
      }
      if (mins > 1) {
        return `${base} You can try again in about ${mins} minutes.`;
      }
      const secs = Math.ceil(resetTime);
      return `${base} You can try again in about ${secs} second${secs === 1 ? '' : 's'}.`;
    }
    return base;
  }

  if (body && typeof body === 'object' && body !== null) {
    const o = body as Record<string, unknown>;
    if (typeof o.error === 'string' && o.error.trim()) return o.error;
    if (typeof o.message === 'string' && o.message.trim()) return o.message;
    if (o.detail !== undefined) {
      return typeof o.detail === 'string' ? o.detail : JSON.stringify(o.detail);
    }
    for (const key of Object.keys(o)) {
      const v = o[key];
      if (Array.isArray(v) && v.length > 0 && v[0] != null) {
        return String(v[0]);
      }
    }
  }
  const suffix = response.status
    ? ` (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})`
    : '';
  return `${fallback}${suffix}`;
}

async function readResponseJsonOrNull(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  totalPrice: number;
  cartTotals: CartTotals;
  isLoading: boolean;
  cartInitialized: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [cartTotals, setCartTotals] = useState<CartTotals>({
    listSubtotal: 0,
    productSaleSavings: 0,
    merchandiseSubtotal: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cartInitialized, setCartInitialized] = useState<boolean>(false);

  const applyCartPayload = (data: {
    cart_items?: CartItem[];
    total_price?: number;
    list_subtotal?: number;
    product_sale_savings?: number;
    merchandise_subtotal?: number;
  }) => {
    const items = [...(data.cart_items || [])];
    const count = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
    const merchandise = data.merchandise_subtotal ?? data.total_price ?? 0;
    setCartItems(items);
    setCartCount(count);
    setTotalPrice(merchandise);
    setCartTotals({
      listSubtotal: data.list_subtotal ?? merchandise,
      productSaleSavings: data.product_sale_savings ?? 0,
      merchandiseSubtotal: merchandise,
    });
  };

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      const response = await fetch('/api/cart/', {
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        applyCartPayload(data);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setCartInitialized(true);
    }
  };

  const addToCart = async (productId: string, quantity: number = 1) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Add CSRF token for POST requests
      const csrfToken = getCookie('csrftoken') || 
                       document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch('/api/cart/add/', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ product_id: productId, quantity }),
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Use cart data directly from the response if available (more reliable on mobile)
        if (responseData.cart && responseData.cart.cart_items) {
          applyCartPayload(responseData.cart);
        } else {
          // Fallback: fetch cart data (for backward compatibility)
          await fetchCart();
        }
      } else {
        const errorData = await readResponseJsonOrNull(response);
        throw new Error(
          parseCartApiErrorBody(errorData, response, 'Failed to add to cart')
        );
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Add CSRF token for PUT requests
      const csrfToken = getCookie('csrftoken') || 
                       document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(`/api/cart/update/${productId}/`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Log response for debugging
        console.log('Update quantity response:', responseData);
        
        // Use cart data directly from the response if available (more reliable, especially on mobile)
        // The cart data can be nested under 'cart' key or directly in response
        const cartData = responseData.cart || responseData;
        
        if (cartData && cartData.cart_items) {
          const items = (cartData.cart_items || []).map((item: CartItem & Record<string, unknown>) => ({
            uuid: String(item.uuid),
            title: item.title,
            price: parseFloat(String(item.price)) || 0,
            quantity: parseInt(String(item.quantity), 10) || 0,
            item_total: parseFloat(String(item.item_total)) || 0,
            list_price: item.list_price != null ? parseFloat(String(item.list_price)) : undefined,
            item_list_total: item.item_list_total != null ? parseFloat(String(item.item_list_total)) : undefined,
            item_sale_savings: item.item_sale_savings != null ? parseFloat(String(item.item_sale_savings)) : undefined,
            discount_percentage: item.discount_percentage != null ? parseFloat(String(item.discount_percentage)) : undefined,
          }));
          applyCartPayload({ ...cartData, cart_items: items });
        } else {
          // Fallback: fetch cart data (for backward compatibility)
          console.log('Cart data not in expected format, fetching cart...', { cartData, responseData });
          await fetchCart();
        }
      } else {
        const errorData = await readResponseJsonOrNull(response);
        throw new Error(
          parseCartApiErrorBody(errorData, response, 'Failed to update quantity')
        );
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Add CSRF token for DELETE requests
      const csrfToken = getCookie('csrftoken') || 
                       document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(`/api/cart/remove/${productId}/`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Use cart data directly from the response if available (more reliable)
        const cartData = responseData.cart || responseData;
        
        if (cartData && cartData.cart_items) {
          const items = (cartData.cart_items || []).map((item: CartItem & Record<string, unknown>) => ({
            uuid: String(item.uuid),
            title: item.title,
            price: parseFloat(String(item.price)) || 0,
            quantity: parseInt(String(item.quantity), 10) || 0,
            item_total: parseFloat(String(item.item_total)) || 0,
            list_price: item.list_price != null ? parseFloat(String(item.list_price)) : undefined,
            item_sale_savings: item.item_sale_savings != null ? parseFloat(String(item.item_sale_savings)) : undefined,
          }));
          applyCartPayload({ ...cartData, cart_items: items });
        } else {
          // Fallback: fetch cart data
          await fetchCart();
        }
      } else {
        const errorData = await readResponseJsonOrNull(response);
        throw new Error(
          parseCartApiErrorBody(errorData, response, 'Failed to remove item')
        );
      }
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      
      // Add CSRF token for DELETE requests
      const csrfToken = getCookie('csrftoken') || 
                       document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch('/api/cart/clear/', {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      
      if (response.ok) {
        await fetchCart(); // Refresh cart data
      } else {
        const errorData = await readResponseJsonOrNull(response);
        throw new Error(
          parseCartApiErrorBody(errorData, response, 'Failed to clear cart')
        );
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCart = async () => {
    await fetchCart();
  };

  // Fetch cart on component mount
  useEffect(() => {
    fetchCart();
  }, []);

  // Refresh cart when user logs in (cart is preserved on backend)
  useEffect(() => {
    const handleCartRefresh = () => {
      fetchCart();
    };
    
    window.addEventListener('cart:refresh', handleCartRefresh);
    return () => {
      window.removeEventListener('cart:refresh', handleCartRefresh);
    };
  }, [fetchCart]);

  const value: CartContextType = {
    cartItems,
    cartCount,
    totalPrice,
    cartTotals,
    isLoading,
    cartInitialized,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
