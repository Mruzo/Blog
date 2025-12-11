import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  uuid: string;
  title: string;
  price: number;
  quantity: number;
  item_total: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  totalPrice: number;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        // Create a new array to ensure React detects the state change
        const items = [...(data.cart_items || [])];
        // Calculate cart count by summing all quantities
        const count = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
        const total = data.total_price || 0;
        
        // Update all state in a single batch
        setCartItems(items);
        setCartCount(count);
        setTotalPrice(total);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
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
          // Create a new array to ensure React detects the state change
          const items = [...(responseData.cart.cart_items || [])];
          const count = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
          const total = responseData.cart.total_price || 0;
          
          // Update all state in a single batch to ensure consistency
          setCartItems(items);
          setCartCount(count);
          setTotalPrice(total);
          
          // Log for debugging
          console.log('Cart updated:', { items, count, total });
        } else {
          // Fallback: fetch cart data (for backward compatibility)
          await fetchCart();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to add to cart' }));
        // Pass through detailed error message from backend
        const errorMessage = errorData.error || errorData.message || 'Failed to add to cart';
        throw new Error(errorMessage);
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
          // Create a new array to ensure React detects the state change
          // Map items to ensure UUIDs are strings and all fields are properly typed
          const items = (cartData.cart_items || []).map((item: any) => ({
            uuid: String(item.uuid),
            title: item.title,
            price: parseFloat(item.price) || 0,
            quantity: parseInt(String(item.quantity)) || 0, // Ensure quantity is parsed correctly
            item_total: parseFloat(item.item_total) || 0,
          }));
          const count = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
          const total = parseFloat(cartData.total_price) || 0;
          
          // Log detailed info for debugging
          console.log('Cart items from response:', cartData.cart_items);
          console.log('Processed items:', items);
          console.log('Cart updated from response:', { items, count, total, responseData });
          
          // Force state update by creating completely new objects
          setCartItems([...items]);
          setCartCount(count);
          setTotalPrice(total);
        } else {
          // Fallback: fetch cart data (for backward compatibility)
          console.log('Cart data not in expected format, fetching cart...', { cartData, responseData });
          await fetchCart();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update quantity' }));
        // Pass through detailed error message from backend
        const errorMessage = errorData.error || errorData.message || 'Failed to update quantity';
        throw new Error(errorMessage);
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
          // Create a new array to ensure React detects the state change
          const items = (cartData.cart_items || []).map((item: any) => ({
            uuid: String(item.uuid),
            title: item.title,
            price: parseFloat(item.price) || 0,
            quantity: parseInt(String(item.quantity)) || 0,
            item_total: parseFloat(item.item_total) || 0,
          }));
          const count = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
          const total = parseFloat(cartData.total_price) || 0;
          
          // Update all state in a single batch
          setCartItems([...items]);
          setCartCount(count);
          setTotalPrice(total);
          
          console.log('Item removed, cart updated:', { items, count, total });
        } else {
          // Fallback: fetch cart data
          await fetchCart();
        }
      } else {
        // Try to parse error response, but handle non-JSON responses (like 500 errors)
        let errorMessage = 'Failed to remove item';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON (e.g., HTML error page), use status text
          errorMessage = `Failed to remove item: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
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
      
      const response = await fetch('/api/cart/clear/', {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      
      if (response.ok) {
        await fetchCart(); // Refresh cart data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear cart');
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
    isLoading,
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
