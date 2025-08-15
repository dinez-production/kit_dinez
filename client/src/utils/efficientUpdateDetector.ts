// Ultra-Efficient Update Detector - Zero background polling
import { toast } from 'sonner';

class EfficientUpdateDetector {
  private static instance: EfficientUpdateDetector;
  private hasCheckedOnLoad = false;

  static getInstance(): EfficientUpdateDetector {
    if (!EfficientUpdateDetector.instance) {
      EfficientUpdateDetector.instance = new EfficientUpdateDetector();
    }
    return EfficientUpdateDetector.instance;
  }

  /**
   * Initialize - ZERO automatic checking, only manual triggers
   */
  init(): void {
    console.log('🚀 Update detection ready - ZERO background polling');
    
    // NO automatic checking on load
    // NO background polling
    // Only check when explicitly triggered
    
    this.setupVisibilityListener();
  }

  /**
   * Setup listener for when user returns to app (but with long intervals)
   */
  private setupVisibilityListener(): void {
    let lastVisibilityCheck = 0;
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const now = Date.now();
        // Only check if it's been more than 5 MINUTES since last check
        if (now - lastVisibilityCheck > 300000) { // 5 minutes
          console.log('👀 User returned after long absence, checking for updates...');
          lastVisibilityCheck = now;
          this.checkOnce();
        }
      }
    });
  }

  /**
   * Check once for server restart
   */
  private async checkOnce(): Promise<void> {
    try {
      const response = await fetch('/api/server-info');
      if (!response.ok) return;

      const { startTime } = await response.json();
      const storedStartTime = localStorage.getItem('last_server_start');
      
      if (storedStartTime && parseInt(storedStartTime) < startTime) {
        console.log('🔄 Server restart detected!');
        this.showUpdateNotification();
      }
      
      // Store current start time
      localStorage.setItem('last_server_start', startTime.toString());
      
    } catch (error) {
      console.log('Could not check server status (server might be restarting)');
    }
  }

  /**
   * Show update notification
   */
  private showUpdateNotification(): void {
    toast.info('🔄 Server Updated!', {
      description: 'New changes are available. Refresh to see updates.',
      duration: 15000,
      action: {
        label: '🔄 Refresh Now',
        onClick: () => this.refreshApp()
      },
      cancel: {
        label: '⏰ Later',
        onClick: () => {
          toast.info('Will refresh automatically in 10 seconds...');
          setTimeout(() => this.refreshApp(), 10000);
        }
      }
    });
  }

  /**
   * Refresh the app
   */
  private async refreshApp(): Promise<void> {
    toast.loading('Refreshing app...', { duration: 2000 });
    
    try {
      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Force reload
      window.location.reload();
    } catch (error) {
      window.location.reload();
    }
  }

  /**
   * Manual check (for testing or manual trigger)
   */
  checkNow(): void {
    console.log('🔍 Manual update check triggered');
    this.checkOnce();
  }
}

// Export singleton
export const efficientUpdateDetector = EfficientUpdateDetector.getInstance();

// Auto-initialize
efficientUpdateDetector.init();