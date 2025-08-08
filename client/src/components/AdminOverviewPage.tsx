import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  RefreshCcw
} from "lucide-react";
import type { Order, User } from "@shared/schema";

export default function AdminOverviewPage() {
  // Fetch real data from database
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    refetchInterval: false, // Disable polling - using SSE for real-time updates
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Refresh all data function
  const refreshAllData = async () => {
    try {
      await Promise.all([
        refetchOrders(),
        refetchUsers()
      ]);
      toast.success("Data refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  };

  // Calculate real stats from database data
  const stats = {
    totalRevenue: orders.reduce((sum, order) => sum + order.amount, 0),
    totalUsers: users.length || 0,
    totalOrders: orders.length,
    activeCanteens: 1,
    pendingOrders: orders.filter(order => order.status === 'preparing').length,
    completedOrders: orders.filter(order => order.status === 'completed').length,
    averageRating: 0, // To be calculated when ratings are available
    systemUptime: 100
  };



  // Get recent activity from orders (last 5 orders)
  const recentActivity = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(order => ({
      id: order.id,
      message: `New order #${order.orderNumber} by ${order.customerName}`,
      time: new Date(order.createdAt).toLocaleTimeString(),
      status: order.status
    }));

  // Calculate top performing items (placeholder for now)
  const topPerformingItems: Array<{name: string, orders: number, revenue: number}> = [];

  return (
    <div className="p-6 space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor your canteen operations</p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshAllData}
          disabled={ordersLoading || usersLoading}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {usersLoading ? 'Loading...' : `${users.length} registered users`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.systemUptime}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Order Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Orders</span>
            <Badge variant="secondary">{stats.pendingOrders}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Completed Orders</span>
            <Badge variant="secondary">{stats.completedOrders}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span>{((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(stats.completedOrders / stats.totalOrders) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Rating</span>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="font-semibold">{stats.averageRating}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Canteens</span>
              <Badge variant="secondary">{stats.activeCanteens}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Customer Satisfaction</span>
                <span>{((stats.averageRating / 5) * 100).toFixed(0)}%</span>
              </div>
              <Progress value={(stats.averageRating / 5) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Top Performing Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'completed' ? 'bg-success' :
                    activity.status === 'cancelled' ? 'bg-destructive' :
                    activity.status === 'preparing' ? 'bg-warning' : 'bg-primary'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformingItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">₹{item.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}