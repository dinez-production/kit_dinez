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
import { VegIndicator } from "@/components/ui/VegIndicator";
import { cn } from "@/lib/utils";
import type { MenuItem, Category } from "@shared/schema";
import { QuickOrders } from "@/components/QuickOrders";
import NotificationPanel from "@/components/NotificationPanel";
import PullToRefresh from "@/components/ui/PullToRefresh";
import MediaBanner from "@/components/MediaBanner";
import { useIsMobile } from "@/hooks/use-mobile";


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
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");
  const { addToCart, getCartQuantity } = useCart();
  const isMobile = useIsMobile();



  // Enhanced queries with real-time synchronization
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery<Category[]>({
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

  const { data: menuItems = [], isLoading: menuItemsLoading, refetch: refetchMenuItems } = useQuery<MenuItem[]>({
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

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      refetchCategories(),
      refetchMenuItems()
    ]);
  };



  // Filter items based on search query and veg/non-veg filter
  const filteredItems = searchQuery.trim() 
    ? menuItems.filter(item => {
        const matchesSearch = item.available && (
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          categories.find(cat => cat.id === item.categoryId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        const matchesVegFilter = vegFilter === "all" || 
          (vegFilter === "veg" && item.isVegetarian) ||
          (vegFilter === "non-veg" && !item.isVegetarian);
          
        return matchesSearch && matchesVegFilter;
      })
    : [];

  // Apply vegFilter to all items
  const getFilteredMenuItems = (items: MenuItem[]) => {
    return items.filter(item => {
      const matchesVegFilter = vegFilter === "all" || 
        (vegFilter === "veg" && item.isVegetarian) ||
        (vegFilter === "non-veg" && !item.isVegetarian);
      // Filter out items with 0 stock
      return item.available && item.stock > 0 && matchesVegFilter;
    });
  };

  // Get trending items directly from menu items with isTrending = true
  const trendingItems = getFilteredMenuItems(menuItems)
    .filter(item => item.isTrending)
    .map(item => ({
      id: item.id.toString(),
      name: item.name,
      price: item.price
    }));

  // Get quick picks from database
  const quickPickItems = getFilteredMenuItems(menuItems)
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
    <>
      <PullToRefresh
        onRefresh={handleRefresh}
        enabled={true}
        threshold={60}
        className="min-h-screen bg-background pb-20"
      >
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
          <div className="flex items-center space-x-2">
            <NotificationPanel />
            <Button variant="ghost" size="icon" className="text-white">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
            <Input
              placeholder="Search for food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>
          
          {/* Veg/Non-Veg Filter */}
          <div className="flex gap-2">
            <Button
              variant={vegFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setVegFilter("all")}
              className={cn(
                "text-white/80 border-white/20",
                vegFilter === "all" && "bg-white/20 text-white"
              )}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              variant={vegFilter === "veg" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setVegFilter("veg")}
              className={cn(
                "text-white/80 border-white/20",
                vegFilter === "veg" && "bg-green-600 text-white border-green-600"
              )}
              data-testid="filter-veg"
            >
              <div className="w-2 h-2 bg-green-600 rounded-full mr-1" />
              Veg
            </Button>
            <Button
              variant={vegFilter === "non-veg" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setVegFilter("non-veg")}
              className={cn(
                "text-white/80 border-white/20",
                vegFilter === "non-veg" && "bg-red-600 text-white border-red-600"
              )}
              data-testid="filter-non-veg"
            >
              <div className="w-2 h-2 bg-red-600 rounded-full mr-1" />
              Non-Veg
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 -mt-3">
        {/* Media Banner - Show only when not searching */}
        {!searchQuery.trim() && (
          <div className="animate-fade-in">
            <MediaBanner />
          </div>
        )}

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Search Results for "{searchQuery}"
              </h2>
              {filteredItems.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No items found</h3>
                  <p className="text-muted-foreground mb-4">
                    We couldn't find any items matching "{searchQuery}"
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery("")}
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className="shadow-card hover-scale transition-all duration-300 cursor-pointer" 
                    onClick={() => setLocation(`/dish/${item.id}`)}
                  >
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <span className="text-2xl">🍽️</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                          {!item.available && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              Unavailable
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.description || "Delicious item from our menu"}
                        </p>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-muted-foreground">
                            {categories.find(cat => cat.id === item.categoryId)?.name || "Uncategorized"}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm">4.5</span>
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
                              id: item.id,
                              name: item.name,
                              price: item.price,
                              isVegetarian: item.isVegetarian
                            });
                          }}
                          disabled={!item.available}
                        >
                          {getCartQuantity(item.id) > 0 
                            ? `ADD (${getCartQuantity(item.id)})` 
                            : 'ADD'
                          }
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Stats - Hidden when searching */}
        {!searchQuery.trim() && (
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
        )}

        {/* Quick Orders - Hidden when searching */}
        {!searchQuery.trim() && (
          <QuickOrders />
        )}

        {/* Categories - Hidden when searching */}
        {!searchQuery.trim() && displayCategories.length > 0 && (
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

        {/* Trending Now - Hidden when searching */}
        {!searchQuery.trim() && trendingItems.length > 0 && (
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
              {trendingItems.map((item, index) => {
                const itemId = parseInt(item.id, 10);
                return (
                  <Card key={item.id} className="shadow-card hover-scale transition-all duration-300 cursor-pointer" onClick={() => setLocation(`/dish/${item.id}`)}>
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <VegIndicator isVegetarian={menuItems.find(mi => mi.id === itemId)?.isVegetarian ?? true} size="sm" />
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
                              id: itemId,
                              name: item.name,
                              price: item.price,
                              isVegetarian: menuItems.find(mi => mi.id.toString() === item.id)?.isVegetarian ?? true
                            });
                          }}
                        >
                          {getCartQuantity(itemId) > 0 
                            ? `ADD (${getCartQuantity(itemId)})` 
                            : 'ADD'
                          }
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Picks - Hidden when searching */}
        {!searchQuery.trim() && quickPickItems.length > 0 && (
          <div className="animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Quick Picks</h2>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => setLocation("/quick-picks")}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {quickPickItems.map((item, index) => {
                const itemId = parseInt(item.id, 10);
                return (
                  <Card key={item.id} className="shadow-card hover-scale transition-all duration-300 cursor-pointer" onClick={() => setLocation(`/dish/${item.id}`)}>
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Utensils className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <VegIndicator isVegetarian={menuItems.find(mi => mi.id === itemId)?.isVegetarian ?? true} size="sm" />
                        </div>
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
                              id: itemId,
                              name: item.name,
                              price: item.price,
                              isVegetarian: menuItems.find(mi => mi.id.toString() === item.id)?.isVegetarian ?? true
                            });
                          }}
                        >
                          {getCartQuantity(itemId) > 0 
                            ? `ADD (${getCartQuantity(itemId)})` 
                            : 'ADD'
                          }
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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

        {/* Customer Reviews - Hidden when searching */}
        {!searchQuery.trim() && (
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
        )}
      </div>

      </PullToRefresh>
      <BottomNavigation currentPage="home" />
    </>
  );
}