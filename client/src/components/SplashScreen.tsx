import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { isPWAInstalled, getPWAAuthState } from "@/utils/pwaAuth";
import { serverRestartDetector } from "@/utils/devUpdateDetector";

export default function SplashScreen() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const isPWALaunch = isPWAInstalled();

    console.log("SplashScreen PWA Detection:", {
      isPWALaunch,
      currentUrl: window.location.href,
      displayMode: window.matchMedia('(display-mode: standalone)').matches,
      standalone: (window.navigator as any).standalone
    });

    const timer = setTimeout(() => {
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
      
      // For PWA launches, use the PWA authentication state directly
      if (isPWALaunch) {
        console.log("PWA launch detected - using PWA authentication state");
        
        if (pwaAuthState.isAuthenticated && pwaAuthState.user) {
          console.log("Valid PWA session found, redirecting to role-based page");
          const userData = pwaAuthState.user;
          
          // Valid session for PWA - redirect to appropriate page
          if (userData.role === 'super_admin') {
            setLocation("/admin");
          } else if (userData.role === 'canteen_owner') {
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
        console.log("User authenticated, redirecting based on role:", user.role);
        // Redirect based on user role
        if (user.role === 'super_admin') {
          setLocation("/admin");
        } else if (user.role === 'canteen_owner') {
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
  }, [setLocation, user, isLoading]);

  return (
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
  );
}