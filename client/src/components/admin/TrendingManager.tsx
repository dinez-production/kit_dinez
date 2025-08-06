import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, TrendingUp, Star } from "lucide-react";
import { VegIndicator } from "@/components/ui/VegIndicator";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem } from "@shared/schema";

type TrendingItem = {
  id: number;
  menuItemId: number;
  position: number;
  isActive: boolean;
  createdAt: string;
  menuItem: MenuItem;
};

export function TrendingManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTrendingItem, setEditingTrendingItem] = useState<TrendingItem | null>(null);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");

  const { data: trendingItems = [], isLoading: trendingItemsLoading } = useQuery<TrendingItem[]>({
    queryKey: ["/api/trending-items"],
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  // Get available menu items (not already in trending)
  const availableMenuItems = menuItems.filter(item => 
    !trendingItems.some(trending => trending.menuItemId === item.id)
  );

  // Get next available position
  const getNextPosition = () => {
    const usedPositions = trendingItems.map(item => item.position);
    for (let i = 1; i <= 10; i++) {
      if (!usedPositions.includes(i)) return i;
    }
    return usedPositions.length + 1;
  };

  const createTrendingItemMutation = useMutation({
    mutationFn: async (data: { menuItemId: number; position: number; isActive: boolean }) => {
      return apiRequest('/api/trending-items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trending-items'] });
      toast({
        title: "Success",
        description: "Trending item added successfully!",
      });
      setIsAddDialogOpen(false);
      setSelectedMenuItemId("");
      setSelectedPosition("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add trending item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTrendingItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TrendingItem> }) => {
      return apiRequest(`/api/trending-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trending-items'] });
      toast({
        title: "Success",
        description: "Trending item updated successfully!",
      });
      setEditingTrendingItem(null);
      setSelectedMenuItemId("");
      setSelectedPosition("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trending item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTrendingItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/trending-items/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trending-items'] });
      toast({
        title: "Success",
        description: "Trending item removed successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove trending item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddTrendingItem = () => {
    if (!selectedMenuItemId || !selectedPosition) {
      toast({
        title: "Error",
        description: "Please select both a menu item and position.",
        variant: "destructive",
      });
      return;
    }

    const position = parseInt(selectedPosition);
    const existingItem = trendingItems.find(item => item.position === position);
    
    if (existingItem) {
      toast({
        title: "Error",
        description: `Position ${position} is already taken.`,
        variant: "destructive",
      });
      return;
    }

    createTrendingItemMutation.mutate({
      menuItemId: parseInt(selectedMenuItemId),
      position,
      isActive: true,
    });
  };

  const handleEditTrendingItem = (trendingItem: TrendingItem) => {
    setEditingTrendingItem(trendingItem);
    setSelectedMenuItemId(trendingItem.menuItemId.toString());
    setSelectedPosition(trendingItem.position.toString());
  };

  const handleUpdateTrendingItem = () => {
    if (!editingTrendingItem || !selectedMenuItemId || !selectedPosition) return;

    const position = parseInt(selectedPosition);
    const existingItem = trendingItems.find(item => 
      item.position === position && item.id !== editingTrendingItem.id
    );
    
    if (existingItem) {
      toast({
        title: "Error",
        description: `Position ${position} is already taken.`,
        variant: "destructive",
      });
      return;
    }

    updateTrendingItemMutation.mutate({
      id: editingTrendingItem.id,
      data: {
        menuItemId: parseInt(selectedMenuItemId),
        position,
        isActive: true,
      },
    });
  };

  const handleDeleteTrendingItem = (id: number) => {
    if (confirm("Are you sure you want to remove this trending item?")) {
      deleteTrendingItemMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Trending Items Management</span>
          </span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Trending Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Trending Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="menu-item">Menu Item</Label>
                  <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItemsLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : availableMenuItems.length === 0 ? (
                        <SelectItem value="no-items" disabled>All items are already featured</SelectItem>
                      ) : (
                        availableMenuItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <span>{item.name}</span>
                              <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                              <span className="text-sm text-muted-foreground">₹{item.price}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="position">Display Position</Label>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((position) => {
                        const isUsed = trendingItems.some(item => item.position === position);
                        return (
                          <SelectItem 
                            key={position} 
                            value={position.toString()}
                            disabled={isUsed}
                          >
                            Position {position} {isUsed && "(Used)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAddTrendingItem}
                  disabled={createTrendingItemMutation.isPending}
                  className="w-full"
                >
                  {createTrendingItemMutation.isPending ? "Adding..." : "Add Trending Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trendingItemsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 border rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : trendingItems.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Trending Items</h3>
            <p className="text-muted-foreground mb-4">
              Add trending items to showcase popular dishes on the home page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trendingItems
              .sort((a, b) => a.position - b.position)
              .map((trendingItem) => (
                <div key={trendingItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge className="bg-orange-500 text-white">
                      #{trendingItem.position}
                    </Badge>
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🔥</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{trendingItem.menuItem.name}</h4>
                        <VegIndicator isVegetarian={trendingItem.menuItem.isVegetarian} size="sm" />
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₹{trendingItem.menuItem.price} • Position {trendingItem.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditTrendingItem(trendingItem)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteTrendingItem(trendingItem.id)}
                      disabled={deleteTrendingItemMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingTrendingItem && (
          <Dialog open={!!editingTrendingItem} onOpenChange={() => setEditingTrendingItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Trending Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-menu-item">Menu Item</Label>
                  <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...availableMenuItems, editingTrendingItem.menuItem].map((item) => (
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

                <div>
                  <Label htmlFor="edit-position">Display Position</Label>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((position) => {
                        const isUsed = trendingItems.some(item => 
                          item.position === position && item.id !== editingTrendingItem.id
                        );
                        return (
                          <SelectItem 
                            key={position} 
                            value={position.toString()}
                            disabled={isUsed}
                          >
                            Position {position} {isUsed && "(Used)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleUpdateTrendingItem}
                  disabled={updateTrendingItemMutation.isPending}
                  className="w-full"
                >
                  {updateTrendingItemMutation.isPending ? "Updating..." : "Update Trending Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}