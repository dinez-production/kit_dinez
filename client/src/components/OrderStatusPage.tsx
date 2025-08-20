import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, ChefHat, Package, Phone, ArrowLeft } from "lucide-react";
import JsBarcode from 'jsbarcode';
import { formatOrderIdDisplay } from "@shared/utils";
import type { Order } from '@shared/schema';

// Real Barcode Generator Component using JsBarcode library
const BarcodeGenerator = ({ orderId }: { orderId: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        // Generate a proper Code 128 barcode
        JsBarcode(canvasRef.current, orderId, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 10,
          fontSize: 14,
          textAlign: "center",
          textPosition: "bottom"
        });
      } catch (error) {
        // Barcode generation failed - fallback to text display
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
          canvas.width = 250;
          canvas.height = 80;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#000000';
          ctx.font = '16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`Order: ${orderId}`, canvas.width/2, canvas.height/2);
        }
      }
    }
  }, [orderId]);

  return (
    <canvas 
      ref={canvasRef}
      className="mx-auto"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

export default function OrderStatusPage() {
  const [, setLocation] = useLocation();
  const { orderId } = useParams();
  
  // Get source from URL parameters to determine correct back navigation
  const urlParams = new URLSearchParams(window.location.search);
  const sourceContext = urlParams.get('from');

  // Handle all back navigation scenarios (browser back, iOS swipe, Android back)
  useEffect(() => {
    // Override browser history behavior to always redirect to orders page
    const handleBackNavigation = (event: PopStateEvent) => {
      event.preventDefault();
      // Always navigate to orders page regardless of how user tries to go back
      setLocation('/orders');
    };

    // Push a new state to handle back navigation
    window.history.pushState({ page: 'order-status' }, '', window.location.href);
    
    // Listen for popstate events (browser back, swipe gestures)
    window.addEventListener('popstate', handleBackNavigation);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleBackNavigation);
    };
  }, [setLocation]);

  // Fetch real order data from API - using SSE for real-time updates instead of polling
  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    staleTime: 0, // Always fetch fresh data
    refetchInterval: false, // Disable polling - using SSE for real-time updates
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  // Real-time order updates via Server-Sent Events (SSE) for user-facing status updates
  useEffect(() => {
    console.log("🔄 Setting up real-time order updates for user...");
    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/events/orders');

        eventSource.onopen = () => {
          console.log("📡 User connected to real-time order updates");
          reconnectAttempts = 0; // Reset on successful connection
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📨 User received real-time update:", data);
            
            // Handle different message types
            if (data.type === 'order_updated' || data.type === 'order_status_changed') {
              console.log("🔄 User refreshing order data due to status change");
              // Refresh orders when there's a status update
              refetch();
            } else if (data.type === 'new_order') {
              // Users don't need to refresh for new orders unless it's their order
              console.log("📦 New order notification received (for canteen owners)");
            } else if (data.type === 'connected') {
              console.log("✅ User SSE connection confirmed");
            } else if (data.type === 'ping') {
              // Ignore keep-alive pings
              return;
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error, "Raw data:", event.data);
          }
        };

        eventSource.onerror = (error) => {
          console.error("📡 User SSE connection error:", error);
          
          // Attempt reconnection in production environment
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
            console.log(`📡 Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);
            
            reconnectTimeout = setTimeout(() => {
              if (eventSource) {
                eventSource.close();
              }
              connect();
            }, delay);
          } else {
            console.warn("📡 Max reconnection attempts reached. SSE disabled.");
          }
        };
      } catch (error) {
        console.error("📡 Failed to create SSE connection:", error);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      console.log("📡 Closing user real-time connection");
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [refetch]);

  // Find the specific order by ID, order number, or barcode (supporting both old and new formats)
  const order = orders.find(o => 
    o.id.toString() === orderId || 
    o.orderNumber === orderId ||
    o.barcode === orderId
  );

  const orderStatus = order?.status as "pending" | "preparing" | "ready" | "completed" | "delivered" || "preparing";
  
  // Dynamic theme configuration based on order status
  const getThemeConfig = (status: string) => {
    switch (status) {
      case "pending":
      case "preparing":
        return {
          bg: "bg-red-50 dark:bg-red-950/20",
          headerBg: "bg-red-600",
          iconBg: "bg-red-100 dark:bg-red-900/30",
          iconColor: "text-red-600",
          progressColor: "[&>div]:bg-red-500",
          borderColor: "border-red-200 dark:border-red-800",
          theme: "red"
        };
      case "ready":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-950/20",
          headerBg: "bg-yellow-600",
          iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
          iconColor: "text-yellow-600",
          progressColor: "[&>div]:bg-yellow-500",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          theme: "yellow"
        };
      case "delivered":
      case "completed":
        return {
          bg: "bg-green-50 dark:bg-green-950/20",
          headerBg: "bg-green-600",
          iconBg: "bg-green-100 dark:bg-green-900/30",
          iconColor: "text-green-600",
          progressColor: "[&>div]:bg-green-500",
          borderColor: "border-green-200 dark:border-green-800",
          theme: "green"
        };
      default:
        return {
          bg: "bg-red-50 dark:bg-red-950/20",
          headerBg: "bg-red-600",
          iconBg: "bg-red-100 dark:bg-red-900/30",
          iconColor: "text-red-600",
          progressColor: "[&>div]:bg-red-500",
          borderColor: "border-red-200 dark:border-red-800",
          theme: "red"
        };
    }
  };
  
  const themeConfig = getThemeConfig(orderStatus);
  
  // Calculate progress based on order status - memoized to prevent infinite loops
  const progress = useMemo(() => {
    switch (orderStatus) {
      case "preparing": return 33;
      case "ready": return 66;
      case "completed": return 100;
      case "delivered": return 100;
      default: return 33;
    }
  }, [orderStatus]);

  const orderDetails = order ? (() => {
    let parsedItems: Array<{id: number, name: string, price: number, quantity: number}> = [];
    
    try {
      const itemsData = JSON.parse(order.items || '[]');
      parsedItems = Array.isArray(itemsData) ? itemsData : [];
    } catch (error) {
      console.error('Error parsing order items:', error);
      parsedItems = [];
    }

    return {
      id: order.barcode, // Use barcode as the primary ID for consistency
      orderNumber: order.orderNumber, // Keep order number for reference
      items: parsedItems,
      total: order.amount,
      estimatedTime: `${order.estimatedTime || 15} mins`,
      actualTime: orderStatus === "ready" ? `${order.estimatedTime || 15} mins` : `${order.estimatedTime || 15} mins`,
      pickupLocation: "KIT College Main Canteen, Ground Floor"
    };
  })() : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order || !orderDetails) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">Order not found</div>
          <Button onClick={() => setLocation("/orders")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }


  const statusSteps = [
    {
      status: "placed",
      label: "Order Placed",
      icon: CheckCircle,
      completed: true,
      time: order ? new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""
    },
    {
      status: "preparing",
      label: "Preparing",
      icon: ChefHat,
      completed: orderStatus === "preparing" || orderStatus === "ready" || orderStatus === "completed" || orderStatus === "delivered",
      time: orderStatus === "preparing" || orderStatus === "ready" || orderStatus === "completed" || orderStatus === "delivered" ? 
        order ? new Date(new Date(order.createdAt).getTime() + 3 * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "" : ""
    },
    {
      status: "ready",
      label: "Ready for Pickup",
      icon: Package,
      completed: orderStatus === "ready" || orderStatus === "completed" || orderStatus === "delivered",
      time: orderStatus === "ready" || orderStatus === "completed" || orderStatus === "delivered" ? 
        order ? new Date(new Date(order.createdAt).getTime() + (order.estimatedTime || 15) * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "" : ""
    },
    {
      status: "delivered",
      label: "Order Delivered",
      icon: CheckCircle,
      completed: orderStatus === "delivered",
      time: orderStatus === "delivered" && order?.deliveredAt ? 
        new Date(order.deliveredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""
    }
  ];

  return (
    <div className={`min-h-screen ${themeConfig.bg}`}>
      {/* Header */}
      <div className={`${themeConfig.headerBg} px-4 pt-12 pb-6`}>
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            title="Back to Orders"
            onClick={() => {
              // Always navigate to orders page - consistent with our back navigation handling
              setLocation('/orders');
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Order Status</h1>
          <div className="flex items-center justify-center text-white/80">
            <span>Order #{(() => {
              const formatted = formatOrderIdDisplay(orderDetails.orderNumber);
              return formatted.prefix;
            })()}</span>
            <span className="bg-white/20 text-white font-bold px-1 rounded ml-0">
              {(() => {
                const formatted = formatOrderIdDisplay(orderDetails.orderNumber);
                return formatted.highlighted;
              })()}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Order Barcode */}
        <Card className={`shadow-card ${themeConfig.borderColor} border-2`}>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Package className={`w-5 h-5 mr-2 ${themeConfig.iconColor}`} />
              Order Barcode
            </h3>
            <div className="bg-accent/50 rounded-lg p-4 text-center">
              {/* Real Code 128 Barcode using JsBarcode library */}
              <div className="bg-white p-4 rounded-lg inline-block mb-3 border-2 border-gray-200">
                <BarcodeGenerator orderId={orderDetails.id} />
              </div>
              <p className="font-bold text-lg mb-1">Order ID: {orderDetails.id}</p>
              <p className="text-sm text-muted-foreground">
                Scannable Code 128 barcode for quick order verification
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card className={`shadow-card ${themeConfig.borderColor} border-2`}>
          <CardContent className="p-6 text-center">
            <div className={`w-20 h-20 ${themeConfig.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {(orderStatus === "preparing" || orderStatus === "pending") && <ChefHat className={`w-10 h-10 ${themeConfig.iconColor}`} />}
              {orderStatus === "ready" && <Package className={`w-10 h-10 ${themeConfig.iconColor}`} />}
              {(orderStatus === "completed" || orderStatus === "delivered") && <CheckCircle className={`w-10 h-10 ${themeConfig.iconColor}`} />}
            </div>
            
            <h2 className={`text-xl font-bold mb-2 ${themeConfig.iconColor}`}>
              {(orderStatus === "preparing" || orderStatus === "pending") && "Preparing Your Order"}
              {orderStatus === "ready" && "Ready for Pickup!"}
              {(orderStatus === "completed" || orderStatus === "delivered") && "Order Completed!"}
            </h2>
            
            <p className="text-muted-foreground mb-4">
              {(orderStatus === "preparing" || orderStatus === "pending") && "Our chef is preparing your delicious meal"}
              {orderStatus === "ready" && "Your order is ready! Please collect from the canteen counter"}
              {(orderStatus === "completed" || orderStatus === "delivered") && "Your order has been completed. Thank you for your visit!"}
            </p>

            <Progress value={progress} className={`w-full ${themeConfig.progressColor}`} />
          </CardContent>
        </Card>


        {/* Status Timeline */}
        <Card className={`shadow-card ${themeConfig.borderColor} border-2`}>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {statusSteps.map((step, index) => (
                <div key={step.status} className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed 
                      ? "bg-success text-success-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {step.time && (
                      <p className="text-sm text-muted-foreground">{step.time}</p>
                    )}
                  </div>
                  {step.completed && (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Order Details</h3>
            <div className="space-y-3">
              {orderDetails.items && orderDetails.items.length > 0 ? (
                orderDetails.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>₹{item.price}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No items found in this order
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{orderDetails.total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pickup Location */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2 text-primary" />
              Pickup Location
            </h3>
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="font-medium">{orderDetails.pickupLocation}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Present the barcode above for quick order verification
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Need Help?</h3>
                <p className="text-sm text-muted-foreground">Contact canteen staff</p>
              </div>
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
        {orderStatus === "delivered" ? (
          <Button
            variant="food"
            size="mobile"
            className="w-full"
            onClick={() => setLocation("/home")}
          >
            Order Delivered - Browse Menu
          </Button>
        ) : orderStatus === "ready" ? (
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="mobile"
              className="flex-1"
              onClick={() => setLocation("/home")}
            >
              Browse Menu
            </Button>
            <Button
              variant="food"
              size="mobile"
              className="flex-1"
              disabled
            >
              Ready for Pickup
            </Button>
          </div>
        ) : (
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="mobile"
              className="flex-1"
              onClick={() => setLocation("/home")}
            >
              Browse Menu
            </Button>
            <Button
              variant="food"
              size="mobile"
              className="flex-1"
              onClick={() => refetch()}
            >
              Refresh Status
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}