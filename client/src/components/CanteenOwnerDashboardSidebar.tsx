import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { VegIndicator } from "@/components/ui/VegIndicator";
import type { MenuItem, Category, Order } from "@shared/schema";
import { formatOrderIdDisplay } from "@shared/utils";
import SyncStatus from "./SyncStatus";
import TestLogoutButton from "./TestLogoutButton";
import { useAuthSync } from "@/hooks/useDataSync";
import BarcodeDisplay from "./BarcodeDisplay";
import { 
  ChefHat, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Clock,
  Star,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Package,
  Bell,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  ScanLine,
  X,
  RefreshCcw,
  Search,
  Minus,
  ShoppingCart,
  Banknote,
  CreditCard
} from "lucide-react";
import { QuickOrdersManager } from "@/components/admin/QuickOrdersManager";
import { TrendingItemsManager } from "@/components/admin/TrendingItemsManager";
import CanteenOwnerMenuManagement from "@/components/CanteenOwnerMenuManagement";

// Sidebar Navigation Item Component
interface SidebarNavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

function SidebarNavItem({ icon: Icon, label, active, onClick, badge }: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      <div className="flex items-center">
        <Icon className="w-4 h-4 mr-3" />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <Badge variant={active ? "secondary" : "outline"} className="text-xs">
          {badge}
        </Badge>
      )}
    </button>
  );
}

// Helper functions for order status
const getOrderStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ready': return 'bg-green-100 text-green-800 border-green-200';
    case 'completed': case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getOrderStatusText = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'Pending';
    case 'preparing': return 'Preparing';
    case 'ready': return 'Ready';
    case 'completed': return 'Completed';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return status || 'Unknown';
  }
};

export default function CanteenOwnerDashboardSidebar() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const { user, isAuthenticated, isCanteenOwner } = useAuthSync();
  
  // State declarations
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [offlineSearchQuery, setOfflineSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<Array<{id: string, name: string, price: number, quantity: number}>>([]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scannedOrderId, setScannedOrderId] = useState("");

  // Priority queue ordering for active orders: preparing > ready > pending
  const getOrderPriority = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'preparing': return 1; // Highest priority
      case 'ready': return 2;
      case 'pending': return 3;
      default: return 4; // Lowest priority
    }
  };

  // Helper functions
  const generateOrderNumber = () => Math.floor(Math.random() * 900000000000) + 100000000000;
  const generateBarcode = () => Math.floor(Math.random() * 900000000000) + 100000000000;
  const getTotalAmount = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0);


  // Enhanced security check - redirect if not authenticated OR not canteen owner
  useEffect(() => {
    if (!isAuthenticated || !isCanteenOwner) {
      toast.error("Access denied. Canteen owner authentication required.");
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, isCanteenOwner, setLocation]);

  // Data fetching queries
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: menuItems = [], isLoading: menuItemsLoading, refetch: refetchMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: false, // Disable polling since we use SSE for real-time updates
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: analytics = {} } = useQuery<any>({
    queryKey: ["/api/admin/analytics"],
  });

  // Real-time order updates via Server-Sent Events (SSE) - Must be after queries
  useEffect(() => {
    if (!isAuthenticated || !isCanteenOwner) return;

    console.log("🔄 Setting up real-time order updates...");
    const eventSource = new EventSource('/api/events/orders');

    eventSource.onopen = () => {
      console.log("📡 Connected to real-time order updates");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Received real-time update:", data);
        
        if (data.type === 'new_order') {
          // Refresh orders when a new order is placed
          refetchOrders();
          toast.success("New order received!");
        } else if (data.type === 'order_updated' || data.type === 'order_status_changed') {
          // Refresh orders when there's an update
          refetchOrders();
          toast.success("Order updated!");
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("📡 SSE connection error:", error);
      // Automatically try to reconnect after 5 seconds
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("🔄 Attempting to reconnect to SSE...");
        }
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      console.log("📡 Closing real-time connection");
      eventSource.close();
    };
  }, [isAuthenticated, isCanteenOwner, refetchOrders]);

  // Filter orders
  // Filter and sort active orders - Priority queue: preparing > ready > pending
  const activeOrders = (orders as any[])
    .filter((order: any) => 
      order.status === "pending" || order.status === "preparing" || order.status === "ready"
    )
    .sort((a: any, b: any) => {
      // First sort by priority (preparing > ready > pending)
      const priorityDiff = getOrderPriority(a.status) - getOrderPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then sort by creation time (oldest first for same priority)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const allFilteredOrders = searchQuery 
    ? (orders as any[]).filter((order: any) => {
        const searchLower = searchQuery.toLowerCase();
        return order.orderNumber?.toLowerCase().includes(searchLower) ||
               order.customerName?.toLowerCase().includes(searchLower) ||
               order.items?.toLowerCase().includes(searchLower);
      })
    : orders;

  // Stats calculation
  const stats = [
    {
      title: "Today's Orders",
      value: analytics.totalOrders || 0,
      trend: "+12% from yesterday",
      icon: ShoppingBag
    },
    {
      title: "Revenue",
      value: `₹${analytics.totalRevenue || 0}`,
      trend: "+8% from yesterday", 
      icon: DollarSign
    },
    {
      title: "Active Orders",
      value: activeOrders.length,
      trend: "Live updates",
      icon: Clock
    },
    {
      title: "Menu Items",
      value: menuItems.length,
      trend: `${menuItems.filter((item: any) => item.available).length} available`,
      icon: ChefHat
    }
  ];



  // Mutations
  const placeOfflineOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setCart([]);
      toast.success("Counter order placed successfully!");
    },
    onError: () => {
      toast.error("Failed to place counter order. Please try again.");
    }
  });

  const markOrderReadyMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      // Refresh scan result to show updated status
      if (variables.status === "delivered") {
        setTimeout(() => {
          setScannedOrderId("");
          setScanResult(null);
        }, 2000); // Clear after 2 seconds to show success
      }
    },
    onError: () => {
      toast.error("Failed to update order status. Please try again.");
    }
  });

  const handlePlaceOfflineOrder = () => {
    if (cart.length === 0) {
      toast.error("Please add items to cart first");
      return;
    }

    setIsPlacingOrder(true);

    const orderData = {
      orderNumber: generateOrderNumber().toString(),
      customerId: user?.id || 2,
      customerName: `${user?.name || 'Canteen Owner'} - ${paymentMode === 'cash' ? 'Cash' : 'Online Payment'} Counter Sale`,
      items: JSON.stringify(cart),
      amount: getTotalAmount(),
      status: "delivered",
      estimatedTime: 0,
      barcode: generateBarcode().toString(),
      barcodeUsed: true,
      deliveredAt: new Date().toISOString()
    };

    placeOfflineOrderMutation.mutate(orderData);
    setIsPlacingOrder(false);
  };

  // Refresh all data function
  const refreshAllData = async () => {
    try {
      await Promise.all([
        refetchCategories(),
        refetchMenuItems(), 
        refetchOrders()
      ]);
      toast.success("Data refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        {/* Sidebar Header */}
        <div className="flex items-center space-x-3 p-6 border-b">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">KIT Canteen</h1>
            <p className="text-sm text-muted-foreground">Owner Dashboard</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-2">
          <SidebarNavItem 
            icon={BarChart3} 
            label="Overview" 
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          />
          <SidebarNavItem 
            icon={ShoppingBag} 
            label="Orders" 
            active={activeTab === "orders"}
            onClick={() => setActiveTab("orders")}
            badge={activeOrders.length > 0 ? activeOrders.length : undefined}
          />
          <SidebarNavItem 
            icon={ScanLine} 
            label="Scanner" 
            active={activeTab === "scanner"}
            onClick={() => setActiveTab("scanner")}
          />
          <SidebarNavItem 
            icon={ChefHat} 
            label="Menu Management" 
            active={activeTab === "menu"}
            onClick={() => setActiveTab("menu")}
          />
          <SidebarNavItem 
            icon={TrendingUp} 
            label="Content Manager" 
            active={activeTab === "content"}
            onClick={() => setActiveTab("content")}
          />
          <SidebarNavItem 
            icon={BarChart3} 
            label="Analytics" 
            active={activeTab === "analytics"}
            onClick={() => setActiveTab("analytics")}
          />
          <SidebarNavItem 
            icon={Package} 
            label="Inventory" 
            active={activeTab === "inventory"}
            onClick={() => setActiveTab("inventory")}
          />
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t space-y-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowNotifications(true)}
            className="w-full justify-start relative"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
            {notifications.filter(n => !n.read).length > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {notifications.filter(n => !n.read).length}
              </Badge>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowSettings(true)}
            className="w-full justify-start"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="border-b bg-card/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <SyncStatus />
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshAllData}
                disabled={categoriesLoading || menuItemsLoading || ordersLoading}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/login")}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Overview Content */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-success">{stat.trend}</p>
                          </div>
                          <stat.icon className="w-8 h-8 text-primary/60" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Recent Orders Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Recent Orders
                      <Button size="sm" onClick={() => setActiveTab("orders")}>
                        View All
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(orders as any[]).slice(0, 3).map((order: any) => (
                        <div 
                          key={order.id} 
                          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => setLocation(`/canteen-order-detail/${order.id}`)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center font-medium">
                                <span>#{(() => {
                                  const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                  return formatted.prefix;
                                })()}</span>
                                <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-0">
                                  {(() => {
                                    const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                    return formatted.highlighted;
                                  })()}
                                </span>
                              </div>
                              <Badge className={getOrderStatusColor(order.status)}>
                                {getOrderStatusText(order.status)}
                              </Badge>
                              {(() => {
                                try {
                                  const items = JSON.parse(order.items || '[]');
                                  const hasMarkableItem = items.some((item: any) => {
                                    const menuItem = menuItems.find(mi => mi.id === item.id);
                                    return menuItem?.isMarkable === true;
                                  });
                                  return (
                                    <Badge 
                                      variant={hasMarkableItem ? "secondary" : "outline"}
                                      className={hasMarkableItem ? "bg-orange-100 text-orange-800 border-orange-200" : "bg-green-100 text-green-800 border-green-200"}
                                    >
                                      {hasMarkableItem ? "Requires Prep" : "Auto-Ready"}
                                    </Badge>
                                  );
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                            <p className="text-sm text-muted-foreground">Customer: {order.customerName || 'N/A'}</p>
                            <p className="text-sm">
                              {order.items && typeof order.items === 'string' 
                                ? (() => {
                                    try {
                                      const parsedItems = JSON.parse(order.items);
                                      return Array.isArray(parsedItems) 
                                        ? parsedItems.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')
                                        : order.items;
                                    } catch {
                                      return order.items;
                                    }
                                  })()
                                : 'No items'
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₹{order.amount}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : order.time || 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Orders Content */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5" />
                        Order Management
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="Search orders by ID, customer, or items..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-80"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="active" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="active">Active Orders ({activeOrders.length})</TabsTrigger>
                        <TabsTrigger value="all">All Orders ({allFilteredOrders.length})</TabsTrigger>
                        <TabsTrigger value="offline">Offline Counter Orders</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="active">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Active Orders (Priority Queue)</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{activeOrders.length} active</Badge>
                              <span className="text-xs text-muted-foreground">
                                Priority: Preparing → Ready → Pending
                              </span>
                            </div>
                          </div>
                          
                          {activeOrders.length === 0 ? (
                            <div className="text-center py-8">
                              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p className="text-muted-foreground">No active orders</p>
                              <p className="text-sm text-muted-foreground mt-2">Active orders will appear here when customers place orders</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {activeOrders.map((order: any) => (
                                <Card key={order.id} className={`border-l-4 ${
                                  order.status === 'preparing' ? 'border-l-blue-500' : 
                                  order.status === 'ready' ? 'border-l-green-500' : 
                                  'border-l-yellow-500'
                                }`}>
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <div className="flex items-center font-medium">
                                            <span>#{(() => {
                                              const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                              return formatted.prefix;
                                            })()}</span>
                                            <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-0">
                                              {(() => {
                                                const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                                return formatted.highlighted;
                                              })()}
                                            </span>
                                          </div>
                                          <Badge className={getOrderStatusColor(order.status)}>
                                            {getOrderStatusText(order.status)}
                                          </Badge>
                                          <Badge variant="secondary">{order.estimatedTime}m</Badge>
                                          {(() => {
                                            try {
                                              const items = JSON.parse(order.items || '[]');
                                              const hasMarkableItem = items.some((item: any) => {
                                                const menuItem = menuItems.find(mi => mi.id === item.id);
                                                return menuItem?.isMarkable === true;
                                              });
                                              return (
                                                <Badge 
                                                  variant={hasMarkableItem ? "secondary" : "outline"}
                                                  className={hasMarkableItem ? "bg-orange-100 text-orange-800 border-orange-200" : "bg-green-100 text-green-800 border-green-200"}
                                                >
                                                  {hasMarkableItem ? "Prep Required" : "Auto-Ready"}
                                                </Badge>
                                              );
                                            } catch {
                                              return null;
                                            }
                                          })()}
                                        </div>
                                        <p className="text-sm text-muted-foreground">Customer: {order.customerName}</p>
                                        <p className="text-sm">
                                          {order.items && typeof order.items === 'string' 
                                            ? (() => {
                                                try {
                                                  const parsedItems = JSON.parse(order.items);
                                                  return Array.isArray(parsedItems) 
                                                    ? parsedItems.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')
                                                    : order.items;
                                                } catch {
                                                  return order.items;
                                                }
                                              })()
                                            : 'No items'
                                          }
                                        </p>
                                      </div>
                                      <div className="text-right space-y-2">
                                        <p className="font-semibold">₹{order.amount}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'N/A'}
                                        </p>
                                        <div className="flex flex-col space-y-2">
                                          {/* Show Mark Ready button for preparing orders or pending orders with markable items */}
                                          {(order.status === "preparing" || 
                                            (order.status === "pending" && (() => {
                                              try {
                                                const items = JSON.parse(order.items || '[]');
                                                return items.some((item: any) => {
                                                  const menuItem = menuItems.find(mi => mi.id === item.id);
                                                  return menuItem?.isMarkable === true;
                                                });
                                              } catch {
                                                return false;
                                              }
                                            })())
                                          ) && (
                                            <Button
                                              size="sm"
                                              variant="default"
                                              onClick={() => markOrderReadyMutation.mutate({ orderId: order.id, status: "ready" })}
                                              disabled={markOrderReadyMutation.isPending}
                                              className="bg-green-600 hover:bg-green-700 text-white"
                                              data-testid={`button-mark-ready-${order.id}`}
                                            >
                                              {markOrderReadyMutation.isPending ? "Updating..." : "Mark Ready"}
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setLocation(`/canteen-order-detail/${order.id}`)}
                                            data-testid={`button-view-details-${order.id}`}
                                          >
                                            View Details
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="all">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">All Orders</h3>
                            <Badge variant="outline">{allFilteredOrders.length} total</Badge>
                          </div>
                          
                          {allFilteredOrders.length === 0 ? (
                            <div className="text-center py-8">
                              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p className="text-muted-foreground">No orders found</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {allFilteredOrders.map((order: any) => (
                                <Card key={order.id} className="hover:shadow-md transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <div className="flex items-center font-medium">
                                            <span>#{(() => {
                                              const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                              return formatted.prefix;
                                            })()}</span>
                                            <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-0">
                                              {(() => {
                                                const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                                return formatted.highlighted;
                                              })()}
                                            </span>
                                          </div>
                                          <Badge className={getOrderStatusColor(order.status)}>
                                            {getOrderStatusText(order.status)}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Customer: {order.customerName}</p>
                                        <p className="text-sm">
                                          {order.items && typeof order.items === 'string' 
                                            ? (() => {
                                                try {
                                                  const parsedItems = JSON.parse(order.items);
                                                  return Array.isArray(parsedItems) 
                                                    ? parsedItems.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')
                                                    : order.items;
                                                } catch {
                                                  return order.items;
                                                }
                                              })()
                                            : 'No items'
                                          }
                                        </p>
                                      </div>
                                      <div className="text-right space-y-2">
                                        <p className="font-semibold">₹{order.amount}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                                        </p>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setLocation(`/canteen-order-detail/${order.id}`)}
                                        >
                                          View Details
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="offline">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">Offline Counter Orders</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">Total: ₹{getTotalAmount()}</Badge>
                              <Select value={paymentMode} onValueChange={(value: 'cash' | 'online') => setPaymentMode(value)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="online">Online</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Menu Items */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                  <span>Menu Items</span>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      placeholder="Search menu..."
                                      value={offlineSearchQuery}
                                      onChange={(e) => setOfflineSearchQuery(e.target.value)}
                                      className="w-48"
                                    />
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {categories.map((category) => (
                                          <SelectItem key={category.id} value={category.name}>
                                            {category.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="max-h-96 overflow-auto">
                                <div className="space-y-2">
                                  {menuItems.filter(item => {
                                    const matchesSearch = offlineSearchQuery === "" || 
                                      item.name.toLowerCase().includes(offlineSearchQuery.toLowerCase());
                                    const matchesCategory = selectedCategory === "all" || 
                                      categories.find(cat => cat.id === item.categoryId)?.name === selectedCategory;
                                    return matchesSearch && matchesCategory && item.available && item.stock > 0;
                                  }).map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium">{item.name}</span>
                                          <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">₹{item.price}</p>
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          const existingItem = cart.find(cartItem => cartItem.id === item.id);
                                          if (existingItem) {
                                            setCart(cart.map(cartItem => 
                                              cartItem.id === item.id 
                                                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                                : cartItem
                                            ));
                                          } else {
                                            setCart([...cart, { 
                                              id: item.id, 
                                              name: item.name, 
                                              price: item.price, 
                                              quantity: 1 
                                            }]);
                                          }
                                        }}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Cart */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                  <span>Current Order</span>
                                  {cart.length > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCart([])}
                                    >
                                      Clear Cart
                                    </Button>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {cart.length === 0 ? (
                                  <div className="text-center py-8">
                                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground">No items in cart</p>
                                    <p className="text-sm text-muted-foreground mt-2">Add items from the menu</p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="space-y-3 max-h-48 overflow-auto">
                                      {cart.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                                          <div className="flex-1">
                                            <span className="font-medium">{item.name}</span>
                                            <p className="text-sm text-muted-foreground">₹{item.price} × {item.quantity}</p>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                if (item.quantity > 1) {
                                                  setCart(cart.map((cartItem, i) => 
                                                    i === index 
                                                      ? { ...cartItem, quantity: cartItem.quantity - 1 }
                                                      : cartItem
                                                  ));
                                                } else {
                                                  setCart(cart.filter((_, i) => i !== index));
                                                }
                                              }}
                                            >
                                              <Minus className="w-4 h-4" />
                                            </Button>
                                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setCart(cart.map((cartItem, i) => 
                                                  i === index 
                                                    ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                                    : cartItem
                                                ));
                                              }}
                                            >
                                              <Plus className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => setCart(cart.filter((_, i) => i !== index))}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    <div className="border-t pt-4">
                                      <div className="flex items-center justify-between mb-4">
                                        <span className="text-lg font-semibold">Total: ₹{getTotalAmount()}</span>
                                        <Badge variant="secondary">{paymentMode === 'cash' ? 'Cash Payment' : 'Online Payment'}</Badge>
                                      </div>
                                      <Button 
                                        className="w-full" 
                                        onClick={handlePlaceOfflineOrder}
                                        disabled={isPlacingOrder || placeOfflineOrderMutation.isPending}
                                      >
                                        {isPlacingOrder || placeOfflineOrderMutation.isPending ? (
                                          "Processing..."
                                        ) : (
                                          `Place ${paymentMode === 'cash' ? 'Cash' : 'Online'} Order`
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Scanner Content */}
            {activeTab === "scanner" && (
              <div className="space-y-6">
                {/* Order ID Scanner */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ScanLine className="w-5 h-5" />
                      Order Scanner
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="scanned-order-id">Order ID or Barcode</Label>
                      <Input
                        id="scanned-order-id"
                        data-testid="input-scanner-order-id"
                        placeholder="Enter or scan order ID (12 digits)"
                        value={scannedOrderId}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setScannedOrderId(value);
                          setScanError("");
                        }}
                        maxLength={12}
                        className="text-lg font-mono"
                      />
                    </div>


                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => {
                          if (!scannedOrderId.trim()) {
                            setScanError("Please enter an Order ID");
                            return;
                          }
                          
                          if (!/^[0-9]{12}$/.test(scannedOrderId)) {
                            setScanError("Order ID must be exactly 12 digits");
                            return;
                          }
                          
                          // Find the order
                          const foundOrder = orders.find(o => 
                            o.orderNumber === scannedOrderId || 
                            o.barcode === scannedOrderId ||
                            o.id.toString() === scannedOrderId
                          );
                          
                          if (foundOrder) {
                            setScanResult(foundOrder);
                            setScanError("");
                            
                            // If order is ready, automatically mark as delivered
                            if (foundOrder.status === "ready") {
                              markOrderReadyMutation.mutate({ orderId: foundOrder.id, status: "delivered" });
                            }
                          } else {
                            setScanError("Invalid order ID - Order not found");
                            setScanResult(null);
                          }
                        }}
                        disabled={!scannedOrderId.trim()}
                        className="flex-1"
                        data-testid="button-scan-order"
                      >
                        <ScanLine className="w-4 h-4 mr-2" />
                        Scan Order
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setScannedOrderId("");
                          setScanResult(null);
                          setScanError("");
                        }}
                        data-testid="button-clear-scanner"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {scanError && (
                      <div className="p-3 rounded border border-red-500/50 bg-red-50 dark:bg-red-950/20">
                        <div className="flex items-center text-red-700 dark:text-red-300">
                          <XCircle className="w-4 h-4 mr-2" />
                          {scanError}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scanned Order Details */}
                {scanResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Order Details</span>
                        <Badge className={getOrderStatusColor(scanResult.status)}>
                          {getOrderStatusText(scanResult.status)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Order Number</p>
                          <p className="font-mono font-medium">{scanResult.orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Customer</p>
                          <p className="font-medium">{scanResult.customerName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="font-medium">₹{scanResult.amount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Time</p>
                          <p className="font-medium">
                            {scanResult.createdAt ? new Date(scanResult.createdAt).toLocaleTimeString() : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Items</p>
                        <div className="text-sm">
                          {scanResult.items && typeof scanResult.items === 'string' 
                            ? (() => {
                                try {
                                  const parsedItems = JSON.parse(scanResult.items);
                                  return Array.isArray(parsedItems) 
                                    ? parsedItems.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')
                                    : scanResult.items;
                                } catch {
                                  return scanResult.items;
                                }
                              })()
                            : 'No items'
                          }
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2 pt-4 border-t">
                        {(scanResult.status === "preparing" || 
                          (scanResult.status === "pending" && (() => {
                            try {
                              const items = JSON.parse(scanResult.items || '[]');
                              return items.some((item: any) => {
                                const menuItem = menuItems.find(mi => mi.id === item.id);
                                return menuItem?.isMarkable === true;
                              });
                            } catch {
                              return false;
                            }
                          })())) && (
                          <Button
                            onClick={() => {
                              markOrderReadyMutation.mutate(scanResult.id);
                              // Clear scan result after marking ready
                              setTimeout(() => {
                                setScannedOrderId("");
                                setScanResult(null);
                              }, 1000);
                            }}
                            disabled={markOrderReadyMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            data-testid="button-mark-ready-scanner"
                          >
                            {markOrderReadyMutation.isPending ? "Updating..." : "Mark Ready"}
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          onClick={() => setLocation(`/canteen-order-detail/${scanResult.id}`)}
                          data-testid="button-view-details-scanner"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Counter Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ShoppingCart className="w-5 h-5" />
                      Quick Counter Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Filtered Menu Items */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Available Items</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-3">
                          {menuItems.filter((item: any) => item.available && item.stock > 0).slice(0, 6).map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-2 border rounded hover:bg-accent/50">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{item.name}</div>
                                <div className="text-sm font-semibold text-primary">₹{item.price}</div>
                                <div className="text-xs text-muted-foreground">Stock: {item.stock}</div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const existingItem = cart.find(cartItem => cartItem.id === item.id);
                                  if (existingItem) {
                                    setCart(cart.map(cartItem => 
                                      cartItem.id === item.id 
                                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                        : cartItem
                                    ));
                                  } else {
                                    setCart([...cart, { id: item.id, name: item.name, price: item.price, quantity: 1 }]);
                                  }
                                  toast.success(`Added ${item.name} to cart`);
                                }}
                                disabled={item.stock <= 0}
                                data-testid={`button-add-${item.id}`}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cart */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Cart ({cart.length})</h4>
                          {cart.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCart([])}
                              data-testid="button-clear-cart"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        
                        {cart.length === 0 ? (
                          <div className="border rounded p-4 text-center text-muted-foreground">
                            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Cart is empty</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                              {cart.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <span>{item.quantity}x {item.name}</span>
                                  <div className="flex items-center space-x-1">
                                    <span>₹{item.price * item.quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setCart(cart.filter(cartItem => cartItem.id !== item.id))}
                                      data-testid={`button-remove-${item.id}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="border-t pt-2">
                              <div className="flex justify-between font-semibold">
                                <span>Total:</span>
                                <span>₹{getTotalAmount()}</span>
                              </div>
                              
                              <div className="flex space-x-2 mt-3">
                                <Select value={paymentMode} onValueChange={(value: 'cash' | 'online') => setPaymentMode(value)}>
                                  <SelectTrigger className="flex-1" data-testid="select-payment-mode">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">Cash Payment</SelectItem>
                                    <SelectItem value="online">Online Payment</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Button
                                  onClick={handlePlaceOfflineOrder}
                                  disabled={isPlacingOrder || cart.length === 0}
                                  className="bg-primary text-primary-foreground"
                                  data-testid="button-place-order"
                                >
                                  {isPlacingOrder ? "Processing..." : "Place Order"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Menu Content */}
            {activeTab === "menu" && (
              <CanteenOwnerMenuManagement 
                menuItems={menuItems} 
                categories={categories}
                onMenuUpdate={refetchMenuItems}
              />
            )}

            {/* Content Manager */}
            {activeTab === "content" && (
              <div className="space-y-6">
                <QuickOrdersManager />
                <TrendingItemsManager />
              </div>
            )}

            {/* Analytics Content */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5" />
                      Analytics Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">Analytics and reports</p>
                      <p className="text-sm text-muted-foreground mt-2">View sales reports and trends</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Inventory Content */}
            {activeTab === "inventory" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      Inventory Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">Inventory tracking</p>
                      <p className="text-sm text-muted-foreground mt-2">Monitor stock levels and supplies</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifications.map((notification: any) => (
                <div key={notification.id} className="p-3 border rounded-lg">
                  <p className="font-medium">{notification.type}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Settings panel</p>
                  <p className="text-sm text-muted-foreground mt-2">Configure your canteen settings</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}