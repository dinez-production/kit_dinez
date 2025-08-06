import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, TrendingUp, Star } from "lucide-react";
import { VegIndicator } from "@/components/ui/VegIndicator";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";

type TrendingItem = {
  id: number;
  menuItemId: number;
  position: number;
  isActive: boolean;
  createdAt: string;
  menuItem: {
    id: number;
    name: string;
    price: number;
    categoryId: number;
    available: boolean;
    stock: number;
    description: string;
    addOns: string;
    isVegetarian: boolean;
    createdAt: string;
  };
};

export function TrendingNow() {
  const [, setLocation] = useLocation();
  const { addToCart } = useCart();
  const [selectedTrendingItem, setSelectedTrendingItem] = useState<TrendingItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: trendingItems = [], isLoading } = useQuery<TrendingItem[]>({
    queryKey: ["/api/trending-items"],
  });

  const handleAddToCart = async (trendingItem: TrendingItem) => {
    // Add items to cart based on quantity
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: trendingItem.menuItem.id,
        name: trendingItem.menuItem.name,
        price: trendingItem.menuItem.price,
        isVegetarian: trendingItem.menuItem.isVegetarian
      });
    }
    setSelectedTrendingItem(null);
    setQuantity(1);
  };

  const handleViewMenu = () => {
    setLocation("/menu");
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Trending Now
          </h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (trendingItems.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Trending Now
          </h2>
          <Button variant="ghost" size="sm" onClick={handleViewMenu}>
            View All
          </Button>
        </div>
        
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Trending Items Yet</h3>
            <p className="text-muted-foreground text-sm">
              The canteen owner hasn't set up trending items yet. Check back soon to see what's popular!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary" />
          Trending Now
        </h2>
        <Button variant="ghost" size="sm" onClick={handleViewMenu}>
          View All
        </Button>
      </div>
      
      <div className="space-y-3">
        {trendingItems.map((trendingItem, index) => (
          <Dialog key={trendingItem.id}>
            <DialogTrigger asChild>
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedTrendingItem(trendingItem);
                  setQuantity(1);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🔥</span>
                      </div>
                      <Badge className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                        #{index + 1}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{trendingItem.menuItem.name}</h3>
                        <VegIndicator isVegetarian={trendingItem.menuItem.isVegetarian} size="sm" />
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      </div>
                      <p className="text-lg font-bold text-primary">₹{trendingItem.menuItem.price}</p>
                      {!trendingItem.menuItem.available && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs mt-1">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="bg-primary hover:bg-primary/90"
                      disabled={!trendingItem.menuItem.available}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <span>{trendingItem.menuItem.name}</span>
                  <VegIndicator isVegetarian={trendingItem.menuItem.isVegetarian} size="sm" />
                  <Badge className="bg-orange-500 text-white">Trending</Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">🔥</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">₹{trendingItem.menuItem.price}</p>
                  {trendingItem.menuItem.description && (
                    <p className="text-sm text-muted-foreground mt-2">{trendingItem.menuItem.description}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={quantity >= 10}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total:</span>
                    <span className="text-xl font-bold text-primary">₹{trendingItem.menuItem.price * quantity}</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleAddToCart(trendingItem)}
                  disabled={!trendingItem.menuItem.available}
                  className="w-full"
                  size="lg"
                >
                  {!trendingItem.menuItem.available ? "Currently Unavailable" : "Add to Cart"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}