import React, { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ReorderPage = () => {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const orderId = searchParams.get('orderId');
  const { toast } = useToast();

  // Mock order data
  const orderData = {
    id: orderId || 'ORD001',
    items: [
      {
        id: 1,
        name: 'Grilled Chicken Burger',
        price: 12.99,
        image: '/placeholder.png',
        quantity: 1,
        customizations: ['No onions', 'Extra cheese']
      },
      {
        id: 2,
        name: 'Crispy French Fries',
        price: 4.99,
        image: '/placeholder.png',
        quantity: 2,
        customizations: []
      },
      {
        id: 3,
        name: 'Chocolate Milkshake',
        price: 5.99,
        image: '/placeholder.png',
        quantity: 1,
        customizations: ['Extra chocolate']
      }
    ]
  };

  const [items, setItems] = useState(orderData.items.map(item => ({
    ...item,
    reorderQuantity: item.quantity
  })));

  const updateQuantity = (itemId: number, change: number) => {
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, reorderQuantity: Math.max(0, item.reorderQuantity + change) }
        : item
    ));
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.reorderQuantity), 0);
  };

  const getSelectedItemsCount = () => {
    return items.reduce((count, item) => count + item.reorderQuantity, 0);
  };

  const handleReorder = () => {
    const selectedItems = items.filter(item => item.reorderQuantity > 0);
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to reorder.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Added to cart!",
      description: `${getSelectedItemsCount()} items added to your cart.`,
    });
    
    // Navigate to cart or home
    setLocation('/cart');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Reorder</h1>
            <p className="text-sm text-muted-foreground">Order #{orderData.id}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="text-center py-2">
          <p className="text-muted-foreground">
            Adjust quantities and tap "Add to Cart" to reorder
          </p>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm leading-tight">{item.name}</h3>
                    <p className="text-primary font-semibold mt-1">${item.price}</p>
                    
                    {item.customizations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.customizations.map((custom, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {custom}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 bg-accent rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.reorderQuantity === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="w-8 text-center font-medium">
                        {item.reorderQuantity}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Originally: {item.quantity}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold">Total: ${getTotalPrice().toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              {getSelectedItemsCount()} items selected
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleReorder}
          className="w-full"
          variant="food"
          size="mobile"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

export default ReorderPage;