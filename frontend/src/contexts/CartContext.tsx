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
      const response = await fetch('http://localhost:8000/api/cart/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const items = data.cart_items || [];
        setCartItems(items);
        // Calculate cart count by summing all quantities
        const count = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
        setCartCount(count);
        setTotalPrice(data.total_price || 0);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const addToCart = async (productId: string, quantity: number = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/cart/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ product_id: productId, quantity }),
      });
      
      if (response.ok) {
        await fetchCart(); // Refresh cart data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add to cart');
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
      const response = await fetch(`http://localhost:8000/api/cart/update/${productId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });
      
      if (response.ok) {
        await fetchCart(); // Refresh cart data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quantity');
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
      const response = await fetch(`http://localhost:8000/api/cart/remove/${productId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        await fetchCart(); // Refresh cart data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove item');
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
      const response = await fetch('http://localhost:8000/api/cart/clear/', {
        method: 'DELETE',
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
