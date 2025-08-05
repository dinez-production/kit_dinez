import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

const CART_STORAGE_KEY = 'kit-canteen-cart';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          console.log("Loading cart from localStorage:", parsedCart);
          setCart(parsedCart);
        }
      } catch (error) {
        console.error("Failed to load cart from localStorage:", error);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    };
    
    loadCart();
  }, []);

  // Save cart to localStorage and trigger custom event when cart changes
  useEffect(() => {
    console.log("Saving cart to localStorage:", cart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    // Dispatch custom event to sync across components
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  }, [cart]);

  const addToCart = useCallback((item: { id: number; name: string; price: number }) => {
    console.log("Adding to cart:", item);
    
    setCart(currentCart => {
      console.log("Current cart in addToCart:", currentCart);
      const existingItemIndex = currentCart.findIndex(cartItem => cartItem.id === item.id);
      
      let newCart: CartItem[];
      if (existingItemIndex >= 0) {
        // Item exists, increment quantity
        newCart = currentCart.map((cartItem, index) =>
          index === existingItemIndex
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        // New item, add to cart
        newCart = [...currentCart, { ...item, quantity: 1 }];
      }
      
      console.log("New cart after adding:", newCart);
      return newCart;
    });

    toast({
      title: "Added to Cart",
      description: `${item.name} added to your cart`,
    });
  }, [toast]);

  const removeFromCart = useCallback((itemId: number) => {
    setCart(currentCart => currentCart.filter(item => item.id !== itemId));
    toast({
      title: "Item Removed",
      description: "Item has been removed from your cart",
    });
  }, [toast]);

  const updateQuantity = useCallback((itemId: number, newQuantity: number) => {
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

  const decreaseQuantity = useCallback((itemId: number) => {
    setCart(currentCart => {
      const item = currentCart.find(cartItem => cartItem.id === itemId);
      if (item) {
        if (item.quantity > 1) {
          return currentCart.map(cartItem =>
            cartItem.id === itemId
              ? { ...cartItem, quantity: cartItem.quantity - 1 }
              : cartItem
          );
        } else {
          return currentCart.filter(cartItem => cartItem.id !== itemId);
        }
      }
      return currentCart;
    });
  }, []);

  const getCartQuantity = useCallback((itemId: number) => {
    const item = cart.find(cartItem => cartItem.id === itemId);
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

  return {
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
}