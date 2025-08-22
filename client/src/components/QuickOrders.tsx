import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Zap } from "lucide-react";
import { VegIndicator } from "@/components/ui/VegIndicator";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";

type QuickOrder = {
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

export function QuickOrders() {
  const [, setLocation] = useLocation();
  const { addToCart, getCartQuantity } = useCart();
  const [selectedQuickOrder, setSelectedQuickOrder] = useState<QuickOrder | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: quickOrders = [], isLoading } = useQuery<QuickOrder[]>({
    queryKey: ["/api/quick-orders"],
  });

  const handleQuickOrder = async (quickOrder: QuickOrder) => {
    // Add items to cart with the specified quantity
    addToCart({
      id: quickOrder.menuItem.id,
      name: quickOrder.menuItem.name,
      price: quickOrder.menuItem.price,
      isVegetarian: quickOrder.menuItem.isVegetarian
    }, quantity);
    
    setSelectedQuickOrder(null);
    setQuantity(1);
    
    // Small delay to ensure cart context is updated before navigation
    setTimeout(() => {
      setLocation("/checkout");
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <Zap className="w-5 h-5 mr-2 text-primary" />
            Quick Orders
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="w-full h-20 bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (quickOrders.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <Zap className="w-5 h-5 mr-2 text-primary" />
            Quick Orders
          </h2>
          <p className="text-sm text-muted-foreground">Tap & Go!</p>
        </div>
        
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-8 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Quick Orders Yet</h3>
            <p className="text-muted-foreground text-sm">
              The canteen owner hasn't set up quick orders yet. Check back soon for instant ordering options!
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
          <Zap className="w-5 h-5 mr-2 text-primary" />
          Quick Orders
        </h2>
        <p className="text-sm text-muted-foreground">Tap & Go!</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {quickOrders.filter(quickOrder => 
          quickOrder.menuItem.available && quickOrder.menuItem.stock > 0
        ).slice(0, 4).map((quickOrder) => (
          <Dialog key={quickOrder.id}>
            <DialogTrigger asChild>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover-scale border-2 border-primary/20 hover:border-primary/40"
                onClick={() => setSelectedQuickOrder(quickOrder)}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-full h-20 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-1">
                      <h3 className="font-semibold text-sm line-clamp-1">{quickOrder.menuItem.name}</h3>
                      <VegIndicator isVegetarian={quickOrder.menuItem.isVegetarian} size="sm" />
                    </div>
                    <p className="text-lg font-bold text-primary">₹{quickOrder.menuItem.price}</p>
                    {!quickOrder.menuItem.available && (
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                        Unavailable
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <span>{quickOrder.menuItem.name}</span>
                  <VegIndicator isVegetarian={quickOrder.menuItem.isVegetarian} size="sm" />
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">🍽️</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">₹{quickOrder.menuItem.price}</p>
                  {quickOrder.menuItem.description && (
                    <p className="text-sm text-muted-foreground mt-2">{quickOrder.menuItem.description}</p>
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
                    <span className="text-xl font-bold text-primary">₹{quickOrder.menuItem.price * quantity}</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleQuickOrder(quickOrder)}
                  disabled={!quickOrder.menuItem.available}
                  className="w-full"
                  size="lg"
                >
                  {!quickOrder.menuItem.available ? "Currently Unavailable" : "Add to Cart & Checkout"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}