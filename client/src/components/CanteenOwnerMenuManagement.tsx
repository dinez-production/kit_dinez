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
  ChefHat
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
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    categoryId: "",
    description: "",
    stock: "",
    available: true,
    isVegetarian: true,
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

  const resetForm = () => {
    setEditForm({
      name: "",
      price: "",
      categoryId: "",
      description: "",
      stock: "",
      available: true,
      isVegetarian: true,
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
      addOns: JSON.stringify(addOns.filter(addon => addon.name && addon.price))
    };
    
    addMenuItemMutation.mutate(newItemData);
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

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
      categories.find(cat => cat.id === item.categoryId)?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <ChefHat className="w-6 h-6 mr-2" />
          Menu Management
        </h2>
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

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-menu"
            />
          </div>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-md"
          data-testid="select-filter-category"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Menu Items Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <p>No menu items found</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="relative">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold truncate" data-testid={`text-item-name-${item.id}`}>
                          {item.name}
                        </h3>
                        <VegIndicator isVegetarian={item.isVegetarian} />
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {categories.find(cat => cat.id === item.categoryId)?.name || 'Unknown Category'}
                      </div>
                      <p className="text-lg font-bold text-primary" data-testid={`text-item-price-${item.id}`}>
                        ₹{item.price}
                      </p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={item.available ? "default" : "secondary"}
                        data-testid={`badge-item-status-${item.id}`}
                      >
                        {item.available ? "Available" : "Unavailable"}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-item-stock-${item.id}`}>
                        Stock: {item.stock || 0}
                      </Badge>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMenuItemMutation.mutate(item.id)}
                        disabled={deleteMenuItemMutation.isPending}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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