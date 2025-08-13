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
      const startTime = Date.now();
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

        // Check payment status with timeout for production
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
          const statusResponse = await apiRequest(`/api/payments/status/${merchantTransactionId}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          const responseTime = Date.now() - startTime;
          console.log(`💳 Payment status check completed in ${responseTime}ms`);
          
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
              
              // Get the order to redirect to order status page with proper fallback
              const orderNumber = statusResponse.data?.orderNumber || statusResponse.data?.orderId || storedOrderId;
              console.log('💳 Payment success - Order data:', statusResponse.data);
              console.log('💳 Extracted order number:', orderNumber);
              console.log('💳 Stored order ID:', storedOrderId);
              
              if (orderNumber) {
                console.log(`💳 Redirecting to order status page: /order-status/${orderNumber}`);
                setTimeout(() => {
                  setLocation(`/order-status/${orderNumber}?from=payment`);
                }, 2000);
              } else {
                console.log('💳 No order number found, redirecting to orders page');
                // Fallback to orders page if no order number available
                setTimeout(() => {
                  setLocation('/orders');
                }, 2000);
              }
            } else if (paymentStatus === 'failed') {
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
        } catch (timeoutError) {
          clearTimeout(timeoutId);
          console.error('Payment status check timeout:', timeoutError);
          setStatus('failed');
          toast({
            title: "Payment Timeout",
            description: "Payment verification timed out. Please check your orders later.",
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
  }, [setLocation, clearCart]);

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
                Your order has been confirmed.
              </p>
              {paymentData?.orderNumber && (
                <p className="text-sm text-muted-foreground">
                  Order Number: {paymentData.orderNumber}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting to order status...
              </p>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2 text-red-700">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't process your payment. Please try again.
              </p>
              <div className="space-y-2">
                <button 
                  onClick={handleRetry}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => setLocation('/cart')}
                  className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors"
                >
                  Back to Cart
                </button>
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-xl font-semibold mb-2 text-yellow-700">Payment Processing</h2>
              <p className="text-muted-foreground mb-6">
                Your payment is still being processed. This may take a few minutes.
              </p>
              <div className="space-y-2">
                <button 
                  onClick={handleGoToOrders}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  Check Orders
                </button>
                <button 
                  onClick={() => setLocation('/')}
                  className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}