import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Calendar, Users, Percent, IndianRupee, Clock } from "lucide-react";
import { format } from "date-fns";

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  usedBy: number[];
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  createdBy: number;
  createdAt: string;
}

interface CouponForm {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  validFrom: string;
  validUntil: string;
}

export default function AdminCouponManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponForm>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    minimumOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 100,
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // 30 days from now
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get user ID from localStorage (assuming the user is logged in as admin)
  const getCurrentUserId = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      return user.id;
    }
    return 1; // fallback admin ID
  };

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['/api/coupons'],
    queryFn: () => fetch('/api/coupons').then(res => res.json())
  });

  // Create coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: (data: CouponForm) => apiRequest('/api/coupons', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        createdBy: getCurrentUserId(),
        minimumOrderAmount: data.minimumOrderAmount || undefined,
        maxDiscountAmount: data.maxDiscountAmount || undefined
      })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Coupon created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive"
      });
    }
  });

  // Update coupon mutation
  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CouponForm> }) => 
      apiRequest(`/api/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          minimumOrderAmount: data.minimumOrderAmount || undefined,
          maxDiscountAmount: data.maxDiscountAmount || undefined
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      setEditingCoupon(null);
      resetForm();
      toast({
        title: "Success",
        description: "Coupon updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon",
        variant: "destructive"
      });
    }
  });

  // Delete coupon mutation
  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      toast({
        title: "Success",
        description: "Coupon deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete coupon",
        variant: "destructive"
      });
    }
  });

  // Toggle coupon status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/coupons/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      toast({
        title: "Success",
        description: "Coupon status updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon status",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      minimumOrderAmount: 0,
      maxDiscountAmount: 0,
      usageLimit: 100,
      validFrom: new Date().toISOString().slice(0, 16),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    });
  };

  const handleInputChange = (field: keyof CouponForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.code.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (new Date(formData.validFrom) >= new Date(formData.validUntil)) {
      toast({
        title: "Error",
        description: "Valid until date must be after valid from date",
        variant: "destructive"
      });
      return;
    }

    if (editingCoupon) {
      updateCouponMutation.mutate({ id: editingCoupon.id, data: formData });
    } else {
      createCouponMutation.mutate(formData);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumOrderAmount: coupon.minimumOrderAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || 0,
      usageLimit: coupon.usageLimit,
      validFrom: new Date(coupon.validFrom).toISOString().slice(0, 16),
      validUntil: new Date(coupon.validUntil).toISOString().slice(0, 16)
    });
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}% off`;
    } else {
      return `₹${coupon.discountValue} off`;
    }
  };

  const getCouponStatusColor = (coupon: Coupon) => {
    if (!coupon.isActive) return 'bg-gray-500';
    
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    
    if (now > validUntil) return 'bg-red-500';
    if (coupon.usedCount >= coupon.usageLimit) return 'bg-orange-500';
    
    return 'bg-green-500';
  };

  const getCouponStatusText = (coupon: Coupon) => {
    if (!coupon.isActive) return 'Inactive';
    
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    
    if (now > validUntil) return 'Expired';
    if (coupon.usedCount >= coupon.usageLimit) return 'Limit Reached';
    
    return 'Active';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Coupon Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Create and manage discount coupons</p>
        </div>
        
        <Dialog open={showCreateDialog || !!editingCoupon} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setEditingCoupon(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </DialogTitle>
              <DialogDescription>
                {editingCoupon ? 'Update the coupon details' : 'Create a new discount coupon for customers'}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Coupon Code *</Label>
                    <Input
                      id="code"
                      placeholder="e.g., WELCOME10"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type *</Label>
                    <Select value={formData.discountType} onValueChange={(value: 'percentage' | 'fixed') => handleInputChange('discountType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the coupon"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">
                      Discount Value * {formData.discountType === 'percentage' ? '(%)' : '(₹)'}
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      min="1"
                      max={formData.discountType === 'percentage' ? 100 : undefined}
                      value={formData.discountValue}
                      onChange={(e) => handleInputChange('discountValue', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usageLimit">Usage Limit *</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      min="1"
                      placeholder="e.g., 100"
                      value={formData.usageLimit}
                      onChange={(e) => handleInputChange('usageLimit', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrderAmount">Minimum Order Amount (₹)</Label>
                    <Input
                      id="minimumOrderAmount"
                      type="number"
                      min="0"
                      value={formData.minimumOrderAmount}
                      onChange={(e) => handleInputChange('minimumOrderAmount', Number(e.target.value))}
                    />
                  </div>
                  {formData.discountType === 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="maxDiscountAmount">Max Discount Amount (₹)</Label>
                      <Input
                        id="maxDiscountAmount"
                        type="number"
                        min="0"
                        value={formData.maxDiscountAmount}
                        onChange={(e) => handleInputChange('maxDiscountAmount', Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="validFrom">Valid From *</Label>
                    <Input
                      id="validFrom"
                      type="datetime-local"
                      value={formData.validFrom}
                      onChange={(e) => handleInputChange('validFrom', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valid Until *</Label>
                    <Input
                      id="validUntil"
                      type="datetime-local"
                      value={formData.validUntil}
                      onChange={(e) => handleInputChange('validUntil', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setEditingCoupon(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createCouponMutation.isPending || updateCouponMutation.isPending}>
                {createCouponMutation.isPending || updateCouponMutation.isPending ? 'Saving...' : (editingCoupon ? 'Update' : 'Create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Percent className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No coupons yet</h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
              Create your first discount coupon to start offering deals to customers
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Coupon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon: Coupon) => (
            <Card key={coupon.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-mono">{coupon.code}</CardTitle>
                    <Badge className={`${getCouponStatusColor(coupon)} text-white text-xs`}>
                      {getCouponStatusText(coupon)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {getDiscountDisplay(coupon)}
                    </div>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {coupon.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4 mr-1" />
                    Used: {coupon.usedCount}/{coupon.usageLimit}
                  </div>
                  <div className="text-right text-gray-600 dark:text-gray-400">
                    {Math.round((coupon.usedCount / coupon.usageLimit) * 100)}%
                  </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(coupon.usedCount / coupon.usageLimit) * 100}%` }}
                  ></div>
                </div>

                {coupon.minimumOrderAmount && coupon.minimumOrderAmount > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <IndianRupee className="w-4 h-4 inline mr-1" />
                    Min order: ₹{coupon.minimumOrderAmount}
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 mr-1" />
                  Valid until {format(new Date(coupon.validUntil), "MMM dd, yyyy")}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(coupon)}
                      disabled={updateCouponMutation.isPending}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatusMutation.mutate(coupon.id)}
                      disabled={toggleStatusMutation.isPending}
                    >
                      {coupon.isActive ? (
                        <ToggleRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={deleteCouponMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the coupon "{coupon.code}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCouponMutation.mutate(coupon.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}