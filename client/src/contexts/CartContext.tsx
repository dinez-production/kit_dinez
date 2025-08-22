import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isVegetarian: boolean;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: { id: string | number; name: string; price: number; isVegetarian: boolean }, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  decreaseQuantity: (itemId: string | number) => void;
  getCartQuantity: (itemId: string | number) => number;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'kit-canteen-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        
        // Validate cart items have string IDs (MongoDB ObjectIds)
        const isValidCart = Array.isArray(parsedCart) && 
          parsedCart.every(item => typeof item.id === 'string' && item.id.length > 10);
        
        if (isValidCart) {
          setCart(parsedCart);
        } else {
          // Clear invalid cart data (old number IDs)
          console.warn("Clearing invalid cart data with outdated ID format");
          localStorage.removeItem(CART_STORAGE_KEY);
          setCart([]);
        }
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  // Save cart to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((item: { id: string | number; name: string; price: number; isVegetarian: boolean }, quantity = 1) => {
    setCart(currentCart => {
      const itemId = item.id.toString(); // Ensure string ID
      const existingItemIndex = currentCart.findIndex(cartItem => cartItem.id === itemId);
      
      let newCart: CartItem[];
      if (existingItemIndex >= 0) {
        // Item exists, increase quantity
        newCart = currentCart.map((cartItem, index) =>
          index === existingItemIndex
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      } else {
        // New item, add to cart
        newCart = [...currentCart, { ...item, id: itemId, quantity }];
      }
      
      return newCart;
    });

    toast({
      title: "Added to Cart",
      description: `${item.name} ${quantity > 1 ? `(×${quantity})` : ''} added to your cart`,
    });
  }, [toast]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(currentCart => currentCart.filter(item => item.id !== itemId));
    toast({
      title: "Item Removed",
      description: "Item has been removed from your cart",
    });
  }, [toast]);

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(currentCart =>
      currentCart.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, [removeFromCart]);

  const decreaseQuantity = useCallback((itemId: string | number) => {
    const id = itemId.toString();
    setCart(currentCart => {
      const item = currentCart.find(cartItem => cartItem.id === id);
      if (item) {
        if (item.quantity > 1) {
          return currentCart.map(cartItem =>
            cartItem.id === id
              ? { ...cartItem, quantity: cartItem.quantity - 1 }
              : cartItem
          );
        } else {
          return currentCart.filter(cartItem => cartItem.id !== id);
        }
      }
      return currentCart;
    });
  }, []);

  const getCartQuantity = useCallback((itemId: string | number) => {
    const id = itemId.toString();
    const item = cart.find(cartItem => cartItem.id === id);
    return item ? item.quantity : 0;
  }, [cart]);

  const getTotalItems = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const getTotalPrice = useCallback(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const value: CartContextType = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    decreaseQuantity,
    getCartQuantity,
    getTotalItems,
    getTotalPrice,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}