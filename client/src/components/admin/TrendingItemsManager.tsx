import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VegIndicator } from "@/components/ui/VegIndicator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuItem, TrendingItem } from "@shared/schema";

type TrendingItemWithMenu = TrendingItem & { menuItem: MenuItem };

export function TrendingItemsManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTrendingItem, setEditingTrendingItem] = useState<TrendingItemWithMenu | null>(null);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");

  const { data: trendingItems = [], isLoading: trendingItemsLoading } = useQuery<TrendingItemWithMenu[]>({
    queryKey: ["/api/trending-items"],
    staleTime: 1000 * 30,
    refetchOnMount: true,
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const createTrendingItemMutation = useMutation({
    mutationFn: async (data: { menuItemId: number; position: number }) => {
      return apiRequest("/api/trending-items", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trending-items"] });
      setIsAddDialogOpen(false);
      setSelectedMenuItemId("");
      setSelectedPosition("");
      toast({
        title: "Trending item added",
        description: "The trending item has been successfully configured.",
      });
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
    mutationFn: async (data: { id: number; menuItemId: number; position: number }) => {
      return apiRequest(`/api/trending-items/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({ menuItemId: data.menuItemId, position: data.position, isActive: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trending-items"] });
      setEditingTrendingItem(null);
      setSelectedMenuItemId("");
      setSelectedPosition("");
      toast({
        title: "Trending item updated",
        description: "The trending item has been successfully updated.",
      });
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
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trending-items"] });
      toast({
        title: "Trending item removed",
        description: "The trending item has been successfully removed.",
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
    if (!selectedMenuItemId || !selectedPosition) return;
    
    createTrendingItemMutation.mutate({
      menuItemId: parseInt(selectedMenuItemId),
      position: parseInt(selectedPosition),
    });
  };

  const handleUpdateTrendingItem = () => {
    if (!editingTrendingItem || !selectedMenuItemId || !selectedPosition) return;
    
    updateTrendingItemMutation.mutate({
      id: editingTrendingItem.id,
      menuItemId: parseInt(selectedMenuItemId),
      position: parseInt(selectedPosition),
    });
  };

  const handleEditTrendingItem = (item: TrendingItemWithMenu) => {
    setEditingTrendingItem(item);
    setSelectedMenuItemId(item.menuItemId.toString());
    setSelectedPosition(item.position.toString());
  };

  const handleCancelEdit = () => {
    setEditingTrendingItem(null);
    setSelectedMenuItemId("");
    setSelectedPosition("");
  };

  const availableMenuItems = menuItems.filter(item => item.available);
  const availablePositions = [1, 2, 3, 4, 5, 6].filter(pos => 
    !trendingItems.some(item => item.position === pos && item.id !== editingTrendingItem?.id)
  );

  if (trendingItemsLoading || menuItemsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Trending Items Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading trending items...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Trending Items Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure which menu items appear in the "Trending Now" section on users' home page.
          You can set up to 6 trending items in specific positions.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {trendingItems.length} of 6 trending slots configured
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={trendingItems.length >= 6}>
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
                  <label className="text-sm font-medium">Menu Item</label>
                  <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMenuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          <div className="flex items-center gap-2">
                            <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                            {item.name} - ₹{item.price}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Position</label>
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
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleAddTrendingItem}
                    disabled={!selectedMenuItemId || !selectedPosition || createTrendingItemMutation.isPending}
                  >
                    Add Trending Item
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {trendingItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trending items configured. Add some items to feature in the trending section.
          </div>
        ) : (
          <div className="grid gap-4">
            {trendingItems
              .sort((a, b) => a.position - b.position)
              .map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        Position {item.position}
                      </Badge>
                      <VegIndicator isVegetarian={item.menuItem.isVegetarian} size="sm" />
                      <div>
                        <div className="font-medium">{item.menuItem.name}</div>
                        <div className="text-sm text-muted-foreground">₹{item.menuItem.price}</div>
                      </div>
                      {!item.menuItem.available && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTrendingItem(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTrendingItemMutation.mutate(item.id)}
                        disabled={deleteTrendingItemMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingTrendingItem} onOpenChange={(open) => !open && handleCancelEdit()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Trending Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Menu Item</label>
                <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a menu item" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMenuItems.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        <div className="flex items-center gap-2">
                          <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                          {item.name} - ₹{item.price}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Position</label>
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
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdateTrendingItem}
                  disabled={!selectedMenuItemId || !selectedPosition || updateTrendingItemMutation.isPending}
                >
                  Update Trending Item
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}