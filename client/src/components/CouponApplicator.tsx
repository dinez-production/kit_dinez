import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Ticket, X, Check, AlertCircle, Percent, IndianRupee } from "lucide-react";

interface CouponApplicatorProps {
  totalAmount: number;
  onCouponApplied?: (couponData: {
    code: string;
    discountAmount: number;
    finalAmount: number;
    description: string;
  }) => void;
  onCouponRemoved?: () => void;
  appliedCoupon?: {
    code: string;
    discountAmount: number;
    finalAmount: number;
    description: string;
  } | null;
}

export default function CouponApplicator({
  totalAmount,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon
}: CouponApplicatorProps) {
  const [couponCode, setCouponCode] = useState("");
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    coupon?: any;
    discountAmount?: number;
  } | null>(null);

  const { toast } = useToast();

  // Get user ID from localStorage
  const getCurrentUserId = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      return user.id;
    }
    return null;
  };

  // Validate coupon mutation
  const validateCouponMutation = useMutation({
    mutationFn: ({ code }: { code: string }) =>
      apiRequest('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          userId: getCurrentUserId(),
          orderAmount: totalAmount
        })
      }),
    onSuccess: (result) => {
      setValidationResult(result);
      if (result.valid && onCouponApplied && result.coupon) {
        const finalAmount = totalAmount - (result.discountAmount || 0);
        onCouponApplied({
          code: result.coupon.code,
          discountAmount: result.discountAmount || 0,
          finalAmount,
          description: result.coupon.description
        });
        toast({
          title: "Coupon Applied!",
          description: `You saved ₹${result.discountAmount} on your order`
        });
      } else if (!result.valid) {
        toast({
          title: "Invalid Coupon",
          description: result.message,
          variant: "destructive"
        });
      }
    },
    onError: () => {
      setValidationResult({
        valid: false,
        message: "Failed to validate coupon. Please try again."
      });
      toast({
        title: "Error",
        description: "Failed to validate coupon. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive"
      });
      return;
    }

    if (appliedCoupon) {
      toast({
        title: "Error",
        description: "Please remove the current coupon before applying a new one",
        variant: "destructive"
      });
      return;
    }

    validateCouponMutation.mutate({ code: couponCode });
  };

  const handleRemoveCoupon = () => {
    setValidationResult(null);
    setCouponCode("");
    if (onCouponRemoved) {
      onCouponRemoved();
    }
    toast({
      title: "Coupon Removed",
      description: "Coupon has been removed from your order"
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyCoupon();
    }
  };

  if (appliedCoupon) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-600" />
              <CardTitle className="text-sm font-medium">Coupon Applied</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveCoupon}
              className="text-green-700 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-sm font-bold text-green-700">
                {appliedCoupon.code}
              </div>
              <div className="text-xs text-green-600 line-clamp-2">
                {appliedCoupon.description}
              </div>
            </div>
            <Badge className="bg-green-600 text-white">
              -₹{appliedCoupon.discountAmount}
            </Badge>
          </div>
          
          <Separator className="bg-green-200" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-700">Savings</span>
            <span className="font-semibold text-green-700">
              ₹{appliedCoupon.discountAmount}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Ticket className="w-5 h-5 text-primary" />
          <CardTitle className="text-sm font-medium">Apply Coupon</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              className="uppercase"
              disabled={validateCouponMutation.isPending}
            />
          </div>
          <Button
            onClick={handleApplyCoupon}
            disabled={validateCouponMutation.isPending || !couponCode.trim()}
            size="sm"
          >
            {validateCouponMutation.isPending ? "Checking..." : "Apply"}
          </Button>
        </div>

        {validationResult && !validationResult.valid && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">
              {validationResult.message}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Percent className="w-3 h-3" />
            <span>Have a discount code? Apply it here to save on your order</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}