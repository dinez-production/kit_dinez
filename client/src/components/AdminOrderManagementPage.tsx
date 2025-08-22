import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { usePaginatedOrders } from "@/hooks/usePaginatedOrders";
import type { Order } from "@shared/schema";
import { formatOrderIdDisplay } from "@shared/utils";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  RefreshCw,
  Package,
  User,
  Calendar,
  MapPin
} from "lucide-react";

export default function AdminOrderManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();

  // Use paginated orders hook
  const {
    orders,
    totalCount,
    totalPages,
    currentPage,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    hasNextPage,
    hasPreviousPage
  } = usePaginatedOrders(1, 15);

  // Fetch all orders for client-side filtering (status counts)
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch menu items for detailed order view
  const { data: menuItems = [] } = useQuery({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const response = await fetch('/api/menu');
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Parse order items from JSON string
  const parseOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  // Get menu item details for order items
  const getOrderItemDetails = (orderItemsString: string) => {
    const orderItems = parseOrderItems(orderItemsString);
    return orderItems.map((item: any) => {
      // Try multiple matching strategies for menu item ID
      const menuItem = menuItems.find((mi: any) => 
        mi.id === item.menuItemId || 
        mi._id === item.menuItemId ||
        mi.id === item.id ||
        mi._id === item.id ||
        String(mi.id) === String(item.menuItemId) ||
        String(mi._id) === String(item.menuItemId)
      );
      
      return {
        ...item,
        name: menuItem?.name || item.name || 'Unknown Item',
        description: menuItem?.description || item.description || '',
        image: menuItem?.image || item.image || '',
        price: item.price || menuItem?.price || 0,
        subtotal: (item.price || menuItem?.price || 0) * (item.quantity || 1)
      };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "warning";
      case "preparing": return "primary";
      case "ready": return "success";
      case "completed": return "success";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return Clock;
      case "preparing": return RefreshCw;
      case "ready": return CheckCircle;
      case "completed": return CheckCircle;
      case "cancelled": return XCircle;
      default: return AlertTriangle;
    }
  };

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number, newStatus: string }) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    onSuccess: (_, { orderId, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order Updated",
        description: `Order ${orderId} has been updated to ${newStatus}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  });

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your order data is being exported to CSV",
    });
  };

  const handleRefresh = () => {
    refetchOrders();
    toast({
      title: "Refreshed",
      description: "Order data has been refreshed",
    });
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleCardClick = (order: Order) => {
    handleViewOrder(order);
  };

  const handleFilter = () => {
    toast({
      title: "Filters",
      description: "Advanced filter options coming soon",
    });
  };

  // Client-side filtering for currently displayed orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === "" || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm) ||
      (order.barcode && order.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: allOrders.length,
    pending: allOrders.filter(o => o.status === "pending").length,
    preparing: allOrders.filter(o => o.status === "preparing").length,
    ready: allOrders.filter(o => o.status === "ready").length,
    completed: allOrders.filter(o => o.status === "completed").length,
    cancelled: allOrders.filter(o => o.status === "cancelled").length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
          <p className="text-muted-foreground">Monitor and manage all customer orders</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center space-x-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          <Button variant="food" className="flex items-center space-x-2" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, customer name, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center space-x-2" onClick={handleFilter}>
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="preparing">Preparing ({statusCounts.preparing})</TabsTrigger>
          <TabsTrigger value="ready">Ready ({statusCounts.ready})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({statusCounts.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders ({totalCount} total, {filteredOrders.length} displayed)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const StatusIcon = getStatusIcon(order.status);
                  const orderItems = getOrderItemDetails(order.items);
                  return (
                    <div 
                      key={order.id} 
                      className="p-4 border rounded-lg space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleCardClick(order)}
                      data-testid={`order-card-${order.id}`}
                    >
                      {/* Order Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-foreground">
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
                          </h3>
                          <Badge variant={getStatusColor(order.status) as any} className="flex items-center space-x-1">
                            <StatusIcon className="w-3 h-3" />
                            <span className="capitalize">{order.status}</span>
                          </Badge>
                          <Badge variant="outline">Canteen</Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center space-x-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOrder(order);
                            }}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </Button>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Customer</p>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-muted-foreground text-xs">ID: {order.customerId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Items</p>
                          <div className="space-y-1">
                            {orderItems.slice(0, 2).map((item: any, idx: number) => (
                              <div key={idx} className="font-medium text-sm">
                                {item.quantity}x {item.name}
                              </div>
                            ))}
                            {orderItems.length > 2 && (
                              <p className="text-xs text-muted-foreground">+{orderItems.length - 2} more items</p>
                            )}
                            {orderItems.length === 0 && (
                              <p className="font-medium text-sm text-muted-foreground">No items</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium text-success">₹{order.amount}</p>
                          <p className="text-muted-foreground text-xs">Paid</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time</p>
                          <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
                          <p className="text-muted-foreground text-xs">{order.estimatedTime} mins</p>
                        </div>
                      </div>

                      {/* Order Actions */}
                      {order.status !== "completed" && order.status !== "cancelled" && (
                        <div className="flex items-center space-x-2 pt-2 border-t">
                          {order.status === "preparing" && (
                            <Button 
                              size="sm" 
                              variant="food"
                              onClick={() => updateOrderStatus.mutate({ orderId: parseInt(order.id), newStatus: "ready" })}
                            >
                              Mark as Ready
                            </Button>
                          )}
                          {order.status === "ready" && (
                            <Button 
                              size="sm" 
                              variant="food"
                              onClick={() => updateOrderStatus.mutate({ orderId: parseInt(order.id), newStatus: "completed" })}
                            >
                              Mark as Completed
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders found matching your criteria.
                  </div>
                )}
              </div>

              {/* Pagination */}
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
                  totalCount={totalCount}
                  pageSize={15}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="order-details-modal">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-primary" />
                  <span>Order Details</span>
                  <Badge variant={getStatusColor(selectedOrder.status) as any} className="flex items-center space-x-1">
                    {(() => {
                      const StatusIcon = getStatusIcon(selectedOrder.status);
                      return <StatusIcon className="w-3 h-3" />;
                    })()}
                    <span className="capitalize">{selectedOrder.status}</span>
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Order Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Package className="w-8 h-8 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Order Number</p>
                          <p className="font-bold">
                            {(() => {
                              const formatted = formatOrderIdDisplay(selectedOrder.orderNumber);
                              return (
                                <>
                                  {formatted.prefix}
                                  <span className="bg-primary/20 text-primary font-bold px-1 rounded ml-1">
                                    {formatted.highlighted}
                                  </span>
                                </>
                              );
                            })()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <User className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Customer</p>
                          <p className="font-bold">{selectedOrder.customerName}</p>
                          <p className="text-xs text-muted-foreground">ID: {selectedOrder.customerId}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Order Time</p>
                          <p className="font-bold">{new Date(selectedOrder.createdAt).toLocaleTimeString()}</p>
                          <p className="text-xs text-muted-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-8 h-8 text-orange-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-bold">Canteen</p>
                          <p className="text-xs text-muted-foreground">{selectedOrder.estimatedTime} mins</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      <span>Order Items</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getOrderItemDetails(selectedOrder.items).map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`order-item-${index}`}>
                          <div className="flex items-center space-x-4">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                                <Package className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              )}
                              <p className="text-sm text-muted-foreground">₹{item.price} each</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">Qty: {item.quantity}</p>
                            <p className="font-bold text-primary">₹{item.subtotal}</p>
                          </div>
                        </div>
                      ))}
                      
                      {getOrderItemDetails(selectedOrder.items).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No items found in this order.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{selectedOrder.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxes & Fees:</span>
                        <span>₹0.00</span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span className="text-primary">₹{selectedOrder.amount}</span>
                        </div>
                      </div>
                      
                      {selectedOrder.barcode && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Pickup Code:</p>
                          <p className="font-mono font-bold text-lg">{selectedOrder.barcode}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {selectedOrder.barcodeUsed ? 'Used' : 'Available'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Order Actions */}
                {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-3">
                        {selectedOrder.status === "preparing" && (
                          <Button 
                            variant="default"
                            onClick={() => {
                              updateOrderStatus.mutate({ orderId: parseInt(selectedOrder.id), newStatus: "ready" });
                              setIsDetailModalOpen(false);
                            }}
                            className="flex items-center space-x-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Mark as Ready</span>
                          </Button>
                        )}
                        {selectedOrder.status === "ready" && (
                          <Button 
                            variant="default"
                            onClick={() => {
                              updateOrderStatus.mutate({ orderId: parseInt(selectedOrder.id), newStatus: "completed" });
                              setIsDetailModalOpen(false);
                            }}
                            className="flex items-center space-x-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Mark as Completed</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}