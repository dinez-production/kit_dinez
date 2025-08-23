import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';

interface NotificationMaintenanceNoticeProps {
  className?: string;
}

export default function NotificationMaintenanceNotice({ 
  className = '' 
}: NotificationMaintenanceNoticeProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const { user } = useAuth();
  
  const {
    requestPermission,
    supportsNotifications,
    permission,
    isSubscribed,
    isLoading
  } = useWebPushNotifications(user?.id?.toString(), user?.role);

  // Check if we should show the notice
  const shouldShowNotice = () => {
    // Don't show if dismissed
    if (isDismissed) return false;
    
    // Don't show if user is not authenticated
    if (!user) return false;
    
    // Don't show if browser doesn't support notifications
    if (!supportsNotifications) return false;
    
    // Don't show if we're still loading
    if (isLoading) return false;
    
    // Show if permission is not granted or user is not subscribed
    return (permission !== 'granted' || !isSubscribed);
  };

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-notice-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Reset dismissed state when user changes or permission changes
  useEffect(() => {
    if (user && permission === 'granted' && isSubscribed) {
      setIsDismissed(true);
      localStorage.setItem('notification-notice-dismissed', 'true');
    }
  }, [user, permission, isSubscribed]);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    try {
      await requestPermission();
      // Give a moment for the notification permission to be processed
      setTimeout(() => {
        if (permission === 'granted') {
          setIsDismissed(true);
          localStorage.setItem('notification-notice-dismissed', 'true');
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('notification-notice-dismissed', 'true');
  };

  if (!shouldShowNotice()) {
    return null;
  }

  return (
    <div className={`w-full ${className}`} data-testid="notification-maintenance-notice">
      <Card className="mx-4 mt-4 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Stay Updated with Push Notifications
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Enable notifications to get real-time updates about your orders, new menu items, and important announcements.
                  </p>
                </div>
                
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 ml-4 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
                  data-testid="button-dismiss-notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleEnableNotifications}
                  disabled={isEnabling}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600"
                  data-testid="button-enable-notifications"
                >
                  {isEnabling ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Enable Notifications
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-800/50"
                  data-testid="button-remind-later"
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  Remind Me Later
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}