import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Filter, Star, Plus, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { VegIndicator } from "@/components/ui/VegIndicator";
import BottomNavigation from "./BottomNavigation";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MenuItem, Category } from "@shared/schema";

export default function MenuListingPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/menu/:category");
  const category = params?.category;
  const [filter, setFilter] = useState<"all" | "veg" | "non-veg">("all");
  const { addToCart, getCartQuantity, decreaseQuantity } = useCart();
  const isMobile = useIsMobile();

  // Fetch categories and menu items from database with optimized caching
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 10, // 10 minutes for categories
  });

  const { data: menuItems = [], isLoading: menuItemsLoading, refetch: refetchMenuItems } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu'],
    staleTime: 1000 * 60 * 5, // 5 minutes for menu items
  });

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      refetchCategories(),
      refetchMenuItems()
    ]);
  };

  const isLoading = categoriesLoading || menuItemsLoading;

  // Filter items by category if specified
  const getCategoryItems = () => {
    if (category === "all") return menuItems;
    
    const categoryData = categories.find(cat => 
      cat.name.toLowerCase() === category?.toLowerCase()
    );
    
    if (!categoryData) return [];
    
    return menuItems.filter(item => item.categoryId === categoryData.id);
  };

  const items = getCategoryItems();
  const filteredItems = items.filter(item => {
    // First filter out items with 0 stock and unavailable items
    if (!item.available || item.stock <= 0) return false;
    
    // Then apply vegetarian filters
    if (filter === "all") return true;
    if (filter === "veg") return item.isVegetarian;
    if (filter === "non-veg") return !item.isVegetarian;
    return true;
  });

  const handleAddToCart = (item: typeof items[0]) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      isVegetarian: item.isVegetarian
    });
  };

  return (
    <>
      <PullToRefresh
        onRefresh={handleRefresh}
        enabled={isMobile}
        threshold={80}
        className="min-h-screen bg-background pb-20"
      >
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold capitalize">{category}</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Categories - Horizontal Scrollable */}
        <div className="mt-4">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2">
            <Button
              key="all"
              variant={category === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setLocation("/menu/all")}
              className="flex-shrink-0"
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={category?.toLowerCase() === cat.name.toLowerCase() ? "default" : "outline"}
                size="sm"
                onClick={() => setLocation(`/menu/${cat.name.toLowerCase()}`)}
                className="flex-shrink-0"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Veg/Non-Veg Filters */}
        <div className="flex space-x-2 mt-3">
          {[
            { id: "all", label: "All" },
            { id: "veg", label: "Veg" },
            { id: "non-veg", label: "Non-Veg" }
          ].map((filterOption) => (
            <Button
              key={filterOption.id}
              variant={filter === filterOption.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption.id as any)}
            >
              {filterOption.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Menu Items */}
      {!isLoading && (
        <div className="p-4 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No items found in this category</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} className="shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation(`/dish/${item.id}`, { state: { from: `/menu/${category}` } })}>
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Image */}
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 flex-shrink-0 rounded-l-lg flex items-center justify-center text-3xl">
                      🍽️
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{item.name}</h3>
                            <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description || "Delicious item from our menu"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">₹{item.price}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm ml-1">4.5</span>
                          </div>
                          {!item.available && (
                            <Badge variant="destructive">Not Available</Badge>
                          )}
                          {item.stock <= 5 && item.stock > 0 && (
                            <Badge variant="outline">Limited Stock</Badge>
                          )}
                          {item.stock === 0 && (
                            <Badge variant="destructive">Out of Stock</Badge>
                          )}
                        </div>
                        
                        {getCartQuantity(item.id) > 0 ? (
                          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                decreaseQuantity(item.id);
                              }}
                              className="w-8 h-8 p-0"
                            >
                              -
                            </Button>
                            <span className="font-semibold w-8 text-center">{getCartQuantity(item.id)}</span>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(item);
                              }}
                              className="w-8 h-8 p-0"
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={!item.available || item.stock === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            ADD
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      </PullToRefresh>
      <BottomNavigation currentPage="menu" />
    </>
  );
}