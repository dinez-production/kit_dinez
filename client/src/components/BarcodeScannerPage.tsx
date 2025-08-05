import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, Plus, Trash2, ShoppingCart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatOrderIdDisplay } from "../../../shared/utils";

export default function BarcodeScannerPage() {
  const [, setLocation] = useLocation();
  const [orderId, setOrderId] = useState("");
  
  // Manual order creation state
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // Sample menu items - in real app, this would come from API
  const menuItems = [
    { id: 1, name: "Veg Thali", price: 60, category: "Veg", available: true, stock: 20 },
    { id: 2, name: "Paneer Curry", price: 70, category: "Veg", available: true, stock: 15 },
    { id: 3, name: "Rice", price: 25, category: "Staples", available: true, stock: 100 },
    { id: 4, name: "Coffee", price: 15, category: "Beverages", available: true, stock: 50 },
    { id: 5, name: "Chicken Curry", price: 80, category: "Non-Veg", available: true, stock: 10 },
  ];

  const handleSubmit = () => {
    if (!orderId.trim()) {
      toast.error("Please enter an Order ID");
      return;
    }
    
    // Validate 12-digit numeric format
    const orderIdPattern = /^[0-9]{12}$/;
    if (!orderIdPattern.test(orderId)) {
      toast.error("Order ID must be exactly 12 digits (numbers only)");
      return;
    }
    
    toast.success(`Processing Order ID: ${orderId}`);
    // Navigate to order status or processing page
    setLocation(`/order-status/${orderId}`);
  };

  // Manual order creation handlers
  const handleAddItemToOrder = (menuItem, quantity = 1) => {
    const existingItem = selectedItems.find(item => item.id === menuItem.id);
    if (existingItem) {
      setSelectedItems(selectedItems.map(item => 
        item.id === menuItem.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setSelectedItems([...selectedItems, { ...menuItem, quantity }]);
    }
  };

  const handleRemoveItemFromOrder = (itemId) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };

  const handleUpdateItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      handleRemoveItemFromOrder(itemId);
      return;
    }
    setSelectedItems(selectedItems.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const calculateOrderTotal = () => {
    return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCreateManualOrder = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    try {
      const orderData = {
        customerId: 6, // Temporary - should get from auth
        customerName: "Manual Order",
        items: JSON.stringify(selectedItems),
        amount: calculateOrderTotal(),
        status: "preparing",
        estimatedTime: 15
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const order = await response.json();
        toast.success(`Order created: ${order.orderNumber} - Total: ₹${order.amount}`);
        
        // Reset form and close modal
        setSelectedItems([]);
        setIsMenuModalOpen(false);
      } else {
        toast.error("Failed to create order");
      }
    } catch (error) {
      toast.error("Error creating order");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/canteen-owner")}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Order Entry</h1>
          <Button 
            onClick={() => setIsMenuModalOpen(true)}
            variant="outline"
            size="sm"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Quick Order
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Order ID Entry Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Enter Order ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                placeholder="e.g., 123456789012"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={12}
              />
            </div>

            {orderId && (
              <Alert className={
                /^[0-9]{12}$/.test(orderId) 
                  ? "border-green-500/50 text-green-600 dark:border-green-500 [&>svg]:text-green-600"
                  : "border-amber-500/50 text-amber-600 dark:border-amber-500 [&>svg]:text-amber-600"
              }>
                {/^[0-9]{12}$/.test(orderId) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {/^[0-9]{12}$/.test(orderId) 
                    ? (
                        <div className="flex items-center">
                          <span>Valid Order ID: </span>
                          <span>{(() => {
                            const formatted = formatOrderIdDisplay(orderId);
                            return formatted.prefix;
                          })()}</span>
                          <span className="bg-green-500/20 text-green-700 font-bold px-1 rounded ml-0">
                            {(() => {
                              const formatted = formatOrderIdDisplay(orderId);
                              return formatted.highlighted;
                            })()}
                          </span>
                        </div>
                      )
                    : `Invalid format. Expected 12 digits (0-9): ${orderId.length}/12`
                  }
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSubmit}
              className="w-full"
              size="lg"
              disabled={!orderId.trim()}
            >
              Submit Order ID
            </Button>
          </CardContent>
        </Card>

        {/* Quick Order Menu Modal */}
        <Dialog open={isMenuModalOpen} onOpenChange={setIsMenuModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quick Order Menu</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Menu Items Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Available Items</h3>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border rounded p-3">
                  {menuItems.filter(item => item.available).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded hover:bg-accent/50">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.category}</div>
                        <div className="text-lg font-semibold text-primary">₹{item.price}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddItemToOrder(item)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Items */}
              {selectedItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Order Summary</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-accent/50 rounded">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">₹{item.price} each</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveItemFromOrder(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Order Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-2xl font-bold text-primary">₹{calculateOrderTotal()}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedItems([]);
                          setIsMenuModalOpen(false);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateManualOrder}
                        disabled={selectedItems.length === 0}
                        className="flex-1"
                        size="lg"
                      >
                        Create Order
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}