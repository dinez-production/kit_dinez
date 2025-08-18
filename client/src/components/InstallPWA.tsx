import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect device type and browser
    const iosDetected = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const androidDetected = /Android/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    setIsIOS(iosDetected);
    setIsAndroid(androidDetected);
    setIsSafari(isSafari);
    
    const isInStandaloneMode = (window.navigator as any).standalone;
    
    // For iOS Safari, show install prompt if not in standalone mode  
    if (iosDetected && isSafari && !isInStandaloneMode) {
      const iosTimer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 2000);
      
      return () => clearTimeout(iosTimer);
    }
    
    // For iOS non-Safari browsers, show different guidance
    if (iosDetected && !isSafari && !isInStandaloneMode) {
      const iosTimer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 3000);
      
      return () => clearTimeout(iosTimer);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show install banner after a delay if no install prompt is available
    const timer = setTimeout(() => {
      if (!deferredPrompt && !isInstalled) {
        setShowInstallBanner(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [deferredPrompt, isInstalled]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA: User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      }
    } else {
      // Show manual installation instructions
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show banner if already installed or previously dismissed
  if (isInstalled || sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  if (showInstructions) {
    return (
      <div className="fixed top-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm mx-auto">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Install App</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          {isIOS ? (
            isSafari ? (
              <>
                <p className="font-medium">iPhone/iPad Installation (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tap the share button <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded">□↗</span> at the bottom</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Edit the name if desired, then tap "Add"</li>
                  <li>The app icon will appear on your home screen</li>
                </ol>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  ✅ Perfect! You're using Safari - installation will work great
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">iPhone/iPad Installation:</p>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-2">
                    ⚠️ To install on iPhone, you need to use Safari browser
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
                    <li>Copy this website's URL</li>
                    <li>Open Safari browser</li>
                    <li>Paste the URL and visit the site</li>
                    <li>Then tap share <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded">□↗</span> and "Add to Home Screen"</li>
                  </ol>
                </div>
              </>
            )
          ) : isAndroid ? (
            <>
              <p className="font-medium">Android Installation:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Tap the menu (⋮) in Chrome</li>
                <li>Look for "Install app" or "Add to Home screen"</li>
                <li>Tap "Install" when prompted</li>
                <li>The app will be installed like a native app</li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-medium">Desktop Installation:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Look for the install icon in your browser's address bar</li>
                <li>Click "Install" when prompted</li>
                <li>The app will open in its own window</li>
              </ol>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!showInstallBanner) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
            {isIOS ? <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" /> : <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {isIOS ? 'Add to Home Screen' : 'Install Dinez Canteen'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {isIOS ? 'Quick access from your home screen' : 'Get quick access to your canteen orders'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex space-x-2 mt-3">
        <Button
          onClick={handleInstallClick}
          size="sm"
          className="flex-1 h-8 text-xs"
          data-testid="button-install-pwa"
        >
          <Download className="h-3 w-3 mr-1" />
          Install
        </Button>
        <Button
          onClick={handleDismiss}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          Later
        </Button>
      </div>
    </div>
  );
}