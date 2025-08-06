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
import { Switch } from "@/components/ui/switch";
import { Plus, Flame, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VegIndicator } from "@/components/ui/VegIndicator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuItem } from "@shared/schema";

export function TrendingItemsManager() {
  const { toast } = useToast();

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
    staleTime: 1000 * 30,
    refetchOnMount: true,
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuItem> }) => {
      return apiRequest(`/api/menu/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      toast({
        title: "Trending status updated",
        description: "The menu item's trending status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trending status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleTrending = (menuItem: MenuItem) => {
    updateMenuItemMutation.mutate({
      id: menuItem.id,
      data: { isTrending: !menuItem.isTrending },
    });
  };

  const trendingItems = menuItems.filter(item => item.isTrending);
  const availableItems = menuItems.filter(item => item.available);

  if (menuItemsLoading) {
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
            <div className="text-muted-foreground">Loading menu items...</div>
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
          Simply toggle the trending status for any menu item.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-orange-600" />
            <div>
              <div className="font-medium">Currently Trending</div>
              <div className="text-sm text-muted-foreground">
                {trendingItems.length} items marked as trending
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            {trendingItems.length} trending
          </Badge>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">All Menu Items</h3>
          {availableItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No menu items available. Add some menu items first.
            </div>
          ) : (
            <div className="grid gap-3">
              {availableItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{item.name}</div>
                          {item.isTrending && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                              <Flame className="w-3 h-3 mr-1" />
                              Trending
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ₹{item.price} • Stock: {item.stock}
                        </div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground">
                        {item.isTrending ? "Trending" : "Not trending"}
                      </div>
                      <Switch
                        checked={item.isTrending}
                        onCheckedChange={() => handleToggleTrending(item)}
                        disabled={updateMenuItemMutation.isPending}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {trendingItems.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Preview: Trending Items</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-sm text-muted-foreground mb-3">
                This is how these items will appear in the "Trending Now" section:
              </div>
              <div className="grid gap-3">
                {trendingItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{item.name}</div>
                        <VegIndicator isVegetarian={item.isVegetarian} size="sm" />
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                          🔥 Trending
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">Available now</div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}