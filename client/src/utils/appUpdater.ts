// App update notification system
import { toast } from 'sonner';

export class AppUpdater {
  private static hasShownUpdateToast = false;

  /**
   * Show update notification to user
   */
  static showUpdateNotification(): void {
    if (this.hasShownUpdateToast) return;
    
    this.hasShownUpdateToast = true;
    
    toast.success('App Updated!', {
      description: 'New features are now available. The app has been refreshed automatically.',
      duration: 5000,
      action: {
        label: 'Got it',
        onClick: () => toast.dismiss()
      }
    });
  }

  /**
   * Show cache clearing notification
   */
  static showCacheClearNotification(): void {
    toast.info('Cache Cleared', {
      description: 'App data has been refreshed for the latest features.',
      duration: 3000
    });
  }

  /**
   * Show service worker update notification
   */
  static showServiceWorkerUpdateNotification(): void {
    toast.info('Updating...', {
      description: 'Installing the latest version of the app.',
      duration: 3000
    });
  }
}

// Make global toast available for cache manager
if (typeof window !== 'undefined') {
  window.showToast = (message: string, type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast.info(message);
        break;
    }
  };
}