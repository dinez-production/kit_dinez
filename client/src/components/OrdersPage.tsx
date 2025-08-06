import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthSync } from "@/hooks/useDataSync";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Clock, CheckCircle, Package, Loader2, Receipt } from "lucide-react";
import BottomNavigation from "./BottomNavigation";
import type { Order } from "@shared/schema";

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { isAuthenticated } = useAuthSync();

  // Enhanced security check for authenticated users only
  useEffect(() => {
    if (!isAuthenticated) {
      toast("Please log in to view your orders.");
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, setLocation]);

  // Get current user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Fetch real orders from database
  const { data: allOrders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    enabled: true, // Explicitly enable the query
    refetchOnWindowFocus: false,
    retry: 3,
  });



  // Filter orders to show only current user's orders
  const userOrders = allOrders.filter((order: Order) => {
    if (!currentUser) return false;
    
    // Primary match: customer ID
    if (order.customerId === currentUser.id) {
      return true;
    }
    
    // Secondary match: customer name matches user name from profile
    if (currentUser.name && order.customerName === currentUser.name) {
      return true;
    }
    
    // Tertiary match: partial name matching (case insensitive)
    if (currentUser.name && order.customerName?.toLowerCase().includes(currentUser.name.toLowerCase())) {
      return true;
    }
    
    return false;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'preparing': return <Package className="w-4 h-4" />;
      case 'ready': 
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredOrders = userOrders.filter(order => {
    const matchesSearch = (order.orderNumber || order.id.toString()).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status?.toLowerCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary px-4 pt-12 pb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/home")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">My Orders</h1>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <BottomNavigation currentPage="orders" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/home")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">My Orders</h1>
              <p className="text-white/80 text-sm">
                {userOrders.length > 0 ? `${userOrders.length} orders found` : "No orders yet"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-3">
        {/* Search and Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {userOrders.length === 0 ? "No orders yet" : "No orders found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {userOrders.length === 0 
                  ? "Start ordering delicious food from our menu!"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              <Button onClick={() => setLocation("/home")}>
                Browse Menu
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">Order #{order.orderNumber || order.id}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()} at{' '}
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status || 'pending')}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(order.status || 'pending')}
                        <span className="capitalize">{order.status || 'Pending'}</span>
                      </div>
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">₹{order.amount}</p>
                      <p className="text-sm text-muted-foreground">
                        Payment: Pending
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/order-status/${order.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation currentPage="orders" />
    </div>
  );
}