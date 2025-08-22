import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isPWAInstalled, getPWAAuthState } from "@/utils/pwaAuth";
import { serverRestartDetector } from "@/utils/devUpdateDetector";
import NotificationPermissionDialog from "@/components/NotificationPermissionDialog";
import type { MaintenanceNotice } from "@shared/schema";

export default function SplashScreen() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);

  // Fetch active maintenance notices
  const { data: activeMaintenanceNotice, isLoading: maintenanceLoading } = useQuery<MaintenanceNotice>({
    queryKey: ['/api/maintenance-notices/active'],
    staleTime: 1000 * 10, // Refresh every 10 seconds
    refetchInterval: 1000 * 10, // Poll for changes
    retry: false, // Don't retry if it fails
  });
  
  const checkNotificationPermission = () => {
    // Check if browser supports notifications
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return false;
    }
    
    // Check current permission status
    return Notification.permission === 'granted';
  };
  
  const handleNotificationDialogClose = () => {
    setShowNotificationDialog(false);
    // Continue with redirect after dialog is closed
    proceedWithRedirect();
  };

  const proceedWithRedirect = () => {
    const isPWALaunch = isPWAInstalled();
    const pwaAuthState = getPWAAuthState();
    
    if (isPWALaunch) {
      if (pwaAuthState.isAuthenticated && pwaAuthState.user) {
        const userData = pwaAuthState.user;
        if (userData.role === 'super_admin') {
          setLocation("/admin");
        } else if (userData.role === 'canteen_owner' || userData.role === 'canteen-owner') {
          setLocation("/canteen-owner-dashboard");
        } else {
          setLocation("/home");
        }
      } else {
        setLocation("/login");
      }
    } else {
      if (user) {
        if (user.role === 'super_admin') {
          setLocation("/admin");
        } else if (user.role === 'canteen_owner' || user.role === 'canteen-owner') {
          setLocation("/canteen-owner-dashboard");
        } else {
          setLocation("/home");
        }
      } else {
        setLocation("/login");
      }
    }
  };

  useEffect(() => {
    const isPWALaunch = isPWAInstalled();

    console.log("SplashScreen PWA Detection:", {
      isPWALaunch,
      currentUrl: window.location.href,
      displayMode: window.matchMedia('(display-mode: standalone)').matches,
      standalone: (window.navigator as any).standalone
    });

    const timer = setTimeout(() => {
      // If maintenance notice is loading, wait
      if (maintenanceLoading) {
        console.log('Waiting for maintenance notice check...');
        return;
      }

      // If there's an active maintenance notice, don't proceed with navigation
      if (activeMaintenanceNotice) {
        console.log('Active maintenance notice detected, staying on splash screen');
        return;
      }
      
      // Trigger server restart detection once after splash screen
      console.log('🚀 Splash screen complete - checking for server restart...');
      serverRestartDetector.startMonitoring();
      
      // Get comprehensive PWA authentication state
      const pwaAuthState = getPWAAuthState();
      
      console.log("SplashScreen Comprehensive Debug:", {
        user,
        isLoading,
        isPWALaunch,
        pwaAuthState
      });

      // Check notification permissions for authenticated users
      const shouldCheckNotifications = (isPWALaunch && pwaAuthState.isAuthenticated) || user;
      
      // For PWA launches, use the PWA authentication state directly
      if (isPWALaunch) {
        console.log("PWA launch detected - using PWA authentication state");
        
        if (pwaAuthState.isAuthenticated && pwaAuthState.user) {
          console.log("Valid PWA session found, checking notifications and redirecting");
          const userData = pwaAuthState.user;
          
          // Check notifications before redirecting
          if (!checkNotificationPermission()) {
            console.log("Notifications not enabled, showing dialog");
            setShowNotificationDialog(true);
            return; // Don't redirect yet
          }
          
          // Valid session for PWA - redirect to appropriate page
          if (userData.role === 'super_admin') {
            setLocation("/admin");
          } else if (userData.role === 'canteen_owner' || userData.role === 'canteen-owner') {
            setLocation("/canteen-owner-dashboard");
          } else {
            setLocation("/home");
          }
          return;
        } else {
          // No valid session for PWA - go to login
          console.log("No valid PWA session, redirecting to login");
          setLocation("/login");
          return;
        }
      }
      
      // Regular web app flow - check if user is already authenticated
      if (user) {
        console.log("User authenticated, checking notifications and redirecting based on role:", user.role);
        
        // Check notifications before redirecting
        if (!checkNotificationPermission()) {
          console.log("Notifications not enabled, showing dialog");
          setShowNotificationDialog(true);
          return; // Don't redirect yet
        }
        
        // Redirect based on user role
        if (user.role === 'super_admin') {
          setLocation("/admin");
        } else if (user.role === 'canteen_owner' || user.role === 'canteen-owner') {
          setLocation("/canteen-owner-dashboard");
        } else {
          setLocation("/home");
        }
      } else {
        console.log("No authenticated user, redirecting to login");
        // No authenticated user, go to login
        setLocation("/login");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [setLocation, user, isLoading, activeMaintenanceNotice, maintenanceLoading]);

  // If there's an active maintenance notice, display it full-screen
  if (activeMaintenanceNotice && !maintenanceLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <img
          src={`/api/maintenance-notices/${activeMaintenanceNotice.imageFileId}/file`}
          alt={activeMaintenanceNotice.title}
          className="max-w-full max-h-full object-contain"
          style={{ width: '100vw', height: '100vh', objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/20 to-primary-dark/20"></div>
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 right-8 w-24 h-24 bg-white/5 rounded-full animate-pulse delay-1000"></div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          {/* KIT Logo placeholder */}
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 shadow-lg">
            <span className="text-white text-3xl font-bold">KIT</span>
          </div>
          
          {/* App Title */}
          <h1 className="text-4xl font-bold text-white mb-4 tracking-wide">
            KIT-Canteen
          </h1>
          
          {/* Subtitle */}
          <p className="text-white/80 text-lg font-medium">
            Powered by KIT College
          </p>
          
          {/* Loading indicator */}
          <div className="mt-12 flex space-x-2">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>

      {/* Notification Permission Dialog */}
      <NotificationPermissionDialog
        isOpen={showNotificationDialog}
        onClose={handleNotificationDialogClose}
        userId={user?.id?.toString()}
        userRole={user?.role}
      />
    </>
  );
}