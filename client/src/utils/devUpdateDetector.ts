// Smart Update Detector - efficient server restart detection
import { toast } from 'sonner';

export class DevUpdateDetector {
  private static instance: DevUpdateDetector;
  private serverStartTime: number | null = null;
  private lastKnownStartTime: number | null = null;
  private isChecking = false;

  static getInstance(): DevUpdateDetector {
    if (!DevUpdateDetector.instance) {
      DevUpdateDetector.instance = new DevUpdateDetector();
    }
    return DevUpdateDetector.instance;
  }

  /**
   * Start monitoring - check once after splash screen
   */
  startMonitoring(): void {
    console.log('🧠 Starting server restart detection (one-time check)...');
    
    // Get stored server start time from localStorage
    this.lastKnownStartTime = this.getStoredStartTime();
    console.log('📁 Last known server start time:', this.lastKnownStartTime ? new Date(this.lastKnownStartTime) : 'None stored');
    
    // Check once on app load
    this.checkForServerRestart();
    
    // Listen for visibility changes (when user comes back to app)
    this.setupVisibilityListener();
  }



  /**
   * Get stored server start time from localStorage
   */
  private getStoredStartTime(): number | null {
    const stored = localStorage.getItem('last_server_start_time');
    return stored ? parseInt(stored) : null;
  }

  /**
   * Store server start time in localStorage
   */
  private storeStartTime(startTime: number): void {
    localStorage.setItem('last_server_start_time', startTime.toString());
  }


  /**
   * Setup visibility listener - check when user returns to app
   */
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👀 User returned to app, checking for server restart...');
        this.checkForServerRestart();
      }
    });
    
    // Also check when page gains focus
    window.addEventListener('focus', () => {
      console.log('🎯 Window gained focus, checking for server restart...');
      this.checkForServerRestart();
    });
  }

  /**
   * Get server start time from a simple endpoint
   */
  private async getServerStartTime(): Promise<number> {
    try {
      const response = await fetch('/api/server-info');
      if (response.ok) {
        const data = await response.json();
        return data.startTime || Date.now();
      }
    } catch (error) {
      console.log('Could not get server start time, using current time');
    }
    return Date.now();
  }

  /**
   * Check for server restart - compare timestamps
   */
  private async checkForServerRestart(): Promise<void> {
    if (this.isChecking) return;
    
    this.isChecking = true;
    
    try {
      const currentStartTime = await this.getServerStartTime();
      console.log('🔍 Checking server start time:', new Date(currentStartTime));
      
      // If we have a stored time and current time is newer, server restarted
      if (this.lastKnownStartTime && currentStartTime > this.lastKnownStartTime) {
        console.log('🚨 SERVER RESTART DETECTED!');
        console.log('📅 Previous start time:', new Date(this.lastKnownStartTime));
        console.log('📅 Current start time:', new Date(currentStartTime));
        console.log('⏰ Time difference:', Math.round((currentStartTime - this.lastKnownStartTime) / 1000), 'seconds');
        
        this.handleServerRestart();
      } else if (!this.lastKnownStartTime) {
        console.log('📝 First time check - storing server start time');
      } else {
        console.log('✅ No server restart detected (same start time)');
      }
      
      // Always update the known start time
      this.lastKnownStartTime = currentStartTime;
      this.storeStartTime(currentStartTime);
      
    } catch (error) {
      console.error('❌ Error checking server status:', error);
      console.log('Server might be restarting or unreachable...');
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Handle server restart - show full-screen mandatory update overlay
   */
  private handleServerRestart(): void {
    // Create full-screen mandatory update overlay
    this.showMandatoryUpdateModal();
    
    // Also log it prominently for developers
    console.log('🚀 SERVER RESTART DETECTED - Showing mandatory update overlay');
  }

  /**
   * Show mandatory full-screen update modal
   */
  private showMandatoryUpdateModal(): void {
    // Remove any existing modal
    this.removeMandatoryUpdateModal();
    
    // Create full-screen overlay
    const overlay = document.createElement('div');
    overlay.id = 'mandatory-update-overlay';
    overlay.innerHTML = `
      <div class="mandatory-update-overlay">
        <div class="mandatory-update-content">
          <div class="update-icon">🚀</div>
          <h1 class="update-title">App Updated!</h1>
          <p class="update-description">New features and improvements are available. Please refresh to continue using the app.</p>
          <div class="update-buttons">
            <button type="button" id="refresh-now-btn" class="refresh-btn" tabindex="0">
              🔄 Refresh Now
            </button>
          </div>
          <p class="update-note">You must refresh to continue</p>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .mandatory-update-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .mandatory-update-content {
        background: white;
        border-radius: 16px;
        padding: 32px;
        text-align: center;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .update-icon {
        font-size: 48px;
        margin-bottom: 16px;
        animation: bounce 2s infinite;
      }
      
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-10px);
        }
        60% {
          transform: translateY(-5px);
        }
      }
      
      .update-title {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0 0 12px 0;
      }
      
      .update-description {
        font-size: 16px;
        color: #666;
        line-height: 1.5;
        margin: 0 0 24px 0;
      }
      
      .update-buttons {
        margin-bottom: 16px;
      }
      
      .refresh-btn {
        background: #E23744;
        color: white;
        border: none;
        padding: 16px 32px;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: all 0.2s ease;
        min-height: 56px;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        pointer-events: auto !important;
        position: relative;
        z-index: 100000;
        outline: 2px solid transparent;
        display: block;
      }
      
      .refresh-btn:hover {
        background: #c12e3a;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(226, 55, 68, 0.3);
      }
      
      .refresh-btn:active {
        transform: translateY(0);
      }
      
      .update-note {
        font-size: 14px;
        color: #999;
        margin: 0;
        font-style: italic;
      }
      
      @media (max-width: 480px) {
        .mandatory-update-content {
          padding: 24px;
          border-radius: 12px;
        }
        
        .update-icon {
          font-size: 40px;
        }
        
        .update-title {
          font-size: 20px;
        }
        
        .update-description {
          font-size: 15px;
        }
        
        .refresh-btn {
          font-size: 16px;
          padding: 14px 24px;
          min-height: 50px;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    

    
    // Attach event handlers to button
    setTimeout(() => {
      const refreshBtn = document.getElementById('refresh-now-btn');
      if (refreshBtn) {
        const handleRefresh = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Visual feedback
          refreshBtn.style.background = '#c12e3a';
          refreshBtn.style.transform = 'scale(0.95)';
          refreshBtn.textContent = '🔄 Refreshing...';
          
          this.refreshApp();
        };
        
        // Add multiple event handlers for compatibility
        refreshBtn.addEventListener('click', handleRefresh, { capture: true });
        refreshBtn.addEventListener('touchstart', handleRefresh, { capture: true });
        refreshBtn.onclick = handleRefresh;
        
        // Hover effects
        refreshBtn.addEventListener('mouseenter', () => {
          refreshBtn.style.background = '#c12e3a';
        });
        
        refreshBtn.addEventListener('mouseleave', () => {
          refreshBtn.style.background = '#E23744';
        });
        
        // Ensure button is accessible
        refreshBtn.setAttribute('tabindex', '0');
        refreshBtn.style.pointerEvents = 'auto';
        refreshBtn.style.cursor = 'pointer';
      }
    }, 200);
    
    // Prevent scrolling and interaction with background
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Remove mandatory update modal
   */
  private removeMandatoryUpdateModal(): void {
    const existing = document.getElementById('mandatory-update-overlay');
    if (existing) {
      existing.remove();
    }
    document.body.style.overflow = '';
  }
  
  /**
   * Refresh the app with full-screen loading
   */
  private async refreshApp(): Promise<void> {
    console.log('🚀 refreshApp method called - starting app refresh process...');
    // Update the modal to show loading state
    const overlay = document.getElementById('mandatory-update-overlay');
    if (overlay) {
      overlay.innerHTML = `
        <div class="mandatory-update-overlay">
          <div class="mandatory-update-content">
            <div class="update-icon loading">🔄</div>
            <h1 class="update-title">Updating App...</h1>
            <p class="update-description">Please wait while we load the latest features</p>
            <div class="loading-bar">
              <div class="loading-progress"></div>
            </div>
          </div>
        </div>
      `;
      
      // Add loading animation styles
      const loadingStyle = document.createElement('style');
      loadingStyle.textContent = `
        .loading {
          animation: spin 2s linear infinite !important;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .loading-bar {
          width: 100%;
          height: 6px;
          background: #f0f0f0;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 20px;
        }
        
        .loading-progress {
          width: 100%;
          height: 100%;
          background: #E23744;
          border-radius: 3px;
          animation: progress 2s ease-in-out;
        }
        
        @keyframes progress {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `;
      document.head.appendChild(loadingStyle);
    }
    
    try {
      console.log('🧹 Clearing caches before refresh...');
      
      // Clear service worker cache
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
        console.log('✅ Service worker cache cleared');
      }

      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('✅ Browser cache cleared');
      }

      // Wait for loading animation to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store current server start time before refresh so manual checks know we're updated
      const currentStartTime = await this.getServerStartTime();
      this.storeStartTime(currentStartTime);
      console.log('✅ Stored updated server start time before refresh:', new Date(currentStartTime));
      
      console.log('🔄 Reloading page with fresh content...');
      // Force reload
      window.location.reload();
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      // Fallback to simple reload
      setTimeout(() => window.location.reload(), 1000);
    }
  }
}

// Export detector instance for manual triggering
export const serverRestartDetector = DevUpdateDetector.getInstance();

