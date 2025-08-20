import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthSync } from "@/hooks/useDataSync";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Edit, Clock, Star, LogOut, ChevronRight } from "lucide-react";
import BottomNavigation from "./BottomNavigation";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { queryClient } from "@/lib/queryClient";
import UserProfileDisplay from "./UserProfileDisplay";
import AppUpdateButton from "./AppUpdateButton";
import { formatOrderIdDisplay } from "@shared/utils";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const { isAuthenticated } = useAuthSync();
  const { logout } = useAuth();
  const isMobile = useIsMobile();

  // Enhanced security check for authenticated users only
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please log in to view your profile.");
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, setLocation]);
  const [userInfo, setUserInfo] = useState<any>(null);

  // Get user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserInfo(user);
    }
  }, []);

  // Fetch user's orders to calculate stats
  const { data: orders = [], refetch } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!userInfo?.email, // Only fetch when we have user email
  });

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await refetch();
  };

  // Calculate user statistics from orders - filter by current user
  const userOrders = (orders as any[]).filter((order: any) => {
    const currentUserId = userInfo?.email ? JSON.parse(localStorage.getItem('user') || '{}').id : null;
    return order.customerId === currentUserId || 
           order.customerName === userInfo?.name ||
           order.customerName?.toLowerCase().includes(userInfo?.name?.toLowerCase() || '');
  });

  const stats = {
    totalOrders: userOrders.length,
    totalSpent: userOrders.reduce((total: number, order: any) => total + (order.amount || 0), 0),
    favoriteItem: "None", // Could be calculated from order items
    avgRating: 0
  };

  // Use userOrders as orderHistory for displaying recent orders with formatted order numbers
  const orderHistory = userOrders.slice(0, 3).map((order: any) => {
    const formatted = formatOrderIdDisplay(order.orderNumber || order.id);
    return {
      id: order.orderNumber || order.id,
      formattedId: formatted,
      date: new Date(order.createdAt || Date.now()).toLocaleDateString(),
      total: order.amount || 0,
      status: order.status || 'completed'
    };
  });

  const handleSave = () => {
    setIsEditing(false);
    // In real app, this would save to backend
  };

  const handleLogout = async () => {
    console.log("🚀 Profile page logout initiated...");
    
    // Use the enhanced logout from useAuth hook
    await logout();
  };

  return (
    <>
      <PullToRefresh
        onRefresh={handleRefresh}
        enabled={isMobile}
        threshold={80}
        className="min-h-screen bg-background pb-20"
      >
      {/* Header */}
      <div className="bg-primary px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Profile</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Header */}
        <div className="flex items-center space-x-4 mt-6">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-white text-primary text-2xl font-bold">
              {userInfo?.name ? userInfo.name.split(' ').map((n: string) => n[0]).join('') : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-white">
            <h2 className="text-xl font-bold">{userInfo?.name || "User"}</h2>
            <p className="text-white/80 capitalize">{userInfo?.role ? userInfo.role.replace('_', ' ') : 'Student'}</p>
            <p className="text-white/80 text-sm">{userInfo?.email}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* User Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">₹{stats.totalSpent}</p>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Personal Information - Use new profile display component */}
        {userInfo && <UserProfileDisplay user={userInfo} />}

        {/* Favorites */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Your Favorites</h3>
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <div>
                  <p className="font-medium">{stats.favoriteItem}</p>
                  <p className="text-sm text-muted-foreground">Most ordered item</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Recent Orders</h3>
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {orderHistory.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Order #{order.formattedId.prefix}
                        <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-1">
                          {order.formattedId.highlighted}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{order.total}</p>
                    <p className="text-sm text-success">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Settings</h3>
            <div className="space-y-3">
              <button 
                className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setLocation("/favorites")}
              >
                <span>My Favorites</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setLocation("/notifications")}
              >
                <span>Notifications</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setLocation("/help-support")}
              >
                <span>Help & Support</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setLocation("/feedback")}
              >
                <span>Feedback</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setLocation("/about")}
              >
                <span>About</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setLocation("/privacy-policy")}
              >
                <span>Privacy Policy</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 rounded-lg transition-colors"
                onClick={() => setLocation("/terms-conditions")}
              >
                <span>Terms of Service</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* App Updates */}
        <div className="mb-4">
          <AppUpdateButton />
        </div>

        {/* Logout */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>

      </PullToRefresh>
      <BottomNavigation currentPage="profile" />
    </>
  );
}