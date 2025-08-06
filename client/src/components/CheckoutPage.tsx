import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock, MapPin, CreditCard, Wallet, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCart } from "@/contexts/CartContext";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [estimatedTime, setEstimatedTime] = useState("15-20 mins");
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(420); // 7 minutes in seconds
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const paymentValidRef = useRef(false);
  const queryClient = useQueryClient();

  // Use cart context instead of reading from localStorage directly
  const { cart, clearCart } = useCart();
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  
  const orderItems = cart;
  const subtotal = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  // Add fallback for testing - create order without payment if in dev mode
  const createOrderDirectly = async () => {
    // Server will generate the orderNumber and barcode using new 12-digit alphanumeric format
    const orderData = {
      customerId: userData.id || null,
      customerName: userData.name || 'Guest User',
      items: JSON.stringify(cart),
      amount: total,
      status: 'preparing',
      estimatedTime: 15
    };

    try {
      const newOrder = await createOrderMutation.mutateAsync(orderData);
      
      toast({
        title: "Order Created",
        description: "Your order has been placed successfully!",
      });
      
      setLocation(`/order-status/${newOrder.orderNumber}`);
    } catch (error) {
      // Failed to create order - show error message
      toast({
        title: "Order Creation Failed",
        description: "Unable to create order. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
    },
    onSuccess: () => {
      // Invalidate orders cache to refresh order lists
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      // Clear cart after successful order using cart context
      clearCart();
    },
  });

  // Timer effect with proper cleanup
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      // Timer expired
      handleTimerExpiry();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerActive, timeLeft]);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleTimerExpiry = () => {
    setIsTimerActive(false);
    setPaymentInProgress(false);
    paymentValidRef.current = false;
    
    toast({
      title: "Payment Session Expired",
      description: "Please try again to complete your order.",
      variant: "destructive",
    });
    
    setLocation('/retry-payment');
  };

  const startPaymentTimer = () => {
    setIsTimerActive(true);
    setPaymentInProgress(true);
    paymentValidRef.current = true;
    setTimeLeft(420); // Reset to 7 minutes
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlaceOrder = () => {
    // Start the timer
    startPaymentTimer();
    
    const options = {
      key: "rzp_test_uKo2E3dcFizVIW", // Razorpay test key
      amount: total * 100, // Amount in paise
      currency: "INR",
      name: "KIT College Canteen",
      description: "Food Order Payment",
      image: "/favicon.ico",
      order_id: "", // This should come from your backend
      handler: async function (response: any) {
        // Payment successful - stop timer immediately
        setIsTimerActive(false);
        setPaymentInProgress(false);
        
        // Payment successful - create order in database
        // Server will generate orderNumber and barcode using new format
        const orderData = {
          customerId: userData.id || null,
          customerName: userData.name || 'Guest User',
          items: JSON.stringify(cart),
          amount: total,
          status: 'preparing',
          estimatedTime: 15
        };

        try {
          const newOrder = await createOrderMutation.mutateAsync(orderData);
          
          toast({
            title: "Payment Successful",
            description: "Your order has been confirmed!",
          });
          
          setLocation(`/order-status/${newOrder.orderNumber}`);
        } catch (error) {
          // Failed to create order after payment - critical error
          toast({
            title: "Order Creation Failed",
            description: "Payment successful but order creation failed. Contact support.",
            variant: "destructive"
          });
        }
      },
      prefill: {
        name: "Student Name",
        email: "student@kit.ac.in",
        contact: "9999999999"
      },
      notes: {
        address: "KIT College Campus"
      },
      theme: {
        color: "#3B82F6"
      },
      modal: {
        ondismiss: function() {
          // Payment cancelled by user
          setIsTimerActive(false);
          setPaymentInProgress(false);
          paymentValidRef.current = false;
        }
      }
    };

    // Check if Razorpay is loaded
    if (!(window as any).Razorpay) {
      toast({
        title: "Payment Error",
        description: "Payment service is not available. Please try again later.",
        variant: "destructive"
      });
      setIsTimerActive(false);
      setPaymentInProgress(false);
      paymentValidRef.current = false;
      return;
    }

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      // Razorpay initialization error - show fallback
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive"
      });
      setIsTimerActive(false);
      setPaymentInProgress(false);
      paymentValidRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/cart')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Checkout</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Payment Timer */}
        {isTimerActive && (
          <Card className="shadow-card border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Timer className="w-5 h-5 mr-2 text-destructive" />
                  <span className="font-semibold text-destructive">Payment Timer</span>
                </div>
                <div className="text-2xl font-bold text-destructive">
                  {formatTime(timeLeft)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Complete your payment within the time limit to confirm your order
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3">
              {orderItems.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                  <span className="font-medium">₹{item.price}</span>
                </div>
              ))}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (5%)</span>
                  <span>₹{tax}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Payment Options */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-primary" />
              Payment Method
            </h3>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="flex-1 cursor-pointer">
                    <div className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-3 text-blue-600" />
                      <div>
                        <p className="font-medium">UPI Payment</p>
                        <p className="text-sm text-muted-foreground">Google Pay, PhonePe, Paytm</p>
                      </div>
                    </div>
                  </Label>
                  <span className="bg-success text-success-foreground px-2 py-1 rounded text-xs font-medium">
                    Recommended
                  </span>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Order Instructions */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <h4 className="font-medium text-warning-foreground mb-2">📋 Order Instructions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Please bring your student ID for verification</li>
                <li>• Orders are prepared fresh, slight delays may occur during peak hours</li>
                <li>• Check order details carefully before leaving the counter</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Place Order Button */}
      <div className="sticky bottom-0 bg-white border-t p-4 space-y-2">
        <Button
          variant="food"
          size="mobile"
          className="w-full"
          onClick={handlePlaceOrder}
          disabled={paymentInProgress || cart.length === 0}
        >
          {paymentInProgress ? 'Processing...' : `Pay Now • ₹${total}`}
        </Button>
        
        {/* Test mode - Direct order creation */}
        {process.env.NODE_ENV === 'development' && (
          <Button
            variant="outline"
            size="mobile"
            className="w-full"
            onClick={createOrderDirectly}
            disabled={createOrderMutation.isPending || cart.length === 0}
          >
            {createOrderMutation.isPending ? 'Creating Order...' : 'Skip Payment (Test Mode)'}
          </Button>
        )}
        
        {cart.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Your cart is empty. Add items to continue.
          </p>
        )}
      </div>
    </div>
  );
}