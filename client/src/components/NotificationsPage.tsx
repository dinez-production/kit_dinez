import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, Smartphone, Mail, Clock, BellOff, Loader2, TestTube, AlertCircle, Settings, Info } from "lucide-react";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { showLocalTestNotification } from "@/utils/webPushNotifications";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    emailNotifications: true,
    smsNotifications: false,
    soundEnabled: true,
    vibration: true
  });

  // Web Push Notifications hook
  const {
    isInitialized,
    isSubscribed,
    subscriptionId,
    permission,
    isLoading,
    error,
    requestPermission,
    unsubscribe,
    sendTestNotification,
    canSubscribe,
    canUnsubscribe,
    supportsNotifications,
  } = useWebPushNotifications(user?.id?.toString(), user?.role);

  const updateNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle local test notification for Android troubleshooting
  const handleLocalTestNotification = async () => {
    try {
      const success = await showLocalTestNotification();
      if (success) {
        toast({
          title: "Local Test Sent",
          description: "Check if the notification appears as a banner on your Android device.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error?.message || "Failed to show local test notification",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (!isInitialized) return <Badge variant="secondary">Initializing...</Badge>;
    if (isSubscribed) return <Badge variant="default">Active</Badge>;
    if (permission === 'denied') return <Badge variant="destructive">Blocked</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  const getStatusText = () => {
    if (error) return `Error: ${error}`;
    if (!isInitialized) return 'Initializing Web Push notifications...';
    if (isSubscribed && subscriptionId) return `Subscribed (ID: ${subscriptionId.slice(0, 8)}...)`;
    if (permission === 'denied') return 'Notifications blocked by device settings';
    return 'Not subscribed to notifications';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-4 pt-12 pb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Notifications</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Order Notifications */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Order Updates</h3>
                <p className="text-sm text-muted-foreground">Get notified about your order status</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order Status Updates</p>
                  <p className="text-sm text-muted-foreground">When your order is being prepared, ready, etc.</p>
                </div>
                <Switch 
                  checked={notifications.orderUpdates}
                  onCheckedChange={() => updateNotification('orderUpdates')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promotional Notifications */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">Promotions & Offers</h3>
                <p className="text-sm text-muted-foreground">Special deals and discounts</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Special Offers</p>
                  <p className="text-sm text-muted-foreground">Get notified about new deals and discounts</p>
                </div>
                <Switch 
                  checked={notifications.promotions}
                  onCheckedChange={() => updateNotification('promotions')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Web Push Notifications */}
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  {isSubscribed ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Push Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    {getStatusText()}
                  </p>
                </div>
              </div>
              {getStatusBadge()}
            </div>

            {!supportsNotifications ? (
              <div className="flex items-center space-x-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-semibold text-destructive">Not Supported</p>
                  <p className="text-sm text-destructive/80">
                    Your browser doesn't support push notifications
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {canSubscribe && (
                    <Button
                      onClick={requestPermission}
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4 mr-2" />
                      )}
                      Enable Notifications
                    </Button>
                  )}

                  {canUnsubscribe && (
                    <Button
                      onClick={unsubscribe}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <BellOff className="w-4 h-4 mr-2" />
                      )}
                      Disable Notifications
                    </Button>
                  )}

                  {isSubscribed && subscriptionId && (
                    <Button
                      onClick={sendTestNotification}
                      variant="ghost"
                      size="sm"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Send Test
                    </Button>
                  )}
                </div>

                {permission === 'denied' && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                    <p className="text-sm text-destructive">
                      Notifications are blocked. Please enable them in your device settings or browser.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                    <p className="text-sm text-destructive">
                      {error}
                    </p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Powered by Web Push API with VAPID keys
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Other Delivery Methods */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Other Delivery Methods</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.emailNotifications}
                  onCheckedChange={() => updateNotification('emailNotifications')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Get text messages for important updates</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.smsNotifications}
                  onCheckedChange={() => updateNotification('smsNotifications')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">App Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sound</p>
                  <p className="text-sm text-muted-foreground">Play sound for notifications</p>
                </div>
                <Switch 
                  checked={notifications.soundEnabled}
                  onCheckedChange={() => updateNotification('soundEnabled')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Vibration</p>
                  <p className="text-sm text-muted-foreground">Vibrate for notifications</p>
                </div>
                <Switch 
                  checked={notifications.vibration}
                  onCheckedChange={() => updateNotification('vibration')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Test Notification Section with Android Support */}
        {isSubscribed && (
          <Card className="shadow-card">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Test Notifications</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Test different types of notifications to ensure they work properly on your device
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={sendTestNotification} 
                  disabled={isLoading || !isSubscribed}
                  variant="outline" 
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Send Server Push Test
                </Button>
                
                <Button 
                  onClick={handleLocalTestNotification} 
                  disabled={permission !== 'granted'}
                  variant="outline" 
                  className="w-full"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Android Banner Test
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Troubleshooting Section */}
        {isSubscribed && /android/i.test(navigator.userAgent) && (
          <Card className="shadow-card border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                    Android Notification Tips
                  </h3>
                  <div className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
                    <p>
                      If notifications only appear in your notification tray (not as banners):
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Check if "Do Not Disturb" mode is enabled</li>
                      <li>Verify notification importance is set to "High" for this app</li>
                      <li>Ensure "Show as banner" is enabled in notification settings</li>
                      <li>Try the "Android Banner Test" button above</li>
                    </ul>
                    <div className="mt-3 pt-2 border-t border-orange-200 dark:border-orange-700">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-orange-800 border-orange-300 hover:bg-orange-100 dark:text-orange-200 dark:border-orange-600 dark:hover:bg-orange-800"
                        onClick={() => {
                          // Open Android notification settings if possible
                          toast({
                            title: "Notification Settings",
                            description: "Go to Android Settings > Apps > [Your Browser] > Notifications to adjust banner settings.",
                          });
                        }}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        View Settings Guide
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}