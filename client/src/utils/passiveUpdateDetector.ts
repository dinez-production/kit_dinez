// 100% Passive Update Detector - ZERO automatic calls
import { toast } from 'sonner';

class PassiveUpdateDetector {
  private static instance: PassiveUpdateDetector;

  static getInstance(): PassiveUpdateDetector {
    if (!PassiveUpdateDetector.instance) {
      PassiveUpdateDetector.instance = new PassiveUpdateDetector();
    }
    return PassiveUpdateDetector.instance;
  }

  /**
   * Initialize - does NOTHING automatically
   */
  init(): void {
    console.log('🛑 Passive update detector initialized - ZERO automatic calls');
    // Absolutely NO automatic checking
    // NO event listeners
    // NO polling
    // NO timers
    // NOTHING automatic
  }

  /**
   * Manual check only - called by user action (coordinated with DevUpdateDetector)
   */
  async manualCheck(): Promise<void> {
    console.log('🔍 Manual update check triggered by user');
    
    try {
      const response = await fetch('/api/server-info');
      if (!response.ok) return;

      const { startTime } = await response.json();
      // Use same localStorage key as DevUpdateDetector for coordination
      const storedStartTime = localStorage.getItem('last_server_start_time');
      
      if (storedStartTime && parseInt(storedStartTime) < startTime) {
        console.log('🔄 Server restart detected during manual check!');
        this.showUpdateNotification();
        // Update the stored time
        localStorage.setItem('last_server_start_time', startTime.toString());
      } else {
        // Check if user just updated very recently (within last 30 seconds)
        const timeDiff = Date.now() - parseInt(storedStartTime || '0');
        if (timeDiff < 30000) {
          toast.success('🎉 Just Updated!', {
            description: 'You recently updated. App is current.',
            duration: 3000
          });
        } else {
          toast.success('✅ No updates available', {
            description: 'Your app is up to date.',
            duration: 3000
          });
        }
        
        // Always update stored time for coordination
        localStorage.setItem('last_server_start_time', startTime.toString());
      }
      
    } catch (error) {
      toast.error('❌ Could not check for updates', {
        description: 'Server might be restarting. Try again later.',
        duration: 3000
      });
    }
  }

  /**
   * Show update notification (simpler since mandatory modal handles this now)
   */
  private showUpdateNotification(): void {
    toast.info('🔄 Server Updated!', {
      description: 'New changes detected. Refresh to see updates.',
      duration: 10000,
      action: {
        label: '🔄 Refresh Now',
        onClick: () => this.refreshApp()
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
}

// Export singleton
export const passiveUpdateDetector = PassiveUpdateDetector.getInstance();

// Initialize but do NOTHING automatically
passiveUpdateDetector.init();