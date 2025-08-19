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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { VegIndicator } from "@/components/ui/VegIndicator";
import type { MenuItem, Category, Order } from "@shared/schema";
import { formatOrderIdDisplay } from "@shared/utils";
import SyncStatus from "./SyncStatus";
import TestLogoutButton from "./TestLogoutButton";
import { useAuthSync } from "@/hooks/useDataSync";
import { usePaginatedOrders } from "@/hooks/usePaginatedOrders";
import { usePaginatedActiveOrders } from "@/hooks/usePaginatedActiveOrders";
import { useOrderSearch } from "@/hooks/useOrderSearch";
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
  CreditCard,
  CalendarDays,
  ChevronDown,
  Filter,
  Loader2,
  Receipt,
  User,
  Maximize,
  Minimize
} from "lucide-react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
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
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [selectedOrderForScan, setSelectedOrderForScan] = useState<any>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedOrder, setScannedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState(false);
  const [showOrderDetailPopup, setShowOrderDetailPopup] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);
  const [isStoreMode, setIsStoreMode] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);

  // Helper functions
  const generateOrderNumber = () => Math.floor(Math.random() * 900000000000) + 100000000000;
  const generateBarcode = () => Math.floor(Math.random() * 900000000000) + 100000000000;
  const getTotalAmount = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Date filtering functions for analytics
  const getDateRange = (timeframe: string, date: Date) => {
    const now = new Date(date);
    let startDate: Date, endDate: Date;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        startDate = startOfWeek;
        endDate = new Date(startOfWeek);
        endDate.setDate(startOfWeek.getDate() + 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'annual':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }
    return { startDate, endDate };
  };

  const filterOrdersByDateRange = (orders: any[], startDate: Date, endDate: Date) => {
    return orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate < endDate;
    });
  };

  const calculateAnalytics = (filteredOrders: any[]) => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const statusCounts = filteredOrders.reduce((acc: any, order: any) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const itemStats: any = {};
    filteredOrders.forEach((order: any) => {
      if (order.items && typeof order.items === 'string') {
        try {
          const parsedItems = JSON.parse(order.items);
          if (Array.isArray(parsedItems)) {
            parsedItems.forEach((item: any) => {
              const key = item.name || item.id;
              if (!itemStats[key]) {
                itemStats[key] = {
                  name: item.name,
                  quantity: 0,
                  revenue: 0,
                  orders: 0
                };
              }
              itemStats[key].quantity += item.quantity || 1;
              itemStats[key].revenue += (item.price || 0) * (item.quantity || 1);
              itemStats[key].orders += 1;
            });
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    });

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      statusCounts,
      itemStats
    };
  };


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

  // Use both regular orders for active orders (for real-time updates) and paginated orders for all orders
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: false, // Disable polling since we use SSE for real-time updates
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  // Paginated orders for all orders tab
  const {
    orders: paginatedOrders,
    totalCount: totalOrdersCount,
    totalPages,
    currentPage,
    isLoading: paginatedLoading,
    refetch: refetchPaginated,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    hasNextPage,
    hasPreviousPage,
  } = usePaginatedOrders(1, 15);

  // Active orders pagination hook
  const {
    orders: paginatedActiveOrders,
    totalCount: totalActiveOrdersCount,
    totalPages: totalActivePages,
    currentPage: currentActivePage,
    isLoading: paginatedActiveLoading,
    goToPage: goToActivePage,
    goToNextPage: goToActiveNextPage,
    goToPreviousPage: goToActivePreviousPage,
    goToFirstPage: goToActiveFirstPage,
    goToLastPage: goToActiveLastPage,
    hasNextPage: hasActiveNextPage,
    hasPreviousPage: hasActivePreviousPage,
  } = usePaginatedActiveOrders(1, 15);

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: analytics = {} } = useQuery<any>({
    queryKey: ["/api/admin/analytics"],
  });

  // Quick Orders query
  const { data: quickOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/quick-orders"],
  });

  // Order search hook
  const searchResults = useOrderSearch(searchQuery);

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
          console.log("🔄 Processing new order update, refreshing data...");
          // Refresh both regular and paginated orders
          refetchOrders();
          refetchPaginated();
          toast.success(`New order received! Order #${data.data?.orderNumber || 'Unknown'}`);
        } else if (data.type === 'order_updated' || data.type === 'order_status_changed') {
          console.log("🔄 Processing order status update, refreshing data...");
          // Refresh both regular and paginated orders
          refetchOrders();
          refetchPaginated();
          toast.success(`Order ${data.data?.orderNumber || 'Unknown'} status updated!`);
        } else if (data.type === 'connected') {
          console.log("✅ SSE connection confirmed");
        } else if (data.type === 'ping') {
          // Ignore ping messages, just log occasionally
          if (Math.random() < 0.1) { // Log only 10% of pings to avoid spam
            console.log("📡 SSE keep-alive ping received");
          }
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error, "Raw data:", event.data);
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
  // Filter and sort active orders - FIFO (First In, First Out)
  const activeOrders = (orders as any[])
    .filter((order: any) => {
      // Filter by status first
      const isActiveStatus = order.status === "pending" || order.status === "preparing" || order.status === "ready";
      
      // If no search query, return all active orders
      if (!searchQuery) return isActiveStatus;
      
      // If there's a search query, also apply search filter
      if (isActiveStatus) {
        const searchLower = searchQuery.toLowerCase();
        return order.orderNumber?.toLowerCase().includes(searchLower) ||
               order.customerName?.toLowerCase().includes(searchLower) ||
               order.items?.toLowerCase().includes(searchLower);
      }
      
      return false;
    })
    .sort((a: any, b: any) => {
      // FIFO ordering - sort by creation time only (oldest first)
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
      if (variables.status === "delivered") {
        toast.success("Order marked as delivered!");
        setTimeout(() => {
          setShowBarcodeDialog(false);
          setSelectedOrderForScan(null);
          setBarcodeInput("");
          setScannedOrder(null);
          setShowOrderDetails(false);
        }, 1500); // Clear after 1.5 seconds to show success
      }
    },
    onError: () => {
      toast.error("Failed to update order status. Please try again.");
    }
  });

  // Mark order as seen mutation
  const markOrderSeenMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest(`/api/orders/${orderId}/mark-seen`, {
        method: "PATCH",
        body: JSON.stringify({ userId: user?.id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: () => {
      // Silently fail - not critical if marking as seen fails
      console.error("Failed to mark order as seen");
    }
  });

  // Handle barcode scan functionality
  const handleScanBarcode = (order: any) => {
    setSelectedOrderForScan(order);
    setBarcodeInput("");
    setScannedOrder(null);
    setShowOrderDetails(false);
    setShowBarcodeDialog(true);
  };

  // Handle barcode input submission
  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) {
      toast.error("Please enter a barcode");
      return;
    }

    // Find the order with matching barcode
    const matchingOrder = orders.find((order: any) => 
      order.barcode === barcodeInput || 
      order.orderNumber === barcodeInput ||
      order.id === barcodeInput
    );

    if (matchingOrder) {
      // Check if the scanned barcode matches the selected order
      if (selectedOrderForScan && 
          selectedOrderForScan.id !== matchingOrder.id &&
          selectedOrderForScan.barcode !== barcodeInput &&
          selectedOrderForScan.orderNumber !== barcodeInput) {
        toast.error("This barcode doesn't match the selected order. Please scan the correct barcode.");
        setBarcodeInput("");
        return;
      }
      
      console.log("🔍 Barcode scan successful, showing order details in dialog");
      setScannedOrder(matchingOrder);
      setShowOrderDetails(true);
      // Keep the dialog open to show order details within the popup - DO NOT NAVIGATE
    } else {
      toast.error("No order found with this barcode");
      setBarcodeInput("");
    }
  };

  // Handle keyboard events for barcode scanning dialog
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (showBarcodeDialog) {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (!showOrderDetails && barcodeInput.trim()) {
            // If order details not shown yet, submit barcode
            handleBarcodeSubmit();
          } else if (showOrderDetails && scannedOrder) {
            // If order details are shown, mark as delivered
            markOrderReadyMutation.mutate({ 
              orderId: scannedOrder.id, 
              status: "delivered" 
            });
          }
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setShowBarcodeDialog(false);
          setSelectedOrderForScan(null);
          setBarcodeInput("");
          setScannedOrder(null);
          setShowOrderDetails(false);
        }
      }
    };

    if (showBarcodeDialog) {
      document.addEventListener('keydown', handleKeyPress);
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [showBarcodeDialog, showOrderDetails, scannedOrder, barcodeInput, markOrderReadyMutation, handleBarcodeSubmit]);

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
      deliveredAt: new Date().toISOString(),
      isCounterOrder: true // Flag to indicate this is a counter order that should stay delivered
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

  // Handle order card click for details popup and mark as seen
  const handleOrderCardClick = (order: any) => {
    console.log("📋 Order card clicked for order:", order.id);
    
    // Mark as seen if user hasn't seen this order yet
    if (user?.id && (!order.seenBy || !order.seenBy.includes(user.id))) {
      markOrderSeenMutation.mutate(order.id);
    }
    
    setSelectedOrderForDetails(order);
    setShowOrderDetailPopup(true);
  };

  // Helper function to check if order is unseen by current user
  const isOrderUnseen = (order: any) => {
    return user?.id && (!order.seenBy || !order.seenBy.includes(user.id));
  };

  // Store Mode Layout
  if (isStoreMode) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-hidden">
        {/* Store Mode Header */}
        <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">KIT Canteen - Store Mode</h1>
              <p className="text-sm text-muted-foreground">Rush Business Mode</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="animate-pulse">
              <Clock className="w-3 h-3 mr-1" />
              Live Mode
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAllData}
              data-testid="button-refresh-store-mode"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStoreMode(false)}
              data-testid="button-exit-store-mode"
            >
              <Minimize className="w-4 h-4 mr-2" />
              Exit Store Mode
            </Button>
          </div>
        </div>

        {/* Store Mode Main Content */}
        <div className="h-[calc(100vh-4rem)]">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Left Side - Orders with Tabs */}
            <Panel defaultSize={50} minSize={30}>
              <div className="h-full bg-background border-r border-border">
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-border">
                    <div className="w-full">
                      
                      <div className="h-[calc(100vh-12rem)] overflow-hidden">
                        <div className="h-full flex flex-col">
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h2 className="text-xl font-semibold flex items-center">
                                <ShoppingBag className="w-5 h-5 mr-2" />
                                Active Orders
                              </h2>
                              <Badge variant="destructive" className="text-lg px-3 py-1">
                                {activeOrders.length}
                              </Badge>
                            </div>
                            <Input
                              placeholder="Search active orders..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full"
                              data-testid="input-search-active-orders"
                            />
                          </div>
                          
                          <div className="flex-1 overflow-auto p-4">
                {activeOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl text-muted-foreground">No Active Orders</p>
                    <p className="text-sm text-muted-foreground mt-2">New orders will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeOrders.map((order: any) => (
                      <Card key={order.id} className={`border-l-4 cursor-pointer hover:shadow-lg transition-shadow ${
                        order.status === 'preparing' ? 'border-l-blue-500' : 
                        order.status === 'ready' ? 'border-l-green-500' : 
                        'border-l-yellow-500'
                      } ${isOrderUnseen(order) ? 'bg-green-50 border-green-200' : ''}`} onClick={() => handleOrderCardClick(order)}>
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
                                {(() => {
                                  try {
                                    const items = JSON.parse(order.items || '[]');
                                    const hasMarkableItem = items.some((item: any) => {
                                      const menuItem = menuItems.find(mi => mi.id === item.id);
                                      return menuItem?.isMarkable === true;
                                    });
                                    
                                    // Auto-Ready orders show Scan Barcode button when ready
                                    if (!hasMarkableItem && order.status === "ready") {
                                      return (
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleScanBarcode(order);
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                          data-testid={`button-scan-barcode-${order.id}`}
                                        >
                                          <ScanLine className="w-4 h-4 mr-2" />
                                          Scan Barcode
                                        </Button>
                                      );
                                    }
                                    
                                    // Prep Required orders show Mark Ready button when pending/preparing
                                    if (hasMarkableItem && (order.status === "pending" || order.status === "preparing")) {
                                      return (
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            markOrderReadyMutation.mutate({ orderId: order.id, status: "ready" });
                                          }}
                                          disabled={markOrderReadyMutation.isPending}
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                          data-testid={`button-mark-ready-${order.id}`}
                                        >
                                          {markOrderReadyMutation.isPending ? "Updating..." : "Mark Ready"}
                                        </Button>
                                      );
                                    }
                                    
                                    // Prep Required orders show Scan Barcode button when ready
                                    if (hasMarkableItem && order.status === "ready") {
                                      return (
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleScanBarcode(order);
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                          data-testid={`button-scan-barcode-${order.id}`}
                                        >
                                          <ScanLine className="w-4 h-4 mr-2" />
                                          Scan Barcode
                                        </Button>
                                      );
                                    }
                                    
                                    return null;
                                  } catch {
                                    return null;
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
            
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />

            {/* Right Side - Two Sections */}
            <Panel defaultSize={50} minSize={30}>
              <PanelGroup direction="vertical" className="h-full">
                {/* Right Top - Enhanced Quick Counter */}
                <Panel defaultSize={50} minSize={30}>
                  <div className="h-full border-b border-border bg-card">
                    <div className="h-full flex flex-col">
                      <div className="p-2 border-b border-border">
                        {/* Single row layout with all controls */}
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold flex items-center whitespace-nowrap">
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Quick Counter
                          </h3>
                          
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            Total: ₹{getTotalAmount()}
                          </Badge>
                          
                          <Input
                            placeholder="Search menu..."
                            value={offlineSearchQuery}
                            onChange={(e) => setOfflineSearchQuery(e.target.value)}
                            className="flex-1 h-7 text-xs min-w-0"
                            data-testid="input-search-counter-menu"
                          />
                          
                          <Select value={paymentMode} onValueChange={(value: 'cash' | 'online') => setPaymentMode(value)}>
                            <SelectTrigger className="w-16 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-24 h-7 text-xs">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs whitespace-nowrap"
                            onClick={() => {
                              console.log("Cart button clicked, current showCartDialog:", showCartDialog);
                              setShowCartDialog(true);
                              console.log("setShowCartDialog(true) called");
                            }}
                            data-testid="button-show-cart"
                          >
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            Cart ({cart.length})
                          </Button>
                        </div>
                      </div>
                
                <div className="flex-1 overflow-auto">
                  {/* Quick Orders Section */}
                  <div className="p-2 border-b">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">QUICK ORDERS</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {quickOrders
                        .filter((qo: any) => qo.isActive && qo.menuItem && qo.menuItem.available && qo.menuItem.stock > 0)
                        .sort((a: any, b: any) => a.position - b.position)
                        .slice(0, 4)
                        .map((quickOrder: any) => {
                          const item = quickOrder.menuItem;
                          const cartItem = cart.find(cartItem => cartItem.id === item.id);
                          const quantity = cartItem?.quantity || 0;
                          
                          return (
                            <Card 
                              key={quickOrder.id} 
                              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover-scale border-2 border-primary/20 hover:border-primary/40"
                              data-testid={`quick-order-tile-${quickOrder.id}`}
                            >
                              <CardContent className="p-1.5 text-center">
                                <div className="w-full h-8 bg-gradient-to-br from-primary to-primary/80 rounded flex items-center justify-center mb-1">
                                  <span className="text-sm">🍽️</span>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-center space-x-1">
                                    <h3 className="font-semibold text-[11px] line-clamp-1">{item.name}</h3>
                                    <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                                  </div>
                                  <p className="text-[10px] font-bold text-primary">₹{item.price}</p>
                                  {quantity > 0 ? (
                                    <div className="flex items-center justify-center space-x-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-4 w-4 p-0 rounded-full text-[8px]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (quantity === 1) {
                                            setCart(cart.filter(cartItem => cartItem.id !== item.id));
                                          } else {
                                            setCart(cart.map(cartItem => 
                                              cartItem.id === item.id 
                                                ? { ...cartItem, quantity: cartItem.quantity - 1 }
                                                : cartItem
                                            ));
                                          }
                                        }}
                                      >
                                        <Minus className="w-2 h-2" />
                                      </Button>
                                      <span className="text-[11px] font-bold min-w-[10px] text-center">{quantity}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-4 w-4 p-0 rounded-full bg-primary hover:bg-primary/90 text-white border-primary text-[8px]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCart(cart.map(cartItem => 
                                            cartItem.id === item.id 
                                              ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                              : cartItem
                                          ));
                                        }}
                                      >
                                        <Plus className="w-2 h-2" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-full px-2 py-1 bg-primary hover:bg-primary/90 text-white border-primary font-medium text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCart([...cart, { 
                                          id: item.id, 
                                          name: item.name, 
                                          price: item.price, 
                                          quantity: 1 
                                        }]);
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </div>

                  {/* Trending Orders Section */}
                  <div className="p-2 border-b">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">TRENDING ORDERS</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {(() => {
                        // Calculate trending items based on recent order frequency
                        const itemOrderCounts: { [itemId: string]: number } = {};
                        
                        // Count items from recent orders
                        orders.forEach((order: any) => {
                          if (order.items && typeof order.items === 'string') {
                            try {
                              const parsedItems = JSON.parse(order.items);
                              if (Array.isArray(parsedItems)) {
                                parsedItems.forEach((orderItem: any) => {
                                  if (orderItem.id) {
                                    itemOrderCounts[orderItem.id] = (itemOrderCounts[orderItem.id] || 0) + (orderItem.quantity || 1);
                                  }
                                });
                              }
                            } catch {
                              // Skip invalid JSON
                            }
                          }
                        });
                        
                        // Get trending items based on order frequency
                        const trendingItems = menuItems
                          .filter(item => item.available && item.stock > 0)
                          .map(item => ({
                            ...item,
                            orderFrequency: itemOrderCounts[item.id] || 0
                          }))
                          .sort((a, b) => b.orderFrequency - a.orderFrequency)
                          .slice(0, 4);
                        
                        return trendingItems.map((item) => {
                          const cartItem = cart.find(cartItem => cartItem.id === item.id);
                          const quantity = cartItem?.quantity || 0;
                          
                          return (
                            <Card 
                              key={item.id} 
                              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover-scale border-2 border-orange-200 hover:border-orange-400"
                              data-testid={`trending-tile-${item.id}`}
                            >
                              <CardContent className="p-1.5 text-center">
                                <div className="w-full h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded flex items-center justify-center mb-1">
                                  <span className="text-sm">🔥</span>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-center space-x-1">
                                    <h3 className="font-semibold text-[11px] line-clamp-1">{item.name}</h3>
                                    <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                                  </div>
                                  <p className="text-[10px] font-bold text-orange-600">₹{item.price}</p>
                                  {quantity > 0 ? (
                                    <div className="flex items-center justify-center space-x-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-4 w-4 p-0 rounded-full text-[8px]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (quantity === 1) {
                                            setCart(cart.filter(cartItem => cartItem.id !== item.id));
                                          } else {
                                            setCart(cart.map(cartItem => 
                                              cartItem.id === item.id 
                                                ? { ...cartItem, quantity: cartItem.quantity - 1 }
                                                : cartItem
                                            ));
                                          }
                                        }}
                                      >
                                        <Minus className="w-2 h-2" />
                                      </Button>
                                      <span className="text-[11px] font-bold min-w-[10px] text-center">{quantity}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-4 w-4 p-0 rounded-full bg-orange-500 hover:bg-orange-600 text-white border-orange-500 text-[8px]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCart(cart.map(cartItem => 
                                            cartItem.id === item.id 
                                              ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                              : cartItem
                                          ));
                                        }}
                                      >
                                        <Plus className="w-2 h-2" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-full px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 font-medium text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCart([...cart, { 
                                          id: item.id, 
                                          name: item.name, 
                                          price: item.price, 
                                          quantity: 1 
                                        }]);
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* All Other Items Section */}
                  <div className="p-2">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">ALL ITEMS</h4>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-auto">
                      {menuItems.filter(item => {
                        const matchesSearch = offlineSearchQuery === "" || 
                          item.name.toLowerCase().includes(offlineSearchQuery.toLowerCase());
                        const matchesCategory = selectedCategory === "all" || 
                          categories.find(cat => cat.id === item.categoryId)?.name === selectedCategory;
                        return matchesSearch && matchesCategory && item.available && item.stock > 0;
                      }).map((item) => {
                        const cartItem = cart.find(cartItem => cartItem.id === item.id);
                        const quantity = cartItem?.quantity || 0;
                        
                        return (
                          <Card 
                            key={item.id} 
                            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover-scale border-2 border-purple-200 hover:border-purple-400"
                            data-testid={`all-items-tile-${item.id}`}
                          >
                            <CardContent className="p-1.5 text-center">
                              <div className="w-full h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center mb-1">
                                <span className="text-sm">🍴</span>
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-center space-x-1">
                                  <h3 className="font-semibold text-[11px] line-clamp-1">{item.name}</h3>
                                  <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                                </div>
                                <p className="text-[10px] font-bold text-purple-600">₹{item.price}</p>
                                {quantity > 0 ? (
                                  <div className="flex items-center justify-center space-x-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-4 w-4 p-0 rounded-full text-[8px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (quantity === 1) {
                                          setCart(cart.filter(cartItem => cartItem.id !== item.id));
                                        } else {
                                          setCart(cart.map(cartItem => 
                                            cartItem.id === item.id 
                                              ? { ...cartItem, quantity: cartItem.quantity - 1 }
                                              : cartItem
                                          ));
                                        }
                                      }}
                                    >
                                      <Minus className="w-2 h-2" />
                                    </Button>
                                    <span className="text-[11px] font-bold min-w-[10px] text-center">{quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-4 w-4 p-0 rounded-full bg-purple-500 hover:bg-purple-600 text-white border-purple-500 text-[8px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCart(cart.map(cartItem => 
                                          cartItem.id === item.id 
                                            ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                            : cartItem
                                        ));
                                      }}
                                    >
                                      <Plus className="w-2 h-2" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-full px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white border-purple-500 font-medium text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCart([...cart, { 
                                        id: item.id, 
                                        name: item.name, 
                                        price: item.price, 
                                        quantity: 1 
                                      }]);
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                      </div>
                    </div>
                  </div>
                </Panel>
                
                <PanelResizeHandle className="h-1 bg-border hover:bg-primary/20 transition-colors" />

                {/* Right Bottom - Preparing Orders */}
                <Panel defaultSize={50} minSize={30}>
                  <div className="h-full bg-card">
                    <div className="h-full flex flex-col">
                      <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Prep Required Orders
                    </h3>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">Live</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Orders requiring manual preparation (unseen orders prioritized)</p>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                  {(() => {
                    // Filter orders that have markable items (not auto-ready) and are in pending status
                    // This updates in real-time via SSE when new orders come in or status changes
                    const preparingOrders = orders.filter((order: any) => {
                      // Only show orders in pending status that need prep
                      if (order.status !== "pending") return false;
                      
                      try {
                        const items = JSON.parse(order.items || '[]');
                        // Only show orders that have at least one markable item (prep required)
                        const hasMarkableItem = items.some((item: any) => {
                          const menuItem = menuItems.find(mi => mi.id === item.id);
                          return menuItem?.isMarkable === true;
                        });
                        return hasMarkableItem;
                      } catch {
                        return false;
                      }
                    });

                    // Priority-based sorting: Unseen orders first, then by creation time
                    preparingOrders.sort((a: any, b: any) => {
                      const aUnseen = isOrderUnseen(a);
                      const bUnseen = isOrderUnseen(b);
                      
                      // If one is unseen and other is seen, prioritize unseen
                      if (aUnseen && !bUnseen) return -1;
                      if (!aUnseen && bUnseen) return 1;
                      
                      // If both have same seen status, sort by creation time (newest first)
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    });
                    
                    return preparingOrders.length === 0 ? (
                      <div className="text-center py-6">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No prep-required orders</p>
                        <p className="text-xs text-muted-foreground mt-1">Orders requiring manual preparation will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {preparingOrders.map((order: any) => (
                          <Card key={order.id} className={`border-l-4 cursor-pointer hover:shadow-lg transition-shadow border-l-blue-500 ${isOrderUnseen(order) ? 'bg-green-50 border-green-200' : ''}`} onClick={() => handleOrderCardClick(order)}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-1 mb-2">
                                    <div className="flex items-center font-medium text-sm">
                                      <span>#{(() => {
                                        const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                        return formatted.prefix;
                                      })()}</span>
                                      <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-0 text-xs">
                                        {(() => {
                                          const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                          return formatted.highlighted;
                                        })()}
                                      </span>
                                    </div>
                                    <Badge className={`${getOrderStatusColor(order.status)} text-xs`}>
                                      {getOrderStatusText(order.status)}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">{order.estimatedTime}m</Badge>
                                    {(() => {
                                      try {
                                        const items = JSON.parse(order.items || '[]');
                                        const hasMarkableItem = items.some((item: any) => {
                                          const menuItem = menuItems.find(mi => mi.id === item.id);
                                          return menuItem?.isMarkable === true;
                                        });
                                        return (
                                          <>
                                            <Badge 
                                              variant={hasMarkableItem ? "secondary" : "outline"}
                                              className={hasMarkableItem ? "bg-orange-100 text-orange-800 border-orange-200 text-xs" : "bg-green-100 text-green-800 border-green-200 text-xs"}
                                            >
                                              {hasMarkableItem ? "Prep Required" : "Auto-Ready"}
                                            </Badge>
                                            {isOrderUnseen(order) && (
                                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs animate-pulse">
                                                Priority
                                              </Badge>
                                            )}
                                          </>
                                        );
                                      } catch {
                                        return null;
                                      }
                                    })()}
                                  </div>
                                  <p className="text-xs text-muted-foreground">Customer: {order.customerName}</p>
                                  <p className="text-xs">
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
                                <div className="text-right space-y-1">
                                  <p className="font-semibold text-sm">₹{order.amount}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'N/A'}
                                  </p>
                                  <div className="flex flex-col space-y-1">
                                    {(() => {
                                      try {
                                        const items = JSON.parse(order.items || '[]');
                                        const hasMarkableItem = items.some((item: any) => {
                                          const menuItem = menuItems.find(mi => mi.id === item.id);
                                          return menuItem?.isMarkable === true;
                                        });
                                        
                                        // Show Mark Ready button for markable items in pending status
                                        if (hasMarkableItem && order.status === "pending") {
                                          return (
                                            <Button
                                              size="sm"
                                              variant="default"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                markOrderReadyMutation.mutate({ orderId: order.id, status: "ready" });
                                              }}
                                              disabled={markOrderReadyMutation.isPending}
                                              className="bg-green-600 hover:bg-green-700 text-white text-xs h-6"
                                              data-testid={`button-mark-ready-${order.id}`}
                                            >
                                              {markOrderReadyMutation.isPending ? "Updating..." : "Mark Ready"}
                                            </Button>
                                          );
                                        }

                                        
                                        return null;
                                      } catch {
                                        return null;
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })()}
                      </div>
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>
        
        {/* Keep all existing dialogs - they will work in both modes */}
        {/* Barcode Scanning Dialog */}
        <Dialog open={showBarcodeDialog} onOpenChange={setShowBarcodeDialog}>
          <DialogContent 
            className="max-w-lg w-[90%] sm:max-w-md max-h-[85vh] overflow-y-auto p-6 rounded-lg"
            onKeyDown={(e) => {
              if (showOrderDetails && scannedOrder && e.key === 'Enter') {
                e.preventDefault();
                markOrderReadyMutation.mutate({ 
                  orderId: scannedOrder.id, 
                  status: "delivered" 
                });
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setShowBarcodeDialog(false);
                setSelectedOrderForScan(null);
                setBarcodeInput("");
                setScannedOrder(null);
                setShowOrderDetails(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {!showOrderDetails ? (
                  <>
                    <ScanLine className="w-5 h-5" />
                    Scan Barcode
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    Order Details
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {!showOrderDetails ? (
                // Step 1: Barcode Input
                <Card className="border-2 border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Enter Barcode</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="barcodeInput">Barcode</Label>
                      <Input
                        id="barcodeInput"
                        placeholder="Enter barcode and press Enter..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (barcodeInput.trim()) {
                              handleBarcodeSubmit();
                            }
                          }
                        }}
                        className="text-center font-mono text-lg"
                        autoFocus
                      />
                    </div>
                    
                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <p className="font-medium text-yellow-800 text-sm">Instructions</p>
                      </div>
                      <p className="text-xs text-yellow-700">
                        Enter the barcode and press <kbd className="px-1 py-0.5 text-xs font-semibold text-yellow-900 bg-yellow-200 border border-yellow-300 rounded">Enter</kbd> to find the order
                      </p>
                    </div>

                    <Button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBarcodeSubmit();
                      }}
                      className="w-full"
                      disabled={!barcodeInput.trim()}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Find Order
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                // Step 2: Order Details (after barcode scan)
                scannedOrder && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">Order Found!</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div>
                          <span className="text-muted-foreground">Order ID:</span>
                          <p className="font-mono font-medium">#{(() => {
                            const formatted = formatOrderIdDisplay(scannedOrder.orderNumber || scannedOrder.id.toString());
                            return formatted.prefix + formatted.highlighted;
                          })()}</p>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div className="mt-1">
                            <Badge className={getOrderStatusColor(scannedOrder.status)}>
                              {getOrderStatusText(scannedOrder.status)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Customer:</span>
                          <p className="font-medium">{scannedOrder.customerName || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Total Amount:</span>
                          <p className="font-bold text-lg text-green-600">₹{scannedOrder.amount}</p>
                        </div>
                      </div>

                      <div className="border-t pt-4 mb-4">
                        <h4 className="font-bold text-lg mb-3 flex items-center text-gray-800">
                          <Receipt className="w-5 h-5 mr-2 text-blue-600" />
                          Ordered Dishes
                        </h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                          {(() => {
                            try {
                              const items = typeof scannedOrder.items === 'string' 
                                ? JSON.parse(scannedOrder.items) 
                                : scannedOrder.items || [];
                              
                              return items.length > 0 ? items.map((item: any, index: number) => (
                                <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className="font-bold text-lg text-gray-800">{item.name}</span>
                                        {item.isVegetarian && (
                                          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">VEG</span>
                                        )}
                                      </div>
                                      <div className="text-gray-600 font-medium">₹{item.price} × {item.quantity} pieces</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-xl text-blue-600">₹{item.price * item.quantity}</div>
                                    </div>
                                  </div>
                                </div>
                              )) : (
                                <div className="text-center py-4 text-muted-foreground">No items found</div>
                              );
                            } catch (error) {
                              return (
                                <div className="text-center py-4 text-red-500">Error loading items</div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <p className="text-sm text-blue-700">
                        Press <kbd className="px-2 py-1 text-xs bg-blue-200 rounded">Enter</kbd> to deliver or <kbd className="px-2 py-1 text-xs bg-blue-200 rounded">Esc</kbd> to cancel
                      </p>
                    </div>
                  </div>
                )
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBarcodeDialog(false);
                    setSelectedOrderForScan(null);
                    setBarcodeInput("");
                    setScannedOrder(null);
                    setShowOrderDetails(false);
                  }}
                >
                  Cancel
                </Button>
                
                {showOrderDetails && scannedOrder && (
                  <Button
                    onClick={() => markOrderReadyMutation.mutate({ 
                      orderId: scannedOrder.id, 
                      status: "delivered" 
                    })}
                    disabled={markOrderReadyMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {markOrderReadyMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Delivered
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Order Detail Popup */}
        <Dialog open={showOrderDetailPopup} onOpenChange={setShowOrderDetailPopup}>
          <DialogContent className="max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                Order Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedOrderForDetails && (
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-bold text-xl mb-4 flex items-center text-gray-800">
                    <ChefHat className="w-6 h-6 mr-2 text-blue-600" />
                    Ordered Dishes
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      try {
                        const items = typeof selectedOrderForDetails.items === 'string' 
                          ? JSON.parse(selectedOrderForDetails.items) 
                          : selectedOrderForDetails.items || [];
                        
                        return items.length > 0 ? items.map((item: any, index: number) => (
                          <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <span className="font-bold text-xl text-gray-800">{item.name}</span>
                                  {item.isVegetarian && (
                                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">VEG</span>
                                  )}
                                </div>
                                <div className="text-gray-600 font-medium text-lg">
                                  ₹{item.price} × {item.quantity} pieces
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-2xl text-blue-600">₹{item.price * item.quantity}</div>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-4 text-muted-foreground">No items found</div>
                        );
                      } catch (error) {
                        return (
                          <div className="text-center py-4 text-red-500">Error loading items</div>
                        );
                      }
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Order Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID:</span>
                        <span className="font-mono">#{(() => {
                          const formatted = formatOrderIdDisplay(selectedOrderForDetails.orderNumber || selectedOrderForDetails.id.toString());
                          return formatted.prefix + formatted.highlighted;
                        })()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge className={getOrderStatusColor(selectedOrderForDetails.status)}>
                          {getOrderStatusText(selectedOrderForDetails.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order Time:</span>
                        <span>{new Date(selectedOrderForDetails.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Time:</span>
                        <span>{selectedOrderForDetails.estimatedTime || 0} minutes</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Customer & Payment</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium">{selectedOrderForDetails.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-bold text-xl text-green-600">₹{selectedOrderForDetails.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Barcode:</span>
                        <span className="font-mono text-xs">{selectedOrderForDetails.barcode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Barcode Used:</span>
                        <span className={selectedOrderForDetails.barcodeUsed ? "text-green-600" : "text-orange-600"}>
                          {selectedOrderForDetails.barcodeUsed ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowOrderDetailPopup(false)}
                  >
                    Close
                  </Button>
                  {selectedOrderForDetails.status === "ready" && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOrderDetailPopup(false);
                        setTimeout(() => {
                          handleScanBarcode(selectedOrderForDetails);
                        }, 100);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ScanLine className="w-4 h-4 mr-2" />
                      Scan Barcode
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cart Dialog - Store Mode */}
        {showCartDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50" 
              onClick={() => setShowCartDialog(false)}
            />
            
            {/* Modal Content */}
            <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-[90%] max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <Receipt className="w-5 h-5 mr-2" />
                    Order Summary - {cart.length} Dish{cart.length !== 1 ? 'es' : ''}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCartDialog(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <h3 className="font-medium text-lg mb-1">No dishes selected</h3>
                      <p className="text-sm text-muted-foreground">Add items from the menu to start your order</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Dish List */}
                      <div className="max-h-80 overflow-auto space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Selected Dishes</h4>
                        {cart.map((item, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-base mb-1">{item.name}</h5>
                                <p className="text-sm text-muted-foreground mb-2">₹{item.price} per item</p>
                                
                                {/* Quantity Controls */}
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm font-medium">Quantity:</span>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
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
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setCart(cart.map((cartItem, i) => 
                                          i === index 
                                            ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                            : cartItem
                                        ));
                                      }}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-7 w-7 p-0 ml-2"
                                      onClick={() => setCart(cart.filter((_, i) => i !== index))}
                                      title="Remove item"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Item Total */}
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary">₹{item.price * item.quantity}</div>
                                <div className="text-xs text-muted-foreground">{item.quantity} × ₹{item.price}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Order Summary & Action */}
                      <div className="border-t pt-4 space-y-4 bg-gray-50 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-lg">
                            <span className="font-semibold">Total Amount:</span>
                            <span className="font-bold text-xl text-primary">₹{getTotalAmount()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Payment Mode:</span>
                            <Badge variant="secondary" className="font-medium">
                              {paymentMode === 'cash' ? 'Cash Payment' : 'Online Payment'}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => setCart([])}
                            disabled={isPlacingOrder || placeOfflineOrderMutation.isPending}
                          >
                            Clear All
                          </Button>
                          <Button 
                            className="flex-2 bg-green-600 hover:bg-green-700 text-white font-semibold" 
                            onClick={() => {
                              handlePlaceOfflineOrder();
                              setShowCartDialog(false);
                            }}
                            disabled={isPlacingOrder || placeOfflineOrderMutation.isPending}
                          >
                            {isPlacingOrder || placeOfflineOrderMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing Order...
                              </>
                            ) : (
                              <>
                                <Receipt className="w-4 h-4 mr-2" />
                                Place Order - ₹{getTotalAmount()}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Normal Dashboard Layout
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
          
          {/* Store Mode Toggle */}
          <div className="border-t pt-2 mt-2">
            <SidebarNavItem 
              icon={isStoreMode ? Minimize : Maximize} 
              label={isStoreMode ? "Exit Store Mode" : "Store Mode"} 
              active={false}
              onClick={() => setIsStoreMode(!isStoreMode)}
            />
          </div>

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
                        <TabsTrigger value="all">All Orders ({totalOrdersCount})</TabsTrigger>
                        <TabsTrigger value="offline">Offline Counter Orders</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="active">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Active Orders (FIFO - First In, First Out) - Paginated</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{totalActiveOrdersCount} active</Badge>
                              <span className="text-xs text-muted-foreground">
                                Ordered by: Creation Time (Oldest First)
                              </span>
                            </div>
                          </div>
                          
                          {paginatedActiveLoading ? (
                            <div className="text-center py-8">
                              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                              <p className="text-muted-foreground">Loading active orders...</p>
                            </div>
                          ) : paginatedActiveOrders.length === 0 ? (
                            <div className="text-center py-8">
                              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p className="text-muted-foreground">No active orders</p>
                              <p className="text-sm text-muted-foreground mt-2">Active orders will appear here when customers place orders</p>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-3">
                                {paginatedActiveOrders.map((order: any) => (
                                <Card key={order.id} className={`border-l-4 cursor-pointer hover:shadow-lg transition-shadow ${
                                  order.status === 'preparing' ? 'border-l-blue-500' : 
                                  order.status === 'ready' ? 'border-l-green-500' : 
                                  'border-l-yellow-500'
                                }`} onClick={() => handleOrderCardClick(order)}>
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
                                          {(() => {
                                            try {
                                              const items = JSON.parse(order.items || '[]');
                                              const hasMarkableItem = items.some((item: any) => {
                                                const menuItem = menuItems.find(mi => mi.id === item.id);
                                                return menuItem?.isMarkable === true;
                                              });
                                              
                                              // Auto-Ready orders show Scan Barcode button when ready
                                              if (!hasMarkableItem && order.status === "ready") {
                                                return (
                                                  <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleScanBarcode(order);
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    data-testid={`button-scan-barcode-${order.id}`}
                                                  >
                                                    <ScanLine className="w-4 h-4 mr-2" />
                                                    Scan Barcode
                                                  </Button>
                                                );
                                              }
                                              
                                              // Prep Required orders show Mark Ready button when pending/preparing
                                              if (hasMarkableItem && (order.status === "pending" || order.status === "preparing")) {
                                                return (
                                                  <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      markOrderReadyMutation.mutate({ orderId: order.id, status: "ready" });
                                                    }}
                                                    disabled={markOrderReadyMutation.isPending}
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    data-testid={`button-mark-ready-${order.id}`}
                                                  >
                                                    {markOrderReadyMutation.isPending ? "Updating..." : "Mark Ready"}
                                                  </Button>
                                                );
                                              }
                                              
                                              // Prep Required orders show Scan Barcode button when ready
                                              if (hasMarkableItem && order.status === "ready") {
                                                return (
                                                  <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleScanBarcode(order);
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    data-testid={`button-scan-barcode-${order.id}`}
                                                  >
                                                    <ScanLine className="w-4 h-4 mr-2" />
                                                    Scan Barcode
                                                  </Button>
                                                );
                                              }
                                              
                                              return null;
                                            } catch {
                                              return null;
                                            }
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                              </div>
                              
                              {/* Pagination Controls for Active Orders */}
                              {totalActivePages > 1 && (
                                <Pagination
                                  currentPage={currentActivePage}
                                  totalPages={totalActivePages}
                                  onPageChange={goToActivePage}
                                  onNextPage={goToActiveNextPage}
                                  onPreviousPage={goToActivePreviousPage}
                                  onFirstPage={goToActiveFirstPage}
                                  onLastPage={goToActiveLastPage}
                                  hasNextPage={hasActiveNextPage}
                                  hasPreviousPage={hasActivePreviousPage}
                                  totalCount={totalActiveOrdersCount || 0}
                                  pageSize={15}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="all">
                        <div className="space-y-6">
                          {/* Search Results */}
                          {searchQuery.trim() ? (
                            <div className="space-y-4">
                              <h3 className="text-lg font-medium">Search Results for "{searchQuery}"</h3>
                              {searchResults?.orders && searchResults.orders.length > 0 ? (
                                <>
                                  <div className="grid gap-4">
                                    {searchResults.orders.map((order) => (
                                      <Card key={order.id} className="cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={() => handleOrderCardClick(order)}>
                                        <CardContent className="p-4">
                                          <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                              <div className="flex items-center space-x-3">
                                                <h4 className="font-medium">
                                                  {(() => {
                                                    const formatted = formatOrderIdDisplay(order.orderNumber);
                                                    return (
                                                      <>
                                                        {formatted.prefix}
                                                        <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-1">
                                                          {formatted.highlighted}
                                                        </span>
                                                      </>
                                                    );
                                                  })()}
                                                </h4>
                                                <Badge className={getOrderStatusColor(order.status)}>
                                                  {getOrderStatusText(order.status)}
                                                </Badge>
                                              </div>
                                              <p className="text-sm text-muted-foreground">
                                                Customer: {order.customerName || 'Unknown'}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                                              </p>
                                            </div>
                                            <div className="text-right space-y-2">
                                              <p className="font-semibold">₹{order.amount}</p>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setLocation(`/canteen-order-detail/${order.id}`);
                                                }}
                                              >
                                                View Details
                                              </Button>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                  
                                  {/* Search Results Pagination */}
                                  {searchResults.totalPages > 1 && (
                                    <Pagination
                                      currentPage={searchResults.currentPage || 1}
                                      totalPages={searchResults.totalPages}
                                      onPageChange={(page) => {/* Handle search pagination */}}
                                      onNextPage={() => {/* Handle next search page */}}
                                      onPreviousPage={() => {/* Handle previous search page */}}
                                      onFirstPage={() => {/* Handle first search page */}}
                                      onLastPage={() => {/* Handle last search page */}}
                                      hasNextPage={searchResults.currentPage < searchResults.totalPages}
                                      hasPreviousPage={searchResults.currentPage > 1}
                                      totalCount={searchResults.totalCount || 0}
                                      pageSize={15}
                                    />
                                  )}
                                </>
                              ) : (
                                <div className="text-center py-8">
                                  <p className="text-muted-foreground">No orders found matching "{searchQuery}"</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* All Orders View */
                            <div className="space-y-4">
                              <h3 className="text-lg font-medium">All Orders</h3>
                              {paginatedLoading ? (
                                <div className="text-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                  <p className="text-muted-foreground mt-2">Loading orders...</p>
                                </div>
                              ) : paginatedOrders && paginatedOrders.length > 0 ? (
                                <>
                                  <div className="grid gap-4">
                                    {paginatedOrders.map((order) => (
                                      <Card key={order.id} className="cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={() => handleOrderCardClick(order)}>
                                        <CardContent className="p-4">
                                          <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                              <div className="flex items-center space-x-3">
                                                <h4 className="font-medium">
                                                  {(() => {
                                                    const formatted = formatOrderIdDisplay(order.orderNumber);
                                                    return (
                                                      <>
                                                        {formatted.prefix}
                                                        <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-1">
                                                          {formatted.highlighted}
                                                        </span>
                                                      </>
                                                    );
                                                  })()}
                                                </h4>
                                                <Badge className={getOrderStatusColor(order.status)}>
                                                  {getOrderStatusText(order.status)}
                                                </Badge>
                                              </div>
                                              <p className="text-sm text-muted-foreground">
                                                Customer: {order.customerName || 'Unknown'}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                                              </p>
                                            </div>
                                            <div className="text-right space-y-2">
                                              <p className="font-semibold">₹{order.amount}</p>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setLocation(`/canteen-order-detail/${order.id}`);
                                                }}
                                              >
                                                View Details
                                              </Button>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                  
                                  {/* All Orders Pagination */}
                                  {totalPages > 1 && (
                                    <Pagination
                                      currentPage={currentPage}
                                      totalPages={totalPages}
                                      onPageChange={goToPage}
                                      onNextPage={goToNextPage}
                                      onPreviousPage={goToPreviousPage}
                                      onFirstPage={goToFirstPage}
                                      onLastPage={goToLastPage}
                                      hasNextPage={hasNextPage}
                                      hasPreviousPage={hasPreviousPage}
                                      totalCount={totalOrdersCount || 0}
                                      pageSize={15}
                                    />
                                  )}
                                </>
                              ) : (
                                <div className="text-center py-8">
                                  <p className="text-muted-foreground">No orders found</p>
                                </div>
                              )}
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

                      {/* Action Button */}
                      <div className="flex justify-center pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setScannedOrderId("");
                            setScanResult(null);
                            setScanError("");
                          }}
                          data-testid="button-scan-next"
                        >
                          Scan Next Order
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
                {/* Analytics Header with Date Controls */}
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                      <p className="text-muted-foreground">Comprehensive insights with date-based filtering</p>
                    </div>
                    <Button variant="outline" onClick={refreshAllData} className="flex items-center space-x-2">
                      <RefreshCcw className="w-4 h-4" />
                      <span>Refresh Data</span>
                    </Button>
                  </div>

                  {/* Date Controls */}
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    {/* Timeframe Selector */}
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium">Time Period:</span>
                      <Select value={analyticsTimeframe} onValueChange={(value: any) => setAnalyticsTimeframe(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Calendar Date Picker */}
                    <div className="flex items-center space-x-2">
                      <CalendarDays className="w-4 h-4" />
                      <span className="text-sm font-medium">Select Date:</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-48 justify-start text-left font-normal">
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {selectedDate ? selectedDate.toLocaleDateString() : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) setSelectedDate(date);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date Range Display */}
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {(() => {
                          const { startDate, endDate } = getDateRange(analyticsTimeframe, selectedDate);
                          const formatDateRange = () => {
                            const start = startDate.toLocaleDateString();
                            const end = new Date(endDate.getTime() - 1).toLocaleDateString();
                            return analyticsTimeframe === 'daily' ? start : `${start} - ${end}`;
                          };
                          return `Showing: ${formatDateRange()}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {(() => {
                  // Calculate filtered data based on selected timeframe and date
                  const { startDate, endDate } = getDateRange(analyticsTimeframe, selectedDate);
                  const filteredOrders = filterOrdersByDateRange(orders, startDate, endDate);
                  const periodAnalytics = calculateAnalytics(filteredOrders);

                  return (
                    <>
                      {/* Key Performance Indicators */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="border-l-4 border-l-blue-500">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                                <p className="text-3xl font-bold text-blue-600">{periodAnalytics.totalOrders}</p>
                                <p className="text-xs text-muted-foreground mt-1">{analyticsTimeframe} period</p>
                              </div>
                              <ShoppingBag className="w-8 h-8 text-blue-500" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-500">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                                <p className="text-3xl font-bold text-green-600">₹{periodAnalytics.totalRevenue}</p>
                                <p className="text-xs text-muted-foreground mt-1">{analyticsTimeframe} period</p>
                              </div>
                              <DollarSign className="w-8 h-8 text-green-500" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-orange-500">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                                <p className="text-3xl font-bold text-orange-600">₹{periodAnalytics.averageOrderValue}</p>
                                <p className="text-xs text-muted-foreground mt-1">Per order</p>
                              </div>
                              <TrendingUp className="w-8 h-8 text-orange-500" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Items</p>
                                <p className="text-3xl font-bold text-purple-600">{menuItems.filter((item: any) => item.available).length}</p>
                                <p className="text-xs text-muted-foreground mt-1">Menu items</p>
                              </div>
                              <ChefHat className="w-8 h-8 text-purple-500" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Order Status Analysis */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="w-5 h-5" />
                            Order Status Distribution ({analyticsTimeframe})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(() => {
                              const statusConfig = [
                                { status: 'pending', label: 'Pending', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
                                { status: 'preparing', label: 'Preparing', color: 'bg-blue-500', textColor: 'text-blue-600' },
                                { status: 'ready', label: 'Ready', color: 'bg-green-500', textColor: 'text-green-600' },
                                { status: 'delivered', label: 'Delivered', color: 'bg-gray-500', textColor: 'text-gray-600' }
                              ];

                              return statusConfig.map(config => (
                                <div key={config.status} className="text-center p-4 border rounded-lg">
                                  <div className={`w-12 h-12 ${config.color} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                                    <span className="text-white font-bold">{periodAnalytics.statusCounts[config.status] || 0}</span>
                                  </div>
                                  <p className={`font-semibold ${config.textColor}`}>{config.label}</p>
                                  <p className="text-xs text-muted-foreground">Orders</p>
                                </div>
                              ));
                            })()}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Top Performing Items for Period */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Star className="w-5 h-5" />
                            Top Performing Items ({analyticsTimeframe})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {(() => {
                              const topItems = Object.values(periodAnalytics.itemStats)
                                .sort((a: any, b: any) => b.quantity - a.quantity)
                                .slice(0, 5);

                              if (topItems.length === 0) {
                                return (
                                  <div className="text-center py-8">
                                    <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground">No order data for selected period</p>
                                  </div>
                                );
                              }

                              const maxQuantity = Math.max(...topItems.map((item: any) => item.quantity));

                              return topItems.map((item: any, index: number) => (
                                <div key={index} className="flex items-center space-x-4">
                                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">{index + 1}</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="font-medium">{item.name}</p>
                                      <p className="text-sm text-muted-foreground">{item.quantity} sold</p>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-primary h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${maxQuantity > 0 ? (item.quantity / maxQuantity) * 100 : 0}%` }}
                                      ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                      <span>₹{item.revenue} revenue</span>
                                      <span>{item.orders} orders</span>
                                    </div>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Period Activity Timeline */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Clock className="w-5 h-5" />
                            Activity Timeline ({analyticsTimeframe})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {(() => {
                              const recentOrders = [...filteredOrders]
                                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .slice(0, 10);

                              if (recentOrders.length === 0) {
                                return (
                                  <div className="text-center py-8">
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground">No activity for selected period</p>
                                  </div>
                                );
                              }

                              return recentOrders.map((order: any, index: number) => (
                                <div key={order.id} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                                  <div className={`w-3 h-3 rounded-full mt-2 ${
                                    order.status === 'delivered' ? 'bg-green-500' :
                                    order.status === 'ready' ? 'bg-blue-500' :
                                    order.status === 'preparing' ? 'bg-orange-500' :
                                    'bg-yellow-500'
                                  }`}></div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium">
                                        Order #{(() => {
                                          const formatted = formatOrderIdDisplay(order.orderNumber || order.id.toString());
                                          return formatted.prefix + formatted.highlighted;
                                        })()}
                                      </p>
                                      <span className="text-xs text-muted-foreground">
                                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{order.customerName}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <Badge className={getOrderStatusColor(order.status)} variant="outline">
                                        {getOrderStatusText(order.status)}
                                      </Badge>
                                      <span className="text-sm font-medium">₹{order.amount}</span>
                                    </div>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Daily Detailed View (when daily is selected) */}
                      {analyticsTimeframe === 'daily' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <CalendarDays className="w-5 h-5" />
                              Daily Performance Details - {selectedDate.toLocaleDateString()}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {[
                                {
                                  title: "Daily Orders",
                                  value: periodAnalytics.totalOrders,
                                  subtitle: "orders placed",
                                  color: "text-blue-600"
                                },
                                {
                                  title: "Daily Revenue", 
                                  value: `₹${periodAnalytics.totalRevenue}`,
                                  subtitle: "total sales",
                                  color: "text-green-600"
                                },
                                {
                                  title: "Avg Order Value",
                                  value: `₹${periodAnalytics.averageOrderValue}`,
                                  subtitle: "per order",
                                  color: "text-orange-600"
                                }
                              ].map((metric, index) => (
                                <div key={index} className="text-center p-4 border rounded-lg">
                                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                                  <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                                  <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Menu Performance Matrix for Period */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <ChefHat className="w-5 h-5" />
                            Menu Performance Matrix ({analyticsTimeframe})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Item Name</th>
                                  <th className="text-left p-2">Category</th>
                                  <th className="text-left p-2">Price</th>
                                  <th className="text-left p-2">Status</th>
                                  <th className="text-left p-2">Orders</th>
                                  <th className="text-left p-2">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {menuItems.map((item: any) => {
                                  const itemStat = periodAnalytics.itemStats[item.name] || { quantity: 0, revenue: 0, orders: 0 };
                                  const category = categories.find((cat: any) => cat.id === item.categoryId);

                                  return (
                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                      <td className="p-2 font-medium">{item.name}</td>
                                      <td className="p-2 text-muted-foreground">{category?.name || 'Uncategorized'}</td>
                                      <td className="p-2">₹{item.price}</td>
                                      <td className="p-2">
                                        <Badge variant={item.available ? "default" : "secondary"}>
                                          {item.available ? "Available" : "Unavailable"}
                                        </Badge>
                                      </td>
                                      <td className="p-2">{itemStat.quantity}</td>
                                      <td className="p-2 font-medium">₹{itemStat.revenue}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
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
                <div className="space-y-4">
                  {/* Check for Updates Option */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <RefreshCcw className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Check for Updates</h4>
                        <p className="text-sm text-muted-foreground">Check if there are any system updates available</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.success("System is up to date!");
                      }}
                      data-testid="button-check-updates"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Check Now
                    </Button>
                  </div>

                  {/* Force Refresh Option */}
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <RefreshCcw className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Force Refresh</h4>
                        <p className="text-sm text-muted-foreground">Refresh all data and clear cache</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        refreshAllData();
                        setShowSettings(false);
                      }}
                      data-testid="button-force-refresh"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Refresh Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanning Dialog */}
      <Dialog open={showBarcodeDialog} onOpenChange={setShowBarcodeDialog}>
        <DialogContent className="max-w-lg w-[90%] sm:max-w-md max-h-[85vh] overflow-y-auto p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ScanLine className="w-5 h-5" />
              Barcode Scanner
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Barcode Input Section */}
            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Enter or Scan Barcode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barcodeInput">Barcode</Label>
                  <Input
                    id="barcodeInput"
                    placeholder="Scan barcode or type manually..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("🔍 Enter key pressed in barcode input, preventing form submission");
                        if (barcodeInput.trim()) {
                          handleBarcodeSubmit();
                        }
                      }
                    }}
                    className="text-center font-mono text-lg"
                    autoFocus
                  />
                </div>
                
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <p className="font-medium text-yellow-800 text-sm">Instructions</p>
                  </div>
                  <p className="text-xs text-yellow-700">
                    Enter the barcode and press <kbd className="px-1 py-0.5 text-xs font-semibold text-yellow-900 bg-yellow-200 border border-yellow-300 rounded">Enter</kbd> to find the order
                  </p>
                </div>

                <Button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 Find Order button clicked, preventing navigation");
                    handleBarcodeSubmit();
                  }}
                  className="w-full"
                  disabled={!barcodeInput.trim()}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Find Order
                </Button>
              </CardContent>
            </Card>

            {/* Complete Order Details - Show after successful barcode scan */}
            {showOrderDetails && scannedOrder && (
              <div className="space-y-4">
                {/* Complete Order Information */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Order Found!</h3>
                  </div>
                  
                  {/* Basic Order Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Order ID:</span>
                      <p className="font-mono font-medium">#{(() => {
                        const formatted = formatOrderIdDisplay(scannedOrder.orderNumber || scannedOrder.id.toString());
                        return formatted.prefix + formatted.highlighted;
                      })()}</p>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="mt-1">
                        <Badge className={getOrderStatusColor(scannedOrder.status)}>
                          {getOrderStatusText(scannedOrder.status)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Customer:</span>
                      <p className="font-medium">{scannedOrder.customerName || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Total Amount:</span>
                      <p className="font-bold text-lg text-green-600">₹{scannedOrder.amount}</p>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Barcode:</span>
                      <p className="font-mono text-xs">{scannedOrder.barcode}</p>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Order Time:</span>
                      <p className="text-xs">{new Date(scannedOrder.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* DISHES/ITEMS - PRIORITY DISPLAY */}
                  <div className="border-t pt-4 mb-4">
                    <h4 className="font-bold text-lg mb-3 flex items-center text-gray-800">
                      <Receipt className="w-5 h-5 mr-2 text-blue-600" />
                      Ordered Dishes
                    </h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                      {(() => {
                        try {
                          const items = typeof scannedOrder.items === 'string' 
                            ? JSON.parse(scannedOrder.items) 
                            : scannedOrder.items || [];
                          
                          return items.length > 0 ? items.map((item: any, index: number) => (
                            <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-bold text-lg text-gray-800">{item.name}</span>
                                    {item.isVegetarian && (
                                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">VEG</span>
                                    )}
                                  </div>
                                  <div className="text-gray-600 font-medium">₹{item.price} × {item.quantity} pieces</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-xl text-blue-600">₹{item.price * item.quantity}</div>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-4 text-muted-foreground">No items found</div>
                          );
                        } catch (error) {
                          return (
                            <div className="text-center py-4 text-red-500">Error loading items</div>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="border-t pt-2 mt-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Time:</span>
                        <span>{scannedOrder.estimatedTime || 0} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Barcode Used:</span>
                        <span className={scannedOrder.barcodeUsed ? "text-green-600" : "text-orange-600"}>
                          {scannedOrder.barcodeUsed ? "Yes" : "No"}
                        </span>
                      </div>
                      {scannedOrder.deliveredAt && (
                        <div className="col-span-2 flex justify-between">
                          <span className="text-muted-foreground">Delivered:</span>
                          <span>{new Date(scannedOrder.deliveredAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>



                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-blue-700">
                    Press <kbd className="px-2 py-1 text-xs bg-blue-200 rounded">Enter</kbd> to deliver or <kbd className="px-2 py-1 text-xs bg-blue-200 rounded">Esc</kbd> to cancel
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBarcodeDialog(false);
                  setSelectedOrderForScan(null);
                  setBarcodeInput("");
                  setScannedOrder(null);
                  setShowOrderDetails(false);
                }}
              >
                Cancel
              </Button>
              
              {showOrderDetails && scannedOrder && (
                <Button
                  onClick={() => markOrderReadyMutation.mutate({ 
                    orderId: scannedOrder.id, 
                    status: "delivered" 
                  })}
                  disabled={markOrderReadyMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {markOrderReadyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Delivered
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Popup */}
      <Dialog open={showOrderDetailPopup} onOpenChange={setShowOrderDetailPopup}>
        <DialogContent className="max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              Order Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrderForDetails && (
            <div className="p-6 space-y-6">
              {/* ORDERED DISHES - PRIORITY DISPLAY */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-bold text-xl mb-4 flex items-center text-gray-800">
                  <ChefHat className="w-6 h-6 mr-2 text-blue-600" />
                  Ordered Dishes
                </h3>
                <div className="space-y-3">
                  {(() => {
                    try {
                      const items = typeof selectedOrderForDetails.items === 'string' 
                        ? JSON.parse(selectedOrderForDetails.items) 
                        : selectedOrderForDetails.items || [];
                      
                      return items.length > 0 ? items.map((item: any, index: number) => (
                        <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-bold text-xl text-gray-800">{item.name}</span>
                                {item.isVegetarian && (
                                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">VEG</span>
                                )}
                              </div>
                              <div className="text-gray-600 font-medium text-lg">
                                ₹{item.price} × {item.quantity} pieces
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-2xl text-blue-600">₹{item.price * item.quantity}</div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-muted-foreground">No items found</div>
                      );
                    } catch (error) {
                      return (
                        <div className="text-center py-4 text-red-500">Error loading items</div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Order Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order ID:</span>
                      <span className="font-mono">#{(() => {
                        const formatted = formatOrderIdDisplay(selectedOrderForDetails.orderNumber || selectedOrderForDetails.id.toString());
                        return formatted.prefix + formatted.highlighted;
                      })()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getOrderStatusColor(selectedOrderForDetails.status)}>
                        {getOrderStatusText(selectedOrderForDetails.status)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Time:</span>
                      <span>{new Date(selectedOrderForDetails.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Time:</span>
                      <span>{selectedOrderForDetails.estimatedTime || 0} minutes</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Customer & Payment</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium">{selectedOrderForDetails.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-bold text-xl text-green-600">₹{selectedOrderForDetails.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Barcode:</span>
                      <span className="font-mono text-xs">{selectedOrderForDetails.barcode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Barcode Used:</span>
                      <span className={selectedOrderForDetails.barcodeUsed ? "text-green-600" : "text-orange-600"}>
                        {selectedOrderForDetails.barcodeUsed ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetailPopup(false)}
                >
                  Close
                </Button>
                {selectedOrderForDetails.status === "ready" && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOrderDetailPopup(false);
                      setTimeout(() => {
                        handleScanBarcode(selectedOrderForDetails);
                      }, 100);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ScanLine className="w-4 h-4 mr-2" />
                    Scan Barcode
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Dialog - Alternative Modal Implementation */}
      {showCartDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setShowCartDialog(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-[90%] max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Receipt className="w-5 h-5 mr-2" />
                  Order Summary - {cart.length} Dish{cart.length !== 1 ? 'es' : ''}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCartDialog(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <h3 className="font-medium text-lg mb-1">No dishes selected</h3>
                    <p className="text-sm text-muted-foreground">Add items from the menu to start your order</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Dish List */}
                    <div className="max-h-80 overflow-auto space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Selected Dishes</h4>
                      {cart.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-semibold text-base mb-1">{item.name}</h5>
                              <p className="text-sm text-muted-foreground mb-2">₹{item.price} per item</p>
                              
                              {/* Quantity Controls */}
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium">Quantity:</span>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
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
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      setCart(cart.map((cartItem, i) => 
                                        i === index 
                                          ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                          : cartItem
                                      ));
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 w-7 p-0 ml-2"
                                    onClick={() => setCart(cart.filter((_, i) => i !== index))}
                                    title="Remove item"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Item Total */}
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">₹{item.price * item.quantity}</div>
                              <div className="text-xs text-muted-foreground">{item.quantity} × ₹{item.price}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Order Summary & Action */}
                    <div className="border-t pt-4 space-y-4 bg-gray-50 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-lg">
                          <span className="font-semibold">Total Amount:</span>
                          <span className="font-bold text-xl text-primary">₹{getTotalAmount()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Payment Mode:</span>
                          <Badge variant="secondary" className="font-medium">
                            {paymentMode === 'cash' ? 'Cash Payment' : 'Online Payment'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => setCart([])}
                          disabled={isPlacingOrder || placeOfflineOrderMutation.isPending}
                        >
                          Clear All
                        </Button>
                        <Button 
                          className="flex-2 bg-green-600 hover:bg-green-700 text-white font-semibold" 
                          onClick={() => {
                            handlePlaceOfflineOrder();
                            setShowCartDialog(false);
                          }}
                          disabled={isPlacingOrder || placeOfflineOrderMutation.isPending}
                        >
                          {isPlacingOrder || placeOfflineOrderMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing Order...
                            </>
                          ) : (
                            <>
                              <Receipt className="w-4 h-4 mr-2" />
                              Place Order - ₹{getTotalAmount()}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}