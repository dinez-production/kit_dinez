import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { VegIndicator } from "@/components/ui/VegIndicator";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import BottomNavigation from "./BottomNavigation";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MenuItem } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { cart, updateQuantity, removeFromCart, getTotalPrice, getTotalItems, clearCart } = useCart();
  const isMobile = useIsMobile();
  


  // Fetch menu items in case we need to display them
  const { data: menuItems = [], isLoading, refetch } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const response = await fetch('/api/menu');
      if (!response.ok) {
        throw new Error(`Failed to fetch menu items: ${response.status}`);
      }
      return response.json();
    },
  });

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await refetch();
  };

  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    updateQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = (itemId: number) => {
    removeFromCart(itemId);
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) {
      return;
    }
    setLocation("/checkout");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary px-4 pt-12 pb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/home")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">My Cart</h1>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <BottomNavigation currentPage="cart" />
      </div>
    );
  }

  return (
    <>
      <PullToRefresh
        onRefresh={handleRefresh}
        enabled={isMobile}
        threshold={80}
        className="min-h-screen bg-background pb-20"
      >
      {/* Header */}
      <div className="bg-primary px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/home")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">My Cart</h1>
              <p className="text-white/80 text-sm">
                {cart.length > 0 ? `${getTotalItems()} items` : "Your cart is empty"}
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white">
              ₹{getTotalPrice()}
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-3">
        {cart.length === 0 ? (
          // Empty Cart State
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-4">
                Looks like you haven't added any items to your cart yet
              </p>
              <Button onClick={() => setLocation("/home")}>
                Browse Menu
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3">
              {cart.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <span className="text-white text-lg">🍽️</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Delicious food item
                        </p>
                        <p className="text-lg font-bold">₹{item.price}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal ({getTotalItems()} items)</span>
                  <span>₹{getTotalPrice()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>₹0</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span>₹{Math.round(getTotalPrice() * 0.05)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{getTotalPrice() + Math.round(getTotalPrice() * 0.05)}</span>
                </div>
                <Button 
                  className="w-full mt-4" 
                  size="lg"
                  onClick={proceedToCheckout}
                >
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      </PullToRefresh>
      <BottomNavigation currentPage="cart" />
    </>
  );
}