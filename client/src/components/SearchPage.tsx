import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { VegIndicator } from "@/components/ui/VegIndicator";
import type { MenuItem, Category } from "@shared/schema";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { addToCart, getCartQuantity } = useCart();

  // Fetch real menu items and categories
  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Create item-category mapping
  const getCategoryName = (categoryId?: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || "Other";
  };

  const filteredItems = menuItems.filter(item => {
    // First filter out items with 0 stock and unavailable items
    if (!item.available || item.stock <= 0) return false;
    
    // Then apply search filter
    const categoryName = getCategoryName(item.categoryId);
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddToCart = (item: MenuItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      isVegetarian: item.isVegetarian
    });
  };

  const popularSearches = ["Tea", "Snacks", "Chicken", "Roll"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="w-full pl-10 bg-white text-foreground"
              placeholder="Search for food items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Popular Searches */}
        {!searchQuery && (
          <div>
            <h3 className="font-semibold mb-3">Popular Searches</h3>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((term) => (
                <Badge
                  key={term}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setSearchQuery(term)}
                >
                  {term}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <div>
            <h3 className="font-semibold mb-3">
              {filteredItems.length > 0 
                ? `${filteredItems.length} results for "${searchQuery}"` 
                : `No results for "${searchQuery}"`
              }
            </h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2 w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-lg">{item.name}</h4>
                            <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                            <Badge variant="secondary">{getCategoryName(item.categoryId)}</Badge>
                            <Badge variant="outline">Stock: {item.stock}</Badge>
                          </div>
                          
                          <p className="font-semibold text-lg text-primary">₹{item.price}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          {getCartQuantity(item.id) > 0 ? (
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleAddToCart(item)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <span className="font-semibold">{getCartQuantity(item.id)}</span>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => handleAddToCart(item)}
                              disabled={!item.available || item.stock === 0}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No available items found for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try searching for something else</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}