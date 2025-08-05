import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('kit-canteen-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        // Failed to parse cart from localStorage - clear corrupted data
        localStorage.removeItem('kit-canteen-cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('kit-canteen-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: { id: number; name: string; price: number }) => {
    console.log("useCart addToCart called with:", item);
    console.log("Current cart before adding:", cart);
    
    setCart(prevCart => {
      console.log("Previous cart in setter:", prevCart);
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      
      let newCart;
      if (existingItem) {
        // Update quantity if item already exists
        newCart = prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        // Add new item to cart
        newCart = [...prevCart, { ...item, quantity: 1 }];
      }
      
      console.log("New cart after adding:", newCart);
      return newCart;
    });

    toast({
      title: "Added to Cart",
      description: `${item.name} added to your cart`,
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    toast({
      title: "Item Removed",
      description: "Item has been removed from your cart",
    });
  };

  const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const decreaseQuantity = (itemId: number) => {
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (item) {
      if (item.quantity > 1) {
        updateQuantity(itemId, item.quantity - 1);
      } else {
        removeFromCart(itemId);
      }
    }
  };

  const getCartQuantity = (itemId: number) => {
    const item = cart.find(cartItem => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('kit-canteen-cart');
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart",
    });
  };

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