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

export default function CanteenOwnerDashboardSidebar() {
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
  
  // Offline order state
  const [offlineSearchQuery, setOfflineSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<Array<{id: string, name: string, price: number, quantity: number}>>([]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

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
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: analytics = {} } = useQuery<any>({
    queryKey: ["/api/admin/analytics"],
  });

  // Notification and settings state
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Filter orders
  const activeOrders = (orders as any[]).filter((order: any) => 
    order.status === "pending" || order.status === "preparing" || order.status === "ready"
  );

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
                              <Badge variant="outline">
                                {order.status || 'N/A'}
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
                          placeholder="Search orders..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-80"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activeOrders.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground">No active orders</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeOrders.map((order: any) => (
                            <Card key={order.id} className="border-l-4 border-l-primary">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="font-medium">#{order.orderNumber}</span>
                                      <Badge variant="outline">{order.status}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Customer: {order.customerName}</p>
                                    <p className="text-sm">Amount: ₹{order.amount}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(order.createdAt).toLocaleTimeString()}
                                    </p>
                                    <Button
                                      size="sm"
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
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Scanner Content */}
            {activeTab === "scanner" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ScanLine className="w-5 h-5" />
                      Barcode Scanner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <ScanLine className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">Scanner functionality would be implemented here</p>
                      <p className="text-sm text-muted-foreground mt-2">Scan order barcodes to mark as completed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Menu Content */}
            {activeTab === "menu" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ChefHat className="w-5 h-5" />
                      Menu Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">Menu management functionality</p>
                      <p className="text-sm text-muted-foreground mt-2">Add, edit, and manage your menu items</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
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