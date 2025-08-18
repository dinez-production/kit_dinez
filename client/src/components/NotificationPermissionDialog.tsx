import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, AlertCircle, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';

interface NotificationPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userRole?: string;
}

export default function NotificationPermissionDialog({
  isOpen,
  onClose,
  userId,
  userRole
}: NotificationPermissionDialogProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  
  const {
    requestPermission,
    supportsNotifications,
    permission
  } = useWebPushNotifications(userId, userRole);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    try {
      await requestPermission();
      // Give a moment for the notification permission to be processed
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!supportsNotifications) {
    return null; // Don't show dialog if notifications aren't supported
  }

  // Don't show if already granted permission
  if (permission === 'granted') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Bell className="w-10 h-10 text-white" />
          </div>
          <div>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Stay in the Loop!
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Get real-time updates about your orders so you never miss a beat
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              We'll notify you instantly when:
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Order Confirmed</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your food is being prepared</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Ready for Pickup</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your order is ready to collect</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Payment Updates</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Confirmation and receipt details</p>
              </div>
            </div>
          </div>

          {permission === 'denied' && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-200 mb-2">Notifications Currently Blocked</p>
                <p className="text-red-700 dark:text-red-300 mb-3">
                  To enable notifications and stay updated:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                    <span className="w-5 h-5 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-xs">Click the lock icon 🔒 in your browser's address bar</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                    <span className="w-5 h-5 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-xs">Change notifications from "Block" to "Allow"</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                    <span className="w-5 h-5 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-xs">Click the refresh button:</span>
                    <button
                      onClick={() => window.location.reload()}
                      className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh Now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col space-y-3 pt-6">
          {permission !== 'denied' && (
            <Button
              onClick={handleEnableNotifications}
              disabled={isEnabling}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
              size="lg"
              data-testid="button-enable-notifications"
            >
              {isEnabling ? (
                <>
                  <div className="w-4 h-4 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enabling Notifications...
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5 mr-3" />
                  Enable Notifications
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleSkip}
            className="w-full border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            data-testid="button-skip-notifications"
          >
            <BellOff className="w-4 h-4 mr-2" />
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}