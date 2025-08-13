// Deployment detection hook for cache invalidation
import { useEffect } from 'react';
import { CacheManager } from './cacheManager';
import { AppUpdater } from './appUpdater';
import { queryClient } from '@/lib/queryClient';

export function useDeploymentDetection() {
  useEffect(() => {
    const checkForDeploymentUpdate = async () => {
      try {
        // Make queryClient globally available for cache clearing
        window.queryClient = queryClient;
        
        // Check for new deployment
        const updateDetected = await CacheManager.checkForUpdate();
        
        if (updateDetected) {
          // Show user-friendly notification
          console.log('📱 App updated! New features are now available.');
          AppUpdater.showUpdateNotification();
        }

        // Also check for service worker updates
        const swUpdateAvailable = await CacheManager.checkServiceWorkerUpdate();
        if (swUpdateAvailable) {
          console.log('🔄 Service Worker update available');
          AppUpdater.showServiceWorkerUpdateNotification();
          await CacheManager.activateWaitingServiceWorker();
        }
        
      } catch (error) {
        console.error('Error checking for deployment updates:', error);
      }
    };

    // Check immediately on app load
    checkForDeploymentUpdate();

    // Check periodically for updates while app is running
    const interval = setInterval(checkForDeploymentUpdate, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);
}

// Global toast function declaration
declare global {
  interface Window {
    showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  }
}