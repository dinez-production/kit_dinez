import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuthSync } from "@/hooks/useDataSync";
import { Search, MapPin, Filter, Utensils, Coffee, Cookie, Pizza, Star, Clock, Flame, ThumbsUp, Users, Zap, ChefHat, Heart, Loader2 } from "lucide-react";
import BottomNavigation from "./BottomNavigation";
import type { MenuItem, Category } from "@shared/schema";

export default function HomeScreen() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuthSync();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState("delivery");
  const [searchQuery, setSearchQuery] = useState("");
  const { addToCart, getCartQuantity } = useCart();

  // Enhanced queries with real-time synchronization
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes for categories
    refetchOnMount: true,
    refetchOnWindowFocus: false,
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
    staleTime: 1000 * 60 * 5, // 5 minutes for menu items
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const isLoading = categoriesLoading || menuItemsLoading;

  // Get trending items from database
  const trendingItems = menuItems
    .filter(item => item.available)
    .slice(0, 3)
    .map(item => ({
      id: item.id.toString(),
      name: item.name,
      price: item.price
    }));

  // Get quick picks from database
  const quickPickItems = menuItems
    .filter(item => item.available)
    .slice(3, 6)
    .map(item => ({
      id: item.id.toString(),
      name: item.name,
      price: item.price
    }));

  // Map database categories to UI categories
  const displayCategories = categories.map(category => ({
    name: category.name,
    icon: Utensils, // Default icon, can be customized per category
    color: "bg-primary",
    route: `/menu/${category.name.toLowerCase()}`
  }));

  // Reviews will come from feedback system when implemented
  const reviews: any[] = [];

  // Stats calculated from actual database data
  const quickStats = [
    { icon: Clock, label: "Available", sublabel: "Order now" },
    { icon: Users, label: "0", sublabel: "Active orders" },
    { icon: ChefHat, label: menuItems.length.toString(), sublabel: "Menu items" },
    { icon: Star, label: categories.length.toString(), sublabel: "Categories" }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary px-4 pt-12 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-white" />
              <div>
                <p className="text-white font-medium">KIT College</p>
                <p className="text-white/80 text-sm">Main Canteen</p>
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
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-white" />
            <div>
              <p className="text-white font-medium">KIT College</p>
              <p className="text-white/80 text-sm">Main Canteen</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white">
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
          <Input
            placeholder="Search for food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
          />
        </div>
      </div>

      <div className="px-4 space-y-6 -mt-3">
        {/* Quick Stats */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              {quickStats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        {displayCategories.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Categories</h2>
            <div className="grid grid-cols-4 gap-4">
              {displayCategories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <Card
                    key={index}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setLocation(category.route)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-sm font-medium">{category.name}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Trending Now */}
        {trendingItems.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <Flame className="w-5 h-5 mr-2 text-orange-500" />
                Trending Now
              </h2>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => setLocation("/trending")}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {trendingItems.map((item, index) => (
                <Card key={item.id} className="shadow-card hover-scale transition-all duration-300 cursor-pointer" onClick={() => setLocation(`/dish/${item.id}`)}>
                  <CardContent className="p-4 flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          🔥 Trending
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-muted-foreground">Available now</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">₹{item.price}</p>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({
                            id: parseInt(item.id),
                            name: item.name,
                            price: item.price
                          });
                        }}
                      >
                        {getCartQuantity(parseInt(item.id)) > 0 
                          ? `ADD (${getCartQuantity(parseInt(item.id))})` 
                          : 'ADD'
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Picks */}
        {quickPickItems.length > 0 && (
          <div className="animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Quick Picks</h2>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => setLocation("/quick-picks")}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {quickPickItems.map((item, index) => (
                <Card key={item.id} className="shadow-card hover-scale transition-all duration-300 cursor-pointer" onClick={() => setLocation(`/dish/${item.id}`)}>
                  <CardContent className="p-4 flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <Utensils className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{item.name}</h3>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="ml-1 text-sm text-muted-foreground">Quick pick</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">₹{item.price}</p>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({
                            id: parseInt(item.id),
                            name: item.name,
                            price: item.price
                          });
                        }}
                      >
                        {getCartQuantity(parseInt(item.id)) > 0 
                          ? `ADD (${getCartQuantity(parseInt(item.id))})` 
                          : 'ADD'
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {menuItems.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Menu Items Available</h3>
            <p className="text-muted-foreground mb-4">Check back later for delicious food options!</p>
          </div>
        )}

        {/* Customer Reviews */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            What Our Customers Say
          </h2>
          <div className="space-y-3">
            {reviews.map((review, index) => (
              <Card key={index} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{review.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{review.name}</h4>
                        <div className="flex">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BottomNavigation currentPage="home" />
    </div>
  );
}