import { useState, useEffect, useCallback } from 'react';
import {
  webPushManager,
  initializeWebPushNotifications,
  requestNotificationPermission,
  unsubscribeFromNotifications,
  sendTestNotification,
  getNotificationPermissionStatus,
  isSubscribedToNotifications,
  isWebPushReady,
} from '@/utils/webPushNotifications';

interface UseWebPushNotificationsReturn {
  // State
  isInitialized: boolean;
  isSubscribed: boolean;
  subscriptionId: string | null;
  permission: NotificationPermission;
  isLoading: boolean;
  error: string | null;

  // Actions
  requestPermission: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendTestNotification: () => Promise<void>;

  // Computed states
  canSubscribe: boolean;
  canUnsubscribe: boolean;
  supportsNotifications: boolean;
}

export function useWebPushNotifications(
  userId?: string, 
  userRole?: string
): UseWebPushNotificationsReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if browser supports notifications
  const supportsNotifications = ('serviceWorker' in navigator) && ('PushManager' in window);

  // Update state from manager
  const updateState = useCallback(() => {
    setIsInitialized(isWebPushReady());
    setIsSubscribed(isSubscribedToNotifications());
    setSubscriptionId(webPushManager.getSubscriptionId());
    setPermission(getNotificationPermissionStatus());
  }, []);

  // Initialize Web Push when component mounts or user info changes
  useEffect(() => {
    if (!supportsNotifications) {
      setError('Push notifications are not supported by this browser');
      return;
    }

    if (!userId) {
      return; // Wait for user ID
    }

    const initializeNotifications = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const success = await initializeWebPushNotifications(userId, userRole);
        
        if (success) {
          updateState();
        } else {
          setError('Failed to initialize push notifications');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize push notifications');
        console.error('Push notification initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, [userId, userRole, supportsNotifications, updateState]);

  // Update user info when it changes
  useEffect(() => {
    if (userId && userRole && isInitialized) {
      webPushManager.updateUserInfo(userId, userRole);
    }
  }, [userId, userRole, isInitialized]);

  // Monitor permission changes and re-initialize if permission becomes granted
  useEffect(() => {
    if (!supportsNotifications || !userId) return;
    
    const checkPermissionChanges = () => {
      const currentPermission = getNotificationPermissionStatus();
      
      // If permission changed from denied/default to granted, re-initialize
      if (currentPermission === 'granted' && permission !== 'granted' && isInitialized && !isSubscribed) {
        console.log('🔄 Permission changed to granted, re-initializing...');
        updateState();
        
        // Try to auto-subscribe since permission is now granted
        const autoSubscribe = async () => {
          try {
            const success = await requestNotificationPermission();
            if (success) {
              updateState();
              console.log('🎉 Auto-subscribed after permission change!');
            }
          } catch (error) {
            console.warn('Failed to auto-subscribe after permission change:', error);
          }
        };
        
        autoSubscribe();
      } else if (currentPermission !== permission) {
        // Update state if permission changed
        updateState();
      }
    };

    // Check permission changes every few seconds when the page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkPermissionChanges();
      }
    }, 3000);

    // Also check when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPermissionChanges();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [supportsNotifications, userId, permission, isInitialized, isSubscribed, updateState]);

  // Request permission and subscribe
  const requestPermission = useCallback(async () => {
    if (!isInitialized) {
      setError('Push notifications not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await requestNotificationPermission();
      
      if (success) {
        updateState();
        console.log('🎉 Push notifications enabled successfully!');
      } else {
        // Check current permission status for more specific error
        const currentPermission = getNotificationPermissionStatus();
        if (currentPermission === 'denied') {
          setError('Notifications are blocked. Please enable them in your browser settings.');
        } else {
          setError('Failed to enable push notifications. Please try again.');
        }
        updateState(); // Update state even on failure to reflect permission changes
      }
    } catch (err: any) {
      console.error('Push notification permission error:', err);
      
      // Provide specific error messages based on permission state
      const currentPermission = getNotificationPermissionStatus();
      if (currentPermission === 'denied') {
        setError('Notifications are blocked. Please click the lock icon in your browser address bar to enable notifications.');
      } else if (err.message && err.message.includes('blocked')) {
        setError('Notifications are blocked. Please enable them in your browser settings and try again.');
      } else {
        setError(err.message || 'Failed to enable notifications. Please check your browser settings.');
      }
      
      updateState(); // Update state to reflect current permission
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, updateState]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await unsubscribeFromNotifications();
      
      if (success) {
        updateState();
      } else {
        setError('Failed to unsubscribe from push notifications');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unsubscribe from notifications');
      console.error('Push notification unsubscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [updateState]);

  // Send test notification
  const handleSendTestNotification = useCallback(async () => {
    if (!isSubscribed) {
      setError('Not subscribed to notifications');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await sendTestNotification();
      
      if (!success) {
        setError('Failed to send test notification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test notification');
      console.error('Test notification error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSubscribed]);

  // Computed states
  const canSubscribe = isInitialized && !isSubscribed && permission !== 'denied' && !isLoading;
  const canUnsubscribe = isInitialized && isSubscribed && !isLoading;

  return {
    // State
    isInitialized,
    isSubscribed,
    subscriptionId,
    permission,
    isLoading,
    error,

    // Actions
    requestPermission,
    unsubscribe,
    sendTestNotification: handleSendTestNotification,

    // Computed states
    canSubscribe,
    canUnsubscribe,
    supportsNotifications,
  };
}