import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { ArrowLeft, Search, Star, Clock, Plus, Loader2, ChefHat, Filter } from "lucide-react";
import BottomNavigation from "./BottomNavigation";
import type { MenuItem, Category } from "@shared/schema";

export default function ViewAllQuickPicksPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { addToCart, getCartQuantity } = useCart();

  // Fetch real data from database
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      return response.json();
    },
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const response = await fetch('/api/menu');
      if (!response.ok) {
        throw new Error(`Failed to fetch menu items: ${response.status}`);
      }
      return response.json();
    },
  });

  const isLoading = categoriesLoading || menuItemsLoading;

  // Transform menu items to quick picks format
  const quickPickItems = menuItems
    .filter(item => item.available)
    .map(item => ({
      id: item.id.toString(),
      name: item.name,
      price: item.price,
      category: categories.find(cat => cat.id === item.categoryId)?.name || "General"
    }));

  const filteredItems = quickPickItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (item: typeof quickPickItems[0]) => {
    addToCart({
      id: item.id, // Keep as string (MongoDB ObjectId)
      name: item.name,
      price: item.price,
      isVegetarian: false // Default value for quick picks
    });
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary px-4 pt-12 pb-6">
          <div className="flex items-center justify-between mb-4">
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
                <h1 className="text-xl font-bold text-white">Quick Picks</h1>
                <p className="text-white/80 text-sm">Fast & delicious options</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <BottomNavigation currentPage="home" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
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
              <h1 className="text-xl font-bold text-white">Quick Picks</h1>
              <p className="text-white/80 text-sm">Fast & delicious options</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white">
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
          />
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-3">
        {/* Results header */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} items available
            </p>
            <Button 
              size="sm" 
              onClick={() => setLocation("/cart")}
              className="bg-primary hover:bg-primary/90"
            >
              View Cart
            </Button>
          </div>
        </div>

        {/* Menu items */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {menuItems.length === 0 ? "No Menu Items Available" : "No items found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {menuItems.length === 0 
                ? "Check back later for delicious food options!" 
                : "Try searching for something else"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-lg">🍽️</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-lg font-bold">₹{item.price}</p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                        <span className="bg-muted px-2 py-1 rounded text-xs">
                          {item.category}
                        </span>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Available now
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Available now
                        </span>
                        <div className="flex items-center space-x-2">
                          {getCartQuantity(item.id) > 0 && (
                            <span className="text-sm font-medium">
                              {getCartQuantity(item.id)} in cart
                            </span>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {getCartQuantity(item.id) > 0 
                              ? `ADD (${getCartQuantity(item.id)})` 
                              : 'ADD'
                            }
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation currentPage="home" />
    </div>
  );
}