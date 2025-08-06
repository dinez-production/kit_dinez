import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function PaymentCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'pending'>('checking');
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Get stored transaction ID and order ID
        const merchantTransactionId = localStorage.getItem('currentPaymentTxnId');
        const storedOrderId = localStorage.getItem('currentOrderId');
        
        if (!merchantTransactionId) {
          setStatus('failed');
          toast({
            title: "Payment Error",
            description: "No payment transaction found.",
            variant: "destructive"
          });
          return;
        }

        setOrderId(storedOrderId || '');

        // Check payment status
        const statusResponse = await apiRequest(`/api/payments/status/${merchantTransactionId}`);
        
        if (statusResponse.success) {
          const paymentStatus = statusResponse.status;
          
          if (paymentStatus === 'success') {
            setStatus('success');
            // Clear stored transaction data
            localStorage.removeItem('currentPaymentTxnId');
            localStorage.removeItem('currentOrderId');
            
            toast({
              title: "Payment Successful",
              description: "Your order has been confirmed!",
            });
            
            // Get the order to redirect to order status page
            if (statusResponse.data?.orderId) {
              const orderResponse = await apiRequest(`/api/orders/${statusResponse.data.orderId}`);
              if (orderResponse) {
                setTimeout(() => {
                  setLocation(`/order-status/${orderResponse.orderNumber}`);
                }, 2000);
              }
            }
          } else if (paymentStatus === 'failed') {
            setStatus('failed');
            localStorage.removeItem('currentPaymentTxnId');
            localStorage.removeItem('currentOrderId');
            
            toast({
              title: "Payment Failed",
              description: "Your payment could not be processed. Please try again.",
              variant: "destructive"
            });
          } else {
            setStatus('pending');
            // Keep checking for a bit more, but add timeout
            let retryCount = (window as any).paymentRetryCount || 0;
            if (retryCount < 10) { // Max 10 retries (30 seconds)
              (window as any).paymentRetryCount = retryCount + 1;
              setTimeout(checkPaymentStatus, 3000);
            } else {
              // After max retries, assume failure in test environment
              setStatus('failed');
              toast({
                title: "Payment Timeout",
                description: "Payment verification timed out. Please check your orders.",
                variant: "destructive"
              });
            }
          }
        } else {
          setStatus('failed');
          toast({
            title: "Payment Status Error",
            description: statusResponse.message || "Unable to check payment status.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Payment status check error:', error);
        setStatus('failed');
        toast({
          title: "Payment Error",
          description: "Failed to verify payment status. Please contact support.",
          variant: "destructive"
        });
      }
    };

    checkPaymentStatus();
  }, [setLocation]);

  const handleRetry = () => {
    // Clear any stored data and go back to cart
    localStorage.removeItem('currentPaymentTxnId');
    localStorage.removeItem('currentOrderId');
    setLocation('/cart');
  };

  const handleGoToOrders = () => {
    setLocation('/orders');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === 'checking' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold mb-2 text-green-700">Payment Successful!</h2>
              <p className="text-muted-foreground mb-4">
                Your order has been confirmed. You will be redirected to the order status page.
              </p>
              <button
                onClick={handleGoToOrders}
                className="text-primary hover:underline"
              >
                View My Orders
              </button>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2 text-red-700">Payment Failed</h2>
              <p className="text-muted-foreground mb-4">
                Unfortunately, your payment could not be processed. Please try again.
              </p>
              <button
                onClick={handleRetry}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90"
              >
                Try Again
              </button>
            </>
          )}

          {status === 'pending' && (
            <>
              <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-xl font-semibold mb-2 text-yellow-700">Payment Pending</h2>
              <p className="text-muted-foreground mb-4">
                Your payment is being processed. This may take a few moments.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleRetry}
                  className="border border-primary text-primary px-4 py-2 rounded-md hover:bg-primary/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGoToOrders}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                >
                  Check Orders
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}