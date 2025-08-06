import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCart } from "@/contexts/CartContext";

export default function PaymentCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'pending'>('checking');
  const [orderId, setOrderId] = useState<string>('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const { clearCart } = useCart();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Get stored transaction ID and pending order number
        const merchantTransactionId = localStorage.getItem('currentPaymentTxnId');
        const pendingOrderNumber = localStorage.getItem('currentOrderNumber');
        
        if (!merchantTransactionId) {
          setStatus('failed');
          toast({
            title: "Payment Error",
            description: "No payment transaction found.",
            variant: "destructive"
          });
          return;
        }

        setOrderId(pendingOrderNumber || '');

        // Inform user that their order is already visible and background monitoring is active
        toast({
          title: "Order Created with Pending Payment",
          description: `Order ${pendingOrderNumber} is now visible in your orders page while we verify payment.`,
        });

        // Check payment status with background monitoring
        const statusResponse = await apiRequest(`/api/payments/status/${merchantTransactionId}`);
        
        if (statusResponse.success) {
          const paymentStatus = statusResponse.status;
          
          if (paymentStatus === 'success') {
            setStatus('success');
            setPaymentData(statusResponse.data);
            
            // Clear cart if payment successful
            if (statusResponse.data?.shouldClearCart) {
              clearCart();
              toast({
                title: "Payment Successful",
                description: "Your order has been confirmed and cart has been cleared!",
              });
            }
            
            // Clear stored transaction data
            localStorage.removeItem('currentPaymentTxnId');
            localStorage.removeItem('pendingOrderData');
            localStorage.removeItem('currentOrderNumber');
            
            // Get the order to redirect to order status page
            if (statusResponse.data?.orderNumber) {
              setTimeout(() => {
                setLocation(`/order-status/${statusResponse.data.orderNumber}`);
              }, 2000);
            }
          } else if (paymentStatus === 'failed' || paymentStatus === 'timeout') {
            setStatus('failed');
            setPaymentData(statusResponse.data);
            
            // Clear transaction ID but keep pending order data for retry
            localStorage.removeItem('currentPaymentTxnId');
            
            toast({
              title: "Payment Failed",
              description: "Your payment could not be processed. Please try again.",
              variant: "destructive"
            });
          } else if (paymentStatus === 'pending') {
            setStatus('pending');
            setPaymentData(statusResponse.data);
            
            // Keep checking for a bit more, but add timeout
            let retryCount = (window as any).paymentRetryCount || 0;
            if (retryCount < 15) { // Max 15 retries (45 seconds)
              (window as any).paymentRetryCount = retryCount + 1;
              setTimeout(checkPaymentStatus, 3000);
            } else {
              // After max retries, show timeout but keep order in pending state
              setStatus('pending');
              
              toast({
                title: "Payment Still Processing",
                description: "Payment is taking longer than expected. Check your orders later.",
                variant: "default"
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
    // Clear payment transaction data but keep pending order data
    localStorage.removeItem('currentPaymentTxnId');
    
    // Check if we have pending order data to retry
    const pendingOrderData = localStorage.getItem('pendingOrderData');
    if (pendingOrderData) {
      // Go back to checkout to retry payment
      setLocation('/checkout');
    } else {
      // No pending data, go to cart
      setLocation('/cart');
    }
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
              <p className="text-muted-foreground mb-2">
                Unfortunately, your payment could not be processed.
              </p>
              {paymentData?.responseMessage && (
                <p className="text-sm text-muted-foreground mb-4 p-2 bg-red-50 rounded">
                  Reason: {paymentData.responseMessage}
                </p>
              )}
              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 w-full"
                >
                  Retry Payment
                </button>
                <button
                  onClick={() => setLocation('/cart')}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50 w-full"
                >
                  Back to Cart
                </button>
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-500 animate-pulse" />
              <h2 className="text-xl font-semibold mb-2 text-yellow-700">Payment Processing</h2>
              <p className="text-muted-foreground mb-2">
                Your payment is being processed. This may take a few moments.
              </p>
              <p className="text-sm text-yellow-600 mb-4 p-2 bg-yellow-50 rounded">
                Please don't close this page. Your order will be created once payment is confirmed.
              </p>
              {paymentData && (
                <div className="text-xs text-muted-foreground mb-4">
                  Transaction ID: {paymentData.merchantTransactionId}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setLocation('/orders')}
                  className="border border-primary text-primary px-4 py-2 rounded-md hover:bg-primary/10"
                >
                  Check My Orders
                </button>
                <button
                  onClick={() => {
                    // Don't clear transaction data, let user manually exit
                    setLocation('/home');
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                >
                  Continue Shopping
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}