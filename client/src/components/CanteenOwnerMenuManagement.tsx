import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { VegIndicator } from "@/components/ui/VegIndicator";
import type { MenuItem, Category } from "@shared/schema";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Loader2,
  X,
  ChefHat,
  TrendingUp,
  AlertTriangle,
  Package,
  BarChart3,
  Filter,
  Minus
} from "lucide-react";

interface CanteenOwnerMenuManagementProps {
  menuItems: MenuItem[];
  categories: Category[];
  onMenuUpdate: () => void;
}

export default function CanteenOwnerMenuManagement({ 
  menuItems, 
  categories, 
  onMenuUpdate 
}: CanteenOwnerMenuManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all, low_stock, out_of_stock
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    categoryId: "",
    description: "",
    stock: "",
    available: true,
    isVegetarian: true,
    isMarkable: true,
    addOns: "[]"
  });
  const [addOns, setAddOns] = useState<Array<{ name: string; price: string }>>([]);
  const { toast } = useToast();

  // Enhanced mutations with comprehensive synchronization
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MenuItem> }) => {
      return apiRequest(`/api/menu/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
      toast({
        title: "Success",
        description: "Menu item updated successfully!"
      });
      onMenuUpdate();
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to update menu item. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addMenuItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/menu', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
      toast({
        title: "Success",
        description: "Menu item added successfully!"
      });
      resetForm();
      setIsAddingItem(false);
      onMenuUpdate();
    },
    onError: (error) => {
      console.error('Add error:', error);
      toast({
        title: "Error",
        description: "Failed to add menu item. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/menu/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
      toast({
        title: "Success",
        description: "Menu item deleted successfully!"
      });
      onMenuUpdate();
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete menu item. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Success",
        description: "Category added successfully!"
      });
      setNewCategoryName("");
      setIsAddingCategory(false);
      onMenuUpdate();
    },
    onError: (error) => {
      console.error('Add category error:', error);
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, newStock }: { id: string; newStock: number }) => {
      return apiRequest(`/api/menu/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ stock: newStock }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
      onMenuUpdate();
    },
    onError: (error) => {
      console.error('Stock update error:', error);
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setEditForm({
      name: "",
      price: "",
      categoryId: "",
      description: "",
      stock: "",
      available: true,
      isVegetarian: true,
      isMarkable: true,
      addOns: "[]"
    });
    setAddOns([]);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || "",
      price: item.price?.toString() || "",
      categoryId: item.categoryId?.toString() || "",
      description: item.description || "",
      stock: item.stock?.toString() || "",
      available: item.available ?? true,
      isVegetarian: item.isVegetarian ?? true,
      isMarkable: item.isMarkable ?? true,
      addOns: item.addOns || "[]"
    });
    
    try {
      const parsedAddOns = JSON.parse(item.addOns || "[]");
      if (Array.isArray(parsedAddOns)) {
        setAddOns(parsedAddOns);
      }
    } catch {
      setAddOns([]);
    }
  };

  const handleSaveEdit = () => {
    if (!editingItem || !editForm.name || !editForm.price || !editForm.categoryId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    const updatedData = {
      name: editForm.name,
      price: parseInt(editForm.price),
      categoryId: editForm.categoryId,
      description: editForm.description,
      stock: parseInt(editForm.stock),
      available: editForm.available,
      isVegetarian: editForm.isVegetarian,
      isMarkable: editForm.isMarkable,
      addOns: JSON.stringify(addOns.filter(addon => addon.name && addon.price))
    };
    
    updateMenuItemMutation.mutate({ id: editingItem.id, data: updatedData });
    setEditingItem(null);
  };

  const handleAdd = () => {
    if (!editForm.name || !editForm.price || !editForm.categoryId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    const newItemData = {
      name: editForm.name,
      price: parseInt(editForm.price),
      categoryId: editForm.categoryId,
      description: editForm.description,
      stock: parseInt(editForm.stock) || 0,
      available: editForm.available,
      isVegetarian: editForm.isVegetarian,
      isMarkable: editForm.isMarkable,
      addOns: JSON.stringify(addOns.filter(addon => addon.name && addon.price))
    };
    
    addMenuItemMutation.mutate(newItemData);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }
    
    addCategoryMutation.mutate({ name: newCategoryName.trim() });
  };

  const addAddon = () => {
    setAddOns([...addOns, { name: "", price: "" }]);
  };

  const removeAddon = (index: number) => {
    setAddOns(addOns.filter((_, i) => i !== index));
  };

  const updateAddon = (index: number, field: 'name' | 'price', value: string) => {
    const updated = [...addOns];
    updated[index][field] = value;
    setAddOns(updated);
  };

  // Get real stock data for menu items
  const getStockData = (item: MenuItem) => {
    const currentStock = item.stock || 0;
    const minThreshold = 5;
    let status = "in_stock";
    if (currentStock === 0) status = "out_of_stock";
    else if (currentStock <= minThreshold) status = "low_stock";
    
    return {
      currentStock,
      minThreshold,
      status
    };
  };

  // Enhanced menu items with stock data
  const menuItemsWithStock = menuItems.map(item => ({
    ...item,
    stockData: getStockData(item)
  }));

  // Calculate analytics
  const totalItems = menuItemsWithStock.length;
  const lowStockItems = menuItemsWithStock.filter(item => item.stockData.status === "low_stock").length;
  const outOfStockItems = menuItemsWithStock.filter(item => item.stockData.status === "out_of_stock").length;
  const inStockItems = menuItemsWithStock.filter(item => item.stockData.status === "in_stock").length;
  const totalStockValue = menuItemsWithStock.reduce((sum, item) => sum + (item.stockData.currentStock * item.price), 0);

  // Filter menu items
  const filteredItems = menuItemsWithStock.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
      categories.find(cat => cat.id === item.categoryId)?.name === selectedCategory;
    const matchesStock = stockFilter === "all" || item.stockData.status === stockFilter;
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">In Stock</p>
                <p className="text-xl font-bold text-green-600">{inStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-orange-600">{lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-bold text-red-600">{outOfStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-lg sm:text-2xl font-bold flex items-center">
            <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            Menu Management
          </h2>
          <div className="flex flex-col xs:flex-row gap-2">
          {/* Add Category Dialog */}
          <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-category">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new category for your menu items.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name *</Label>
                  <Input
                    id="category-name"
                    data-testid="input-category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Beverages, Snacks, Main Course"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName("");
                  }}
                  data-testid="button-cancel-add-category"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCategory}
                  disabled={addCategoryMutation.isPending}
                  data-testid="button-save-add-category"
                >
                  {addCategoryMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Menu Item Dialog */}
          <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-menu-item">
                <Plus className="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Menu Item</DialogTitle>
              <DialogDescription>
                Add a new item to your menu with all the necessary details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="add-name">Name *</Label>
                <Input
                  id="add-name"
                  data-testid="input-item-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Item name"
                />
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="add-price">Price (₹) *</Label>
                <Input
                  id="add-price"
                  data-testid="input-item-price"
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                  placeholder="0"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="add-category">Category *</Label>
                <Select value={editForm.categoryId} onValueChange={(value) => setEditForm({...editForm, categoryId: value})}>
                  <SelectTrigger data-testid="select-item-category">
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
              <div className="space-y-2">
                <Label htmlFor="add-description">Description</Label>
                <Textarea
                  id="add-description"
                  data-testid="input-item-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Item description"
                  rows={3}
                />
              </div>

              {/* Stock */}
              <div className="space-y-2">
                <Label htmlFor="add-stock">Stock</Label>
                <Input
                  id="add-stock"
                  data-testid="input-item-stock"
                  type="number"
                  value={editForm.stock}
                  onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                  placeholder="0"
                />
              </div>

              {/* Available */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-available"
                  data-testid="switch-item-available"
                  checked={editForm.available}
                  onCheckedChange={(checked) => setEditForm({...editForm, available: checked})}
                />
                <Label htmlFor="add-available">Available</Label>
              </div>

              {/* Vegetarian */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-vegetarian"
                  data-testid="switch-item-vegetarian"
                  checked={editForm.isVegetarian}
                  onCheckedChange={(checked) => setEditForm({...editForm, isVegetarian: checked})}
                />
                <Label htmlFor="add-vegetarian">Vegetarian</Label>
              </div>

              {/* Markable */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-markable"
                  data-testid="switch-item-markable"
                  checked={editForm.isMarkable}
                  onCheckedChange={(checked) => setEditForm({...editForm, isMarkable: checked})}
                />
                <div className="space-y-1">
                  <Label htmlFor="add-markable">Markable Dish</Label>
                  <p className="text-xs text-muted-foreground">
                    {editForm.isMarkable ? "Requires preparation - manually mark as ready" : "Auto-ready - order goes directly to ready status"}
                  </p>
                </div>
              </div>

              {/* Add-ons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Add-ons</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAddon}
                    data-testid="button-add-addon"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Add-on
                  </Button>
                </div>
                <div className="space-y-2">
                  {addOns.map((addon, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Add-on name"
                        value={addon.name}
                        onChange={(e) => updateAddon(index, 'name', e.target.value)}
                        data-testid={`input-addon-name-${index}`}
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={addon.price}
                        onChange={(e) => updateAddon(index, 'price', e.target.value)}
                        data-testid={`input-addon-price-${index}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAddon(index)}
                        data-testid={`button-remove-addon-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingItem(false);
                  resetForm();
                }}
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={addMenuItemMutation.isPending}
                data-testid="button-save-add"
              >
                {addMenuItemMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm sm:text-base"
              data-testid="input-search-menu"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-2 border rounded-md text-xs sm:text-sm flex-1 min-w-0"
              data-testid="select-filter-category"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-2 py-2 border rounded-md text-xs sm:text-sm flex-1 min-w-0"
              data-testid="select-filter-stock"
            >
              <option value="all">All Stock</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <p>No menu items found</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="relative overflow-hidden">
              <CardContent className="p-2 sm:p-3">
                <div className="flex gap-2">
                  {/* Main Content - Left Side */}
                  <div className="flex-1 space-y-1 sm:space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2 sm:justify-start">
                        <div className="flex items-center space-x-1 flex-1 min-w-0">
                          <h3 className="font-medium truncate text-xs sm:text-sm" data-testid={`text-item-name-${item.id}`}>
                            {item.name}
                          </h3>
                          <VegIndicator isVegetarian={item.isVegetarian} />
                        </div>
                        <p className="text-sm sm:text-base font-bold text-primary whitespace-nowrap sm:hidden" data-testid={`text-item-price-${item.id}`}>
                          ₹{item.price}
                        </p>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-primary hidden sm:block" data-testid={`text-item-price-${item.id}`}>
                        ₹{item.price}
                      </p>
                      <div className="text-xs text-muted-foreground truncate">
                        {categories.find(cat => cat.id === item.categoryId)?.name || 'Unknown'}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-1 text-xs sm:hidden">
                      <Badge 
                        variant={item.available ? "default" : "secondary"}
                        className="text-xs px-1.5 py-0.5"
                        data-testid={`badge-item-status-${item.id}`}
                      >
                        {item.available ? "Available" : "Unavailable"}
                      </Badge>
                      <Badge 
                        variant={item.isMarkable ? "secondary" : "outline"}
                        className={`text-xs px-1.5 py-0.5 ${item.isMarkable ? "bg-blue-100 text-blue-800 border-blue-200" : ""}`}
                        data-testid={`badge-item-markable-${item.id}`}
                      >
                        {item.isMarkable ? "Markable" : "Auto"}
                      </Badge>
                    </div>

                    {/* Status Badges for larger screens */}
                    <div className="hidden sm:flex flex-wrap gap-1 text-xs">
                      <Badge 
                        variant={item.available ? "default" : "secondary"}
                        className="text-xs px-1.5 py-0.5"
                        data-testid={`badge-item-status-${item.id}`}
                      >
                        {item.available ? "Available" : "Unavailable"}
                      </Badge>
                      <Badge 
                        variant={item.isMarkable ? "secondary" : "outline"}
                        className={`text-xs px-1.5 py-0.5 ${item.isMarkable ? "bg-blue-100 text-blue-800 border-blue-200" : ""}`}
                        data-testid={`badge-item-markable-${item.id}`}
                      >
                        {item.isMarkable ? "Markable" : "Auto"}
                      </Badge>
                    </div>
                    
                    {/* Stock Control & Actions for larger screens */}
                    <div className="hidden sm:flex items-center justify-between gap-1">
                      <div className="flex items-center space-x-0.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 text-xs"
                          onClick={() => {
                            const currentStock = item.stock || 0;
                            if (currentStock > 0) {
                              updateStockMutation.mutate({ id: item.id, newStock: currentStock - 1 });
                            }
                          }}
                          disabled={!item.stock || item.stock <= 0 || updateStockMutation.isPending}
                          data-testid={`button-decrease-stock-${item.id}`}
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </Button>
                        <Badge 
                          variant={
                            item.stockData.status === "in_stock" ? "default" : 
                            item.stockData.status === "low_stock" ? "destructive" : "secondary"
                          }
                          className={`text-xs px-1.5 py-0.5 min-w-[45px] text-center ${
                            item.stockData.status === "in_stock" ? "bg-green-100 text-green-800 border-green-200" :
                            item.stockData.status === "low_stock" ? "bg-orange-100 text-orange-800 border-orange-200" :
                            "bg-red-100 text-red-800 border-red-200"
                          }`}
                          data-testid={`badge-item-stock-${item.id}`}
                        >
                          {item.stock || 0} pcs
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 text-xs"
                          onClick={() => {
                            const currentStock = item.stock || 0;
                            updateStockMutation.mutate({ id: item.id, newStock: currentStock + 1 });
                          }}
                          disabled={updateStockMutation.isPending}
                          data-testid={`button-increase-stock-${item.id}`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                      
                      <div className="flex space-x-0.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="w-2.5 h-2.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => deleteMenuItemMutation.mutate(item.id)}
                          disabled={deleteMenuItemMutation.isPending}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Controls - Right Side (Mobile Only) */}
                  <div className="flex flex-col gap-0.5 sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 p-0 text-xs"
                      onClick={() => {
                        const currentStock = item.stock || 0;
                        if (currentStock > 0) {
                          updateStockMutation.mutate({ id: item.id, newStock: currentStock - 1 });
                        }
                      }}
                      disabled={!item.stock || item.stock <= 0 || updateStockMutation.isPending}
                      data-testid={`button-decrease-stock-${item.id}`}
                    >
                      <Minus className="w-2 h-2" />
                    </Button>
                    
                    <div className="h-6 w-5 flex items-center justify-center">
                      <Badge 
                        variant={
                          item.stockData.status === "in_stock" ? "default" : 
                          item.stockData.status === "low_stock" ? "destructive" : "secondary"
                        }
                        className={`text-xs px-1 py-0.5 w-full text-center ${
                          item.stockData.status === "in_stock" ? "bg-green-100 text-green-800 border-green-200" :
                          item.stockData.status === "low_stock" ? "bg-orange-100 text-orange-800 border-orange-200" :
                          "bg-red-100 text-red-800 border-red-200"
                        }`}
                        data-testid={`badge-item-stock-${item.id}`}
                      >
                        {item.stock || 0}
                      </Badge>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 p-0 text-xs"
                      onClick={() => {
                        const currentStock = item.stock || 0;
                        updateStockMutation.mutate({ id: item.id, newStock: currentStock + 1 });
                      }}
                      disabled={updateStockMutation.isPending}
                      data-testid={`button-increase-stock-${item.id}`}
                    >
                      <Plus className="w-2 h-2" />
                    </Button>
                    
                    <div className="h-1"></div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 p-0 text-xs"
                      onClick={() => handleEdit(item)}
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Edit className="w-2 h-2" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 p-0 text-xs"
                      onClick={() => deleteMenuItemMutation.mutate(item.id)}
                      disabled={deleteMenuItemMutation.isPending}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="w-2 h-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update the details of your menu item.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
              {/* Same form fields as add dialog but with edit data */}
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  data-testid="input-edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Item name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (₹) *</Label>
                <Input
                  id="edit-price"
                  data-testid="input-edit-price"
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={editForm.categoryId} onValueChange={(value) => setEditForm({...editForm, categoryId: value})}>
                  <SelectTrigger data-testid="select-edit-category">
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

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  data-testid="input-edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Item description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock</Label>
                <Input
                  id="edit-stock"
                  data-testid="input-edit-stock"
                  type="number"
                  value={editForm.stock}
                  onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-available"
                  data-testid="switch-edit-available"
                  checked={editForm.available}
                  onCheckedChange={(checked) => setEditForm({...editForm, available: checked})}
                />
                <Label htmlFor="edit-available">Available</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-vegetarian"
                  data-testid="switch-edit-vegetarian"
                  checked={editForm.isVegetarian}
                  onCheckedChange={(checked) => setEditForm({...editForm, isVegetarian: checked})}
                />
                <Label htmlFor="edit-vegetarian">Vegetarian</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-markable"
                  data-testid="switch-edit-markable"
                  checked={editForm.isMarkable}
                  onCheckedChange={(checked) => setEditForm({...editForm, isMarkable: checked})}
                />
                <div className="space-y-1">
                  <Label htmlFor="edit-markable">Markable Dish</Label>
                  <p className="text-xs text-muted-foreground">
                    {editForm.isMarkable ? "Requires preparation - manually mark as ready" : "Auto-ready - order goes directly to ready status"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Add-ons</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAddon}
                    data-testid="button-edit-add-addon"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Add-on
                  </Button>
                </div>
                <div className="space-y-2">
                  {addOns.map((addon, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Add-on name"
                        value={addon.name}
                        onChange={(e) => updateAddon(index, 'name', e.target.value)}
                        data-testid={`input-edit-addon-name-${index}`}
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={addon.price}
                        onChange={(e) => updateAddon(index, 'price', e.target.value)}
                        data-testid={`input-edit-addon-price-${index}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAddon(index)}
                        data-testid={`button-edit-remove-addon-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMenuItemMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMenuItemMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}