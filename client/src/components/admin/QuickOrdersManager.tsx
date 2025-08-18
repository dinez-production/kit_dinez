import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Edit, Zap, Save } from "lucide-react";
import { VegIndicator } from "@/components/ui/VegIndicator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuItem } from "@shared/schema";

type QuickOrder = {
  id: string;
  menuItemId: string;
  position: number;
  isActive: boolean;
  createdAt: string;
  menuItem: MenuItem;
};

export function QuickOrdersManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingQuickOrder, setEditingQuickOrder] = useState<QuickOrder | null>(null);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");

  const { data: quickOrders = [], isLoading: quickOrdersLoading } = useQuery<QuickOrder[]>({
    queryKey: ["/api/quick-orders"],
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const createQuickOrderMutation = useMutation({
    mutationFn: async (data: { menuItemId: string; position: number }) => {
      return apiRequest("/api/quick-orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-orders"] });
      setIsAddDialogOpen(false);
      setSelectedMenuItemId("");
      setSelectedPosition("");
      toast({
        title: "Quick order added",
        description: "The quick order has been successfully configured.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add quick order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateQuickOrderMutation = useMutation({
    mutationFn: async (data: { id: string; menuItemId: string; position: number }) => {
      return apiRequest(`/api/quick-orders/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({ menuItemId: data.menuItemId, position: data.position, isActive: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-orders"] });
      setEditingQuickOrder(null);
      setSelectedMenuItemId("");
      setSelectedPosition("");
      toast({
        title: "Quick order updated",
        description: "The quick order has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quick order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteQuickOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiRequest(`/api/quick-orders/${id}`, {
        method: "DELETE",
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-orders"] });
      toast({
        title: "Quick order removed",
        description: "The quick order has been successfully removed.",
      });
    },
    onError: (error: any) => {
      console.error("Delete quick order error:", error);
      toast({
        title: "Error",
        description: `Failed to remove quick order: ${error.message || "Please try again."}`,
        variant: "destructive",
      });
    },
  });

  const availableMenuItems = menuItems.filter(item => 
    !quickOrders.some(qo => qo.menuItemId === item.id)
  );

  const availablePositions = [1, 2, 3, 4].filter(pos => 
    !quickOrders.some(qo => qo.position === pos) || 
    (editingQuickOrder && editingQuickOrder.position === pos)
  );

  const handleAddQuickOrder = () => {
    if (!selectedMenuItemId || !selectedPosition) {
      toast({
        title: "Validation Error",
        description: "Please select both a menu item and position.",
        variant: "destructive",
      });
      return;
    }

    createQuickOrderMutation.mutate({
      menuItemId: selectedMenuItemId,
      position: parseInt(selectedPosition),
    });
  };

  const handleUpdateQuickOrder = () => {
    if (!editingQuickOrder || !selectedMenuItemId || !selectedPosition) return;

    updateQuickOrderMutation.mutate({
      id: editingQuickOrder.id,
      menuItemId: selectedMenuItemId,
      position: parseInt(selectedPosition),
    });
  };

  const openEditDialog = (quickOrder: QuickOrder) => {
    setEditingQuickOrder(quickOrder);
    setSelectedMenuItemId(quickOrder.menuItemId);
    setSelectedPosition(quickOrder.position.toString());
  };

  const closeEditDialog = () => {
    setEditingQuickOrder(null);
    setSelectedMenuItemId("");
    setSelectedPosition("");
  };

  if (quickOrdersLoading || menuItemsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Quick Orders Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Quick Orders Management</span>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Quick Order</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Quick Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="menuItem">Menu Item</Label>
                  <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMenuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <span>{item.name}</span>
                            <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                            <span className="text-sm text-muted-foreground">₹{item.price}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position (1-4)</Label>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePositions.map((pos) => (
                        <SelectItem key={pos} value={pos.toString()}>
                          Position {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAddQuickOrder} 
                  disabled={createQuickOrderMutation.isPending}
                  className="w-full"
                >
                  {createQuickOrderMutation.isPending ? "Adding..." : "Add Quick Order"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure up to 4 quick order items that appear on the home page for instant ordering.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {quickOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No quick orders configured yet.</p>
              <p className="text-sm">Add quick order items to help customers order faster.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickOrders
                .sort((a, b) => a.position - b.position)
                .map((quickOrder) => (
                  <Card key={quickOrder.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">#{quickOrder.position}</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{quickOrder.menuItem.name}</h3>
                              <VegIndicator isVegetarian={quickOrder.menuItem.isVegetarian} size="sm" />
                            </div>
                            <p className="text-sm text-muted-foreground">₹{quickOrder.menuItem.price}</p>
                            <Badge variant={quickOrder.menuItem.available ? "secondary" : "destructive"} className="text-xs">
                              {quickOrder.menuItem.available ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(quickOrder)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Quick Order</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="editMenuItem">Menu Item</Label>
                                  <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a menu item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[...availableMenuItems, quickOrder.menuItem].map((item) => (
                                        <SelectItem key={item.id} value={item.id.toString()}>
                                          <div className="flex items-center space-x-2">
                                            <span>{item.name}</span>
                                            <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                                            <span className="text-sm text-muted-foreground">₹{item.price}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="editPosition">Position (1-4)</Label>
                                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select position" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availablePositions.map((pos) => (
                                        <SelectItem key={pos} value={pos.toString()}>
                                          Position {pos}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    onClick={handleUpdateQuickOrder} 
                                    disabled={updateQuickOrderMutation.isPending}
                                    className="flex-1"
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    {updateQuickOrderMutation.isPending ? "Saving..." : "Save Changes"}
                                  </Button>
                                  <Button variant="outline" onClick={closeEditDialog}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteQuickOrderMutation.mutate(quickOrder.id)}
                            disabled={deleteQuickOrderMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
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
  );
}