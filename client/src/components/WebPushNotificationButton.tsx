import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';
import { Bell, BellOff, Loader2, TestTube, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function WebPushNotificationButton() {
  const { user } = useAuth();
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

  if (!supportsNotifications) {
    return (
      <Card className="mb-6 border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Push Notifications Not Supported</h3>
              <p className="text-sm text-muted-foreground">
                Your browser doesn't support push notifications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!isInitialized) return <Badge variant="secondary">Initializing...</Badge>;
    if (isSubscribed) return <Badge variant="default">Active</Badge>;
    if (permission === 'denied') return <Badge variant="destructive">Blocked</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  const getStatusText = () => {
    if (error) return error;
    if (!isInitialized) return 'Initializing Web Push notifications...';
    if (isSubscribed && subscriptionId) return `Active - Receiving notifications (ID: ${subscriptionId.slice(0, 8)}...)`;
    if (permission === 'denied') return 'Notifications blocked - Please enable in browser settings';
    if (permission === 'granted' && !isSubscribed) return 'Permission granted - Setting up notifications...';
    return 'Ready to enable notifications';
  };

  return (
    <Card className="mb-6 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
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

        <div className="flex flex-wrap gap-2">
          {canSubscribe && (
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              size="sm"
              data-testid="button-enable-notifications"
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
              data-testid="button-disable-notifications"
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
              data-testid="button-test-notification"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Send Test
            </Button>
          )}
        </div>

        {permission === 'denied' && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive mb-1">Notifications Blocked</p>
                <p className="text-destructive/80 mb-2">
                  To receive order updates, please enable notifications:
                </p>
                <ol className="text-destructive/80 text-xs space-y-1 ml-4">
                  <li>1. Click the lock icon 🔒 in your browser's address bar</li>
                  <li>2. Change notifications from "Block" to "Allow"</li>
                  <li>3. Refresh this page and try again</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              {error}
            </p>
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          Powered by Web Push API with VAPID keys
        </div>
      </CardContent>
    </Card>
  );
}