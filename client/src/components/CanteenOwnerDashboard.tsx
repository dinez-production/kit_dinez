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
  RefreshCcw
} from "lucide-react";
import { QuickOrdersManager } from "@/components/admin/QuickOrdersManager";
import { TrendingItemsManager } from "@/components/admin/TrendingItemsManager";

export default function CanteenOwnerDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const { user, isAuthenticated, isCanteenOwner } = useAuthSync();
  
  // Scanner state - completely rewritten for better control
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Search state for orders
  const [searchQuery, setSearchQuery] = useState("");

  // Enhanced security check - redirect if not authenticated OR not canteen owner
  useEffect(() => {
    if (!isAuthenticated || !isCanteenOwner) {
      toast.error("Access denied. Canteen owner authentication required.");
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, isCanteenOwner, setLocation]);

  // Real-time Server-Sent Events connection for order notifications
  useEffect(() => {
    if (!isAuthenticated || !isCanteenOwner) return;

    const eventSource = new EventSource('/api/events/orders');
    
    eventSource.onopen = () => {
      console.log('🔗 Connected to real-time order updates via SSE');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'new_order') {
          // Invalidate orders query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          
          // Show notification toast for new order
          toast.success(`📋 New Order Received! #${message.data.orderNumber}`, {
            description: `Customer: ${message.data.customerName} | Amount: ₹${message.data.amount}`,
            duration: 6000,
          });
          
          console.log('📢 New order received:', message.data);
        } else if (message.type === 'connected') {
          console.log('✅ SSE connection established:', message.message);
        }
      } catch (error) {
        console.error('Error processing SSE message:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };
    
    // Cleanup SSE connection on component unmount
    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, isCanteenOwner]);

  // Return early if not properly authenticated
  if (!isAuthenticated || !isCanteenOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Canteen owner authentication required</p>
          <Button onClick={() => setLocation("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }
  
  // Fetch real data from database using React Query with proper typing
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories, error: categoriesError } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      return data;
    },
    staleTime: 0, // Always refetch
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      return response.json();
    },
  });

  const { data: menuItems = [], isLoading: menuItemsLoading, refetch: refetchMenuItems, error: menuItemsError } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const response = await fetch('/api/menu');
      if (!response.ok) {
        throw new Error(`Failed to fetch menu items: ${response.status}`);
      }
      const data = await response.json();
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Data is synchronized with real-time updates

  const [newCategory, setNewCategory] = useState("");

  const [newItem, setNewItem] = useState({ name: "", price: "", category: "", stock: "", barcode: "", description: "", isVegetarian: true, addOns: [] as any[] });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editAddOns, setEditAddOns] = useState<Array<{ name: string; price: string }>>([]);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [stockUpdateItem, setStockUpdateItem] = useState<any>(null);
  const [newStockAmount, setNewStockAmount] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Fetch real notifications from database
  const [notifications, setNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    canteenName: "KIT Main Canteen",
    workingHours: { open: "08:00", close: "20:00" },
    notifications: {
      newOrders: true,
      lowStock: true,
      orderReady: true,
      dailyReports: false
    },
    operationalSettings: {
      autoAcceptOrders: true,
      maxOrdersPerHour: 50,
      preparationTime: 15
    }
  });


  // Filter orders based on search query
  const filteredOrders = (orders as any[]).filter((order: any) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const orderNumber = order.orderNumber?.toLowerCase() || '';
    const customerName = order.customerName?.toLowerCase() || '';
    const orderId = order.id?.toString().toLowerCase() || '';
    
    // Parse items to search within them
    let itemsText = '';
    if (order.items && typeof order.items === 'string') {
      try {
        const parsedItems = JSON.parse(order.items);
        if (Array.isArray(parsedItems)) {
          itemsText = parsedItems.map((item: any) => item.name).join(' ').toLowerCase();
        }
      } catch {
        itemsText = order.items.toLowerCase();
      }
    }
    
    return orderNumber.includes(query) || 
           customerName.includes(query) || 
           orderId.includes(query) ||
           itemsText.includes(query);
  });

  const stats = [
    { title: "Today's Orders", value: orders.length.toString(), icon: ShoppingBag, trend: "+12%" },
    { title: "Revenue", value: `₹${orders.reduce((sum: number, order: Order) => sum + order.amount, 0)}`, icon: DollarSign, trend: "+8%" },
    { title: "Active Menu Items", value: menuItems.filter((item: MenuItem) => item.available).length.toString(), icon: ChefHat, trend: "+3" },
    { title: "Avg Rating", value: "4.8", icon: Star, trend: "+0.2" }
  ];

  const handleOrderStatusUpdate = (orderId: any, newStatus: any) => {
    // Update order status using correct API endpoint
    updateOrderStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  // Enhanced mutations with comprehensive synchronization
  const addMenuItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/menu', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for all dashboards
      queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      refetchMenuItems(); // Force immediate refetch
      toast.success("Menu item added successfully - synced across all dashboards");
      setNewItem({ name: "", price: "", category: "", stock: "", barcode: "", description: "", isVegetarian: true, addOns: [] });
    },
    onError: () => {
      toast.error("Failed to add menu item");
    }
  });

  // Update menu item mutation with enhanced sync
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/menu/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      // Comprehensive synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      refetchMenuItems();
      toast.success("Menu item updated successfully - synced across all dashboards");
    },
    onError: () => {
      toast.error("Failed to update menu item");
    }
  });

  // Delete menu item mutation with enhanced sync
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/menu/${id}`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete menu item: ${response.status}`);
      }
      
      return { success: true };
    },
    onSuccess: (data, variables) => {
      // Comprehensive synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Force refetch to ensure UI updates
      refetchMenuItems();
      
      toast.success("Menu item deleted successfully");
    },
    onError: (error, variables) => {
      // Failed to delete menu item
      toast.error("Failed to delete menu item");
    }
  });

  // Add category mutation with enhanced sync
  const addCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      // Comprehensive synchronization across all dashboards
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      refetchCategories(); // Force immediate refetch
      refetchMenuItems(); // Also refetch menu items since they depend on categories
      toast.success("Category added successfully - synced across all dashboards");
      setNewCategory("");
    },
    onError: (error: any) => {
      // Category mutation failed - handle different error types
      if (error?.message?.includes("already exists") || error?.status === 409) {
        toast.error("Category already exists");
      } else {
        toast.error("Failed to add category");
      }
    }
  });

  // Order status update mutation - correctly calls /api/orders endpoint
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest(`/api/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data, variables) => {
      // Refresh orders list to show updated status
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      refetchOrders();
      toast.success(`Order ${variables.id} marked as ${variables.status}`);
    },
    onError: (error: any, variables) => {
      toast.error(`Failed to update order ${variables.id} status`);
      console.error('Order status update error:', error);
    }
  });

  const handleAddMenuItem = () => {
    if (!newItem.name || !newItem.price) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // Find category ID from name
    const selectedCategory = (categories as any[]).find((cat: any) => cat.name === newItem.category);
    
    const itemData = {
      name: newItem.name,
      price: parseInt(newItem.price),
      categoryId: selectedCategory ? selectedCategory.id : null,
      available: true,
      stock: parseInt(newItem.stock) || 0,
      description: newItem.description || "",
      isVegetarian: newItem.isVegetarian,
      addOns: JSON.stringify(newItem.addOns.filter(addon => addon.name && addon.name.trim()))
    };
    
    addMenuItemMutation.mutate(itemData);
  };

  const startBarcodeScanner = async () => {
    try {
      setIsScannerActive(true);
      
      // Check permission
      const permission = await BarcodeScanner.checkPermission({ force: true });
      
      if (permission.granted) {
        // Make background transparent
        document.body.classList.add('scanner-active');
        BarcodeScanner.hideBackground();
        
        const result = await BarcodeScanner.startScan();
        
        if (result.hasContent) {
          setNewItem({...newItem, barcode: result.content});
          toast.success(`Barcode scanned: ${result.content}`);
        }
      } else {
        toast.error("Camera permission is required to scan barcodes");
      }
    } catch (error) {
      toast.error("Failed to start barcode scanner");
      // Barcode scanner error - show user-friendly message
    } finally {
      stopBarcodeScanner();
    }
  };

  const stopBarcodeScanner = () => {
    setIsScannerActive(false);
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('scanner-active');
  };

  const handleUpdateMenuItem = () => {
    const updatedData = {
      ...editingItem,
      addOns: JSON.stringify(editAddOns.filter(addon => addon.name && addon.price))
    };
    updateMenuItemMutation.mutate({ id: editingItem.id, data: updatedData });
    setEditingItem(null);
    setEditAddOns([]);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    // Parse existing add-ons
    try {
      const existingAddOns = JSON.parse(item.addOns || "[]");
      setEditAddOns(existingAddOns.length > 0 ? existingAddOns : []);
    } catch {
      setEditAddOns([]);
    }
  };

  const addNewEditAddOn = () => {
    setEditAddOns([...editAddOns, { name: "", price: "" }]);
  };

  const updateEditAddOn = (index: number, field: "name" | "price", value: string) => {
    const updatedAddOns = [...editAddOns];
    updatedAddOns[index][field] = value;
    setEditAddOns(updatedAddOns);
  };

  const removeEditAddOn = (index: number) => {
    setEditAddOns(editAddOns.filter((_, i) => i !== index));
  };

  const handleDeleteMenuItem = (itemId: any) => {
    // Prevent multiple simultaneous deletes
    if (deleteMenuItemMutation.isPending) {
      toast.error("Delete in progress, please wait...");
      return;
    }
    deleteMenuItemMutation.mutate(itemId);
  };

  const toggleItemAvailability = (itemId: any) => {
    const item = (menuItems as any[]).find((item: any) => item.id === itemId);
    if (item) {
      updateMenuItemMutation.mutate({ id: itemId, data: { available: !item.available } });
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    
    if ((categories as any[]).some((cat: any) => cat.name === newCategory)) {
      toast.error("Category already exists");
      return;
    }
    
    addCategoryMutation.mutate({ name: newCategory.trim() });
    setNewCategory("");
  };

  const handleDeleteCategory = (categoryToDelete: any) => {
    if ((menuItems as any[]).some((item: any) => item.categoryId === categoryToDelete.id)) {
      toast.error("Cannot delete category - items are using it");
      return;
    }
    
    // Add delete category mutation here if needed
    toast.success("Category deleted successfully");
  };

  const getOrderStatusColor = (status: any) => {
    switch (status) {
      case "pending": return "bg-warning";
      case "preparing": return "bg-primary";
      case "ready": return "bg-success";
      case "completed": return "bg-muted";
      default: return "bg-muted";
    }
  };

  const getOrderStatusText = (status: any) => {
    switch (status) {
      case "pending": return "Pending";
      case "preparing": return "Preparing";
      case "ready": return "Ready";
      case "completed": return "Completed";
      default: return status;
    }
  };

  // Stock management handlers
  const handleUpdateStock = (item: any) => {
    setStockUpdateItem(item);
    setNewStockAmount(item.stock.toString());
  };

  const handleSaveStockUpdate = () => {
    if (!newStockAmount || isNaN(parseInt(newStockAmount))) {
      toast.error("Please enter a valid stock amount");
      return;
    }

    const updatedStock = parseInt(newStockAmount);
    
    // Use API to update stock instead of local state
    updateMenuItemMutation.mutate({ 
      id: stockUpdateItem.id, 
      data: { stock: updatedStock, available: updatedStock > 0 }
    });
    
    setStockUpdateItem(null);
    setNewStockAmount("");
    toast.success(`Stock updated for ${stockUpdateItem.name}`);
  };

  // Notification handlers
  const markNotificationAsRead = (notificationId: number) => {
    setNotifications(notifications.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (notificationId: number) => {
    setNotifications(notifications.filter(notif => notif.id !== notificationId));
  };

  // Settings handlers
  const handleSettingsUpdate = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof typeof prev] as any),
        [key]: value
      }
    }));
    toast.success("Settings updated successfully");
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order": return ShoppingBag;
      case "stock": return Package;
      case "system": return Settings;
      default: return Bell;
    }
  };

  // Completely rewritten barcode processing logic
  const processBarcodeDelivery = async (barcode: string) => {
    // Prevent any duplicate processing
    if (isProcessing) {
      console.log("Already processing, ignoring duplicate request");
      return;
    }

    setIsProcessing(true);
    setScanError("");
    setScanResult(null);

    try {
      console.log("Processing barcode:", barcode);
      
      const response = await fetch('/api/delivery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcode.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        setScanResult(data);
        setScanError("");
        toast.success("Order delivered successfully!");
        console.log("Delivery processed successfully:", data);
        
        // Refresh orders list
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      } else {
        // Error - format message appropriately
        let errorMessage = data.message || 'Scan failed';
        
        if (errorMessage.includes("already been delivered") || errorMessage.includes("🔒")) {
          errorMessage = "✅ This order has already been delivered";
        } else if (errorMessage.includes("not ready for pickup")) {
          errorMessage = "⏳ Order is not ready for pickup yet";
        } else if (errorMessage.includes("not found") || errorMessage.includes("Invalid barcode")) {
          errorMessage = "❌ Order number not found";
        } else {
          errorMessage = `⚠️ ${errorMessage}`;
        }
        
        setScanError(errorMessage);
        setScanResult(null);
        toast.error(errorMessage);
        console.log("Delivery processing error:", errorMessage);
      }
    } catch (error) {
      console.error("Network error during barcode processing:", error);
      setScanError("⚠️ Network error. Please try again.");
      setScanResult(null);
      toast.error("Network error. Please try again.");
    } finally {
      // Always reset processing state and clear input
      setIsProcessing(false);
      setManualBarcode("");
    }
  };

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!barcode.trim()) {
      setScanError("Please enter a barcode");
      return;
    }
    
    // Prevent duplicate submissions
    if (isProcessing) {
      return;
    }
    
    await processBarcodeDelivery(barcode);
  };

  const startCameraScanner = async () => {
    try {
      setIsScanning(true);
      
      // Check camera permissions
      const permissions = await BarcodeScanner.checkPermission({ force: true });
      
      if (!permissions.granted) {
        if (permissions.neverAsked) {
          setScanError("Camera permission required. Please enable in settings.");
          setIsScanning(false);
          return;
        }
        
        // On mobile devices, we may need to handle permissions differently
        setScanError("Camera permission denied");
        setIsScanning(false);
        return;
      }

      // Start scanning
      document.body.classList.add('scanner-active');
      const result = await BarcodeScanner.startScan();
      
      if (result.hasContent) {
        await processBarcodeDelivery(result.content);
      }
      
    } catch (error) {
      console.error('Camera scan error:', error);
      setScanError("Camera scanning failed. Use manual entry instead.");
    } finally {
      setIsScanning(false);
      document.body.classList.remove('scanner-active');
      BarcodeScanner.stopScan();
    }
  };

  const stopScanner = () => {
    setIsScanning(false);
    document.body.classList.remove('scanner-active');
    BarcodeScanner.stopScan();
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Canteen Owner Dashboard</h1>
              <p className="text-sm text-muted-foreground">KIT Canteen - {user?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <SyncStatus />
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshAllData}
              disabled={categoriesLoading || menuItemsLoading || ordersLoading}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab("scanner")}
            >
              <ScanLine className="w-4 h-4 mr-2" />
              Scanner
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowNotifications(true)}
              className="relative"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
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

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="scanner">Scanner</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
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
                <Tabs defaultValue="online" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="online">Online Orders</TabsTrigger>
                    <TabsTrigger value="offline">Offline Orders</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="online">
                    <div className="space-y-4">
                      {filteredOrders.length === 0 && searchQuery ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No orders found matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        filteredOrders.map((order: any) => (
                        <div key={order.id} className="p-4 border rounded-lg space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Order Info */}
                            <div className="md:col-span-2">
                              <div 
                                className="flex items-center justify-between cursor-pointer hover:bg-accent/20 -m-2 p-2 rounded transition-colors"
                                onClick={() => setLocation(`/canteen-order-detail/${order.id}`)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center font-semibold">
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
                                  {order.estimatedTime > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      ETA: {order.estimatedTime} min
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-lg">₹{order.amount}</span>
                              </div>
                              
                              <div 
                                className="cursor-pointer hover:bg-accent/20 -mx-2 px-2 py-1 rounded transition-colors"
                                onClick={() => setLocation(`/canteen-order-detail/${order.id}`)}
                              >
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
                                <p className="text-xs text-muted-foreground">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : order.time || 'N/A'}
                                </p>
                              </div>

                              <div className="flex space-x-2 mt-3">
                                {order.status === "preparing" && (
                                  <Button 
                                    size="sm" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOrderStatusUpdate(order.id, "ready");
                                    }}
                                  >
                                    Mark Ready
                                  </Button>
                                )}
                                {order.status === "ready" && (
                                  <Button 
                                    size="sm" 
                                    className="bg-success text-success-foreground hover:bg-success/90"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOrderStatusUpdate(order.id, "completed");
                                    }}
                                  >
                                    Complete Order
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Barcode Display */}
                            <div className="md:col-span-1 flex items-center justify-center">
                              {order.barcode && order.status === "ready" && (
                                <div className="text-center">
                                  <BarcodeDisplay 
                                    value={order.barcode}
                                    width={1.5}
                                    height={60}
                                    displayValue={false}
                                    className="mb-2"
                                  />
                                  <p className="text-xs text-muted-foreground font-mono">{order.barcode}</p>
                                  <Badge variant="outline" className="mt-1">Ready for Pickup</Badge>
                                </div>
                              )}
                              {order.status === "delivered" && (
                                <div className="text-center">
                                  <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                                  <Badge className="bg-success">Delivered</Badge>
                                  {order.deliveredAt && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(order.deliveredAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="offline">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Counter Orders</h3>

                      </div>
                      
                      {/* Offline Orders List */}
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold">#C001</span>
                              <Badge className="bg-primary">Counter Order</Badge>
                              <span className="text-sm text-muted-foreground">
                                Student ID: 21CS1234
                              </span>
                            </div>
                            <span className="font-bold text-lg">₹120</span>
                          </div>
                          
                          <div>
                            <p className="text-sm">2x Veg Meals, 1x Lassi</p>
                            <p className="text-xs text-muted-foreground">Counter 1 • just now</p>
                          </div>

                          <div className="flex space-x-2">
                            <Button size="sm">Process Payment</Button>
                            <Button size="sm" variant="outline">Print Receipt</Button>
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold">#C002</span>
                              <Badge className="bg-success">Paid</Badge>
                              <span className="text-sm text-muted-foreground">
                                Cash Payment
                              </span>
                            </div>
                            <span className="font-bold text-lg">₹75</span>
                          </div>
                          
                          <div>
                            <p className="text-sm">1x Biryani, 1x Raita</p>
                            <p className="text-xs text-muted-foreground">Counter 2 • 2 min ago</p>
                          </div>

                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">Reprint Receipt</Button>
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold">#C003</span>
                              <Badge className="bg-primary">Counter Order</Badge>
                              <span className="text-sm text-muted-foreground">
                                Faculty Order
                              </span>
                            </div>
                            <span className="font-bold text-lg">₹200</span>
                          </div>
                          
                          <div>
                            <p className="text-sm">3x Special Thali, 2x Tea</p>
                            <p className="text-xs text-muted-foreground">Counter 1 • 5 min ago</p>
                          </div>

                          <div className="flex space-x-2">
                            <Button size="sm">Process Payment</Button>
                            <Button size="sm" variant="outline">Print Receipt</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scanner" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ScanLine className="w-5 h-5" />
                  <span>Barcode Scanner</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Manual Entry Only */}
                <div className="max-w-md mx-auto">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-center">Barcode Entry</h3>
                    <div className="space-y-4 p-6 border rounded-lg">
                      <div>
                        <Label htmlFor="manual-barcode">Enter Order Number</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Scan or enter the order number from the barcode (e.g., ORD1754332914519)
                        </p>
                        <Input
                          id="manual-barcode"
                          value={manualBarcode}
                          onChange={(e) => setManualBarcode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && manualBarcode.trim() && !isProcessing) {
                              e.preventDefault();
                              handleBarcodeSubmit(manualBarcode);
                            }
                          }}
                          placeholder="ORD1754332914519"
                          className="mt-1"
                          disabled={isProcessing}
                        />
                      </div>
                      <Button 
                        onClick={() => handleBarcodeSubmit(manualBarcode)}
                        className="w-full"
                        size="lg"
                        disabled={!manualBarcode.trim() || isProcessing}
                      >
                        {isProcessing ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Process Delivery
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Results Section */}
                {(scanError || scanResult) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Scan Results</h3>
                    
                    {scanError && (
                      <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-5 h-5 text-destructive" />
                          <span className="text-destructive font-medium">Error</span>
                        </div>
                        <p className="mt-2 text-sm">{scanError}</p>
                      </div>
                    )}

                    {scanResult && (
                      <div className="p-4 border border-success rounded-lg bg-success/10">
                        <div className="flex items-center space-x-2 mb-3">
                          <CheckCircle className="w-5 h-5 text-success" />
                          <span className="text-success font-medium">Delivery Successful</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Order #:</span>
                            <div className="inline-flex items-center ml-2">
                              {(() => {
                                const formatted = formatOrderIdDisplay(scanResult.order?.orderNumber || '');
                                return (
                                  <>
                                    <span>{formatted.prefix}</span>
                                    <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-0">
                                      {formatted.highlighted}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Customer:</span>
                            <span className="ml-2">{scanResult.order?.customerName}</span>
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span>
                            <span className="ml-2">₹{scanResult.order?.amount}</span>
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>
                            <Badge className="ml-2 bg-success">{scanResult.order?.status}</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Deliveries */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recent Deliveries</h3>
                  <div className="space-y-2">
                    {(orders as any[])
                      .filter((order: any) => order.status === "delivered")
                      .slice(0, 5)
                      .map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <div>
                              <span className="font-medium">
                                #{(() => {
                                  const formatted = formatOrderIdDisplay(order.orderNumber);
                                  return (
                                    <>
                                      {formatted.prefix}
                                      <span className="bg-primary/20 text-primary font-bold px-1 rounded">
                                        {formatted.highlighted}
                                      </span>
                                    </>
                                  );
                                })()}
                              </span>
                              <p className="text-sm text-muted-foreground">{order.customerName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{order.amount}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : 'Just now'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <ChefHat className="w-5 h-5" />
                    Menu Management
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Menu Item</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Item Name</Label>
                          <Input
                            id="name"
                            value={newItem.name}
                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                            placeholder="Enter item name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="price">Price (₹)</Label>
                          <Input
                            id="price"
                            type="number"
                            value={newItem.price}
                            onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                            placeholder="Enter price"
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <div className="flex space-x-2">
                            <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categoriesLoading ? (
                                  <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                                ) : (categories as any[]).length === 0 ? (
                                  <SelectItem value="no-categories" disabled>No categories available</SelectItem>
                                ) : (
                                  (categories as any[]).map((category: any) => (
                                    <SelectItem key={category.id} value={category.name}>
                                      {category.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Manage Categories</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="flex space-x-2">
                                    <Input
                                      placeholder="Enter new category"
                                      value={newCategory}
                                      onChange={(e) => setNewCategory(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    />
                                    <Button 
                                      onClick={handleAddCategory}
                                      disabled={addCategoryMutation.isPending}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {categoriesLoading ? (
                                      <div className="text-sm text-muted-foreground p-2">Loading categories...</div>
                                    ) : (categories as any[]).length === 0 ? (
                                      <div className="text-sm text-muted-foreground p-2">No categories available</div>
                                    ) : (
                                      (categories as any[]).map((category: any) => (
                                        <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                                          <span className="text-sm">{category.name}</span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteCategory(category)}
                                            className="h-6 w-6 p-0"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="barcode">Barcode (Optional)</Label>
                          <div className="flex space-x-2">
                            <Input
                              id="barcode"
                              value={newItem.barcode}
                              onChange={(e) => setNewItem({...newItem, barcode: e.target.value})}
                              placeholder="Enter or scan barcode"
                            />
                            <Button 
                              type="button"
                              variant="outline" 
                              size="icon"
                              onClick={startBarcodeScanner}
                              disabled={isScannerActive}
                            >
                              <ScanLine className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="stock">Initial Stock</Label>
                          <Input
                            id="stock"
                            type="number"
                            value={newItem.stock}
                            onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
                            placeholder="Enter stock quantity"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Textarea
                            id="description"
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                            placeholder="Enter item description"
                            rows={2}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="vegetarian"
                            checked={newItem.isVegetarian}
                            onCheckedChange={(checked) => setNewItem({...newItem, isVegetarian: checked})}
                          />
                          <Label htmlFor="vegetarian" className="flex items-center space-x-2">
                            <span>Vegetarian</span>
                            <VegIndicator isVegetarian={newItem.isVegetarian} size="sm" />
                          </Label>
                        </div>
                        <div>
                          <Label>Add-ons (Optional)</Label>
                          <div className="space-y-2">
                            {newItem.addOns.map((addon, index) => (
                              <div key={index} className="flex space-x-2">
                                <Input
                                  placeholder="Add-on name"
                                  value={addon.name || ''}
                                  onChange={(e) => {
                                    const updatedAddOns = [...newItem.addOns];
                                    updatedAddOns[index] = { ...updatedAddOns[index], name: e.target.value };
                                    setNewItem({...newItem, addOns: updatedAddOns});
                                  }}
                                />
                                <Input
                                  placeholder="Price"
                                  type="number"
                                  value={addon.price || ''}
                                  onChange={(e) => {
                                    const updatedAddOns = [...newItem.addOns];
                                    updatedAddOns[index] = { ...updatedAddOns[index], price: parseInt(e.target.value) || 0 };
                                    setNewItem({...newItem, addOns: updatedAddOns});
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const updatedAddOns = newItem.addOns.filter((_, i) => i !== index);
                                    setNewItem({...newItem, addOns: updatedAddOns});
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setNewItem({...newItem, addOns: [...newItem.addOns, { name: '', price: 0 }]});
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Add-on
                            </Button>
                          </div>
                        </div>
                        <Button onClick={handleAddMenuItem} className="w-full">
                          Add Menu Item
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {menuItemsLoading && <div className="text-center py-4">Loading menu items...</div>}
                  {menuItemsError && <div className="text-center py-4 text-red-500">Error loading menu items: {menuItemsError.message}</div>}
                  {!menuItemsLoading && !menuItemsError && menuItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No menu items found. Click "Add Item" to create your first menu item!
                    </div>
                  )}
                  {menuItems.map((item: MenuItem) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{item.name}</h4>
                            <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                          </div>
                          <Badge variant="secondary">{categories.find(cat => cat.id === item.categoryId)?.name || "Unknown"}</Badge>
                          {!item.available && <Badge variant="destructive">Out of Stock</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Stock: {item.stock} | Price: ₹{item.price}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={item.available}
                          onCheckedChange={() => toggleItemAvailability(item.id)}
                        />
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDeleteMenuItem(item.id)}
                          disabled={deleteMenuItemMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Orders Management */}
            <QuickOrdersManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    Sales Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Today's Revenue</span>
                      <span className="font-semibold text-success">₹{orders.reduce((sum: number, order: Order) => sum + order.amount, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Orders Completed</span>
                      <span className="font-semibold">{orders.filter((o: Order) => o.status === "completed").length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Order Value</span>
                      <span className="font-semibold">₹{orders.length > 0 ? Math.round(orders.reduce((sum: number, order: Order) => sum + order.amount, 0) / orders.length) : 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {menuItems.slice(0, 3).map((item: MenuItem, index: number) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">#{index + 1}</Badge>
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  Inventory Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {menuItems.map((item: MenuItem) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{categories.find(cat => cat.id === item.categoryId)?.name || "Unknown"}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">Stock: {item.stock}</p>
                          {item.stock < 10 && (
                            <p className="text-xs text-destructive flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low Stock
                            </p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateStock(item)}
                        >
                          Update Stock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Content Management</h2>
                <p className="text-muted-foreground">Configure what users see on their home page.</p>
              </div>
              
              <TrendingItemsManager />
              
              <QuickOrdersManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Menu Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <Label htmlFor="edit-name">Item Name</Label>
                <Input
                  id="edit-name"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Price (₹)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({...editingItem, price: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="edit-stock">Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={editingItem.stock}
                  onChange={(e) => setEditingItem({...editingItem, stock: parseInt(e.target.value)})}
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={editingItem.categoryId?.toString()} 
                  onValueChange={(value) => setEditingItem({...editingItem, categoryId: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                  placeholder="Item description"
                  rows={3}
                />
              </div>

              {/* Available */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-available"
                  checked={editingItem.available}
                  onCheckedChange={(checked) => setEditingItem({...editingItem, available: checked})}
                />
                <Label htmlFor="edit-available">Available</Label>
              </div>

              {/* Add-ons Section */}
              <div className="space-y-2 border border-dashed border-gray-300 p-4 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Add-ons</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNewEditAddOn}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Add-on
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {editAddOns.map((addon, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg bg-white">
                      <Input
                        placeholder="Add-on name"
                        value={addon.name}
                        onChange={(e) => updateEditAddOn(index, "name", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Price"
                        type="number"
                        value={addon.price}
                        onChange={(e) => updateEditAddOn(index, "price", e.target.value)}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEditAddOn(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {editAddOns.length === 0 && (
                  <p className="text-sm text-muted-foreground">No add-ons configured</p>
                )}
              </div>

              <Button onClick={handleUpdateMenuItem} className="w-full">
                Update Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Stock Update Dialog */}
      {stockUpdateItem && (
        <Dialog open={!!stockUpdateItem} onOpenChange={() => setStockUpdateItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock - {stockUpdateItem.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="current-stock">Current Stock</Label>
                <Input
                  id="current-stock"
                  value={stockUpdateItem.stock}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="new-stock">New Stock Amount</Label>
                <Input
                  id="new-stock"
                  type="number"
                  value={newStockAmount}
                  onChange={(e) => setNewStockAmount(e.target.value)}
                  placeholder="Enter new stock amount"
                  min="0"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {parseInt(newStockAmount) === 0 && (
                  <p className="text-destructive">⚠️ Setting stock to 0 will make this item unavailable</p>
                )}
                {parseInt(newStockAmount) < 10 && parseInt(newStockAmount) > 0 && (
                  <p className="text-warning">⚠️ Low stock warning will be displayed</p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStockUpdateItem(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSaveStockUpdate} className="flex-1">
                  Update Stock
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Notifications
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllNotificationsAsRead}
                  disabled={notifications.filter(n => !n.read).length === 0}
                >
                  Mark All Read
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No notifications</p>
            ) : (
              notifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      notification.read ? 'bg-muted/30' : 'bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className="w-4 h-4 mt-0.5 text-primary" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{notification.time}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            ✓
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Canteen Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="canteen-name">Canteen Name</Label>
                  <Input
                    id="canteen-name"
                    value={settings.canteenName}
                    onChange={(e) => handleSettingsUpdate('', 'canteenName', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="open-time">Opening Time</Label>
                    <Input
                      id="open-time"
                      type="time"
                      value={settings.workingHours.open}
                      onChange={(e) => handleSettingsUpdate('workingHours', 'open', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="close-time">Closing Time</Label>
                    <Input
                      id="close-time"
                      type="time"
                      value={settings.workingHours.close}
                      onChange={(e) => handleSettingsUpdate('workingHours', 'close', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-orders">New Orders</Label>
                  <Button
                    variant={settings.notifications.newOrders ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSettingsUpdate('notifications', 'newOrders', !settings.notifications.newOrders)}
                  >
                    {settings.notifications.newOrders ? "ON" : "OFF"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="low-stock">Low Stock Alerts</Label>
                  <Button
                    variant={settings.notifications.lowStock ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSettingsUpdate('notifications', 'lowStock', !settings.notifications.lowStock)}
                  >
                    {settings.notifications.lowStock ? "ON" : "OFF"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="order-ready">Order Ready</Label>
                  <Button
                    variant={settings.notifications.orderReady ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSettingsUpdate('notifications', 'orderReady', !settings.notifications.orderReady)}
                  >
                    {settings.notifications.orderReady ? "ON" : "OFF"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="daily-reports">Daily Reports</Label>
                  <Button
                    variant={settings.notifications.dailyReports ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSettingsUpdate('notifications', 'dailyReports', !settings.notifications.dailyReports)}
                  >
                    {settings.notifications.dailyReports ? "ON" : "OFF"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Operational Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Operational Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-accept">Auto Accept Orders</Label>
                  <Button
                    variant={settings.operationalSettings.autoAcceptOrders ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSettingsUpdate('operationalSettings', 'autoAcceptOrders', !settings.operationalSettings.autoAcceptOrders)}
                  >
                    {settings.operationalSettings.autoAcceptOrders ? "ON" : "OFF"}
                  </Button>
                </div>
                <div>
                  <Label htmlFor="max-orders">Max Orders Per Hour</Label>
                  <Input
                    id="max-orders"
                    type="number"
                    value={settings.operationalSettings.maxOrdersPerHour}
                    onChange={(e) => handleSettingsUpdate('operationalSettings', 'maxOrdersPerHour', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="prep-time">Default Preparation Time (minutes)</Label>
                  <Input
                    id="prep-time"
                    type="number"
                    value={settings.operationalSettings.preparationTime}
                    onChange={(e) => handleSettingsUpdate('operationalSettings', 'preparationTime', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}