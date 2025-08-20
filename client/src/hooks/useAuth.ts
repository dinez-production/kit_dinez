import { useState, useEffect } from 'react';
import { getPWAAuthState, setPWAAuth, clearPWAAuth, isPWAInstalled } from '@/utils/pwaAuth';
import { signOutFirebase } from '@/lib/firebase';
import { CacheManager } from '@/utils/cacheManager';

interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string;
  registerNumber?: string;
  department?: string;
  currentStudyYear?: string;
  isPassed?: boolean;
  staffId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Use PWA authentication utilities for consistent handling
    const loadUserFromStorage = async () => {
      const authState = getPWAAuthState();
      
      console.log("useAuth loadUserFromStorage - PWA State:", authState);
      
      if (authState.isAuthenticated && authState.user) {
        console.log("Valid PWA session found, validating against database:", authState.user);
        
        // Validate user still exists in database
        try {
          const response = await fetch(`/api/users/${authState.user.id}/validate`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.userExists) {
              console.log("✅ User validated against database:", data.user);
              setUser(data.user);
            } else {
              console.log("❌ User no longer exists in database, clearing session");
              clearPWAAuth();
              setUser(null);
            }
          } else {
            console.log("❌ User validation failed, clearing session");
            clearPWAAuth();
            setUser(null);
          }
        } catch (error) {
          console.warn("⚠️ Database validation failed, keeping localStorage session:", error);
          // In case of network error, keep the session but user will be re-validated on next API call
          setUser(authState.user);
        }
      } else {
        console.log("No valid PWA session, clearing user state");
        setUser(null);
      }
      setIsLoading(false);
    };

    // Cross-tab synchronization for mobile PWA - sync login/logout across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'session_timestamp') {
        console.log("Storage change detected for PWA:", e.key);
        loadUserFromStorage();
      }
    };

    // Initial load with database validation
    loadUserFromStorage();

    // Listen for storage changes to sync across tabs/windows
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (userData: User) => {
    console.log("useAuth login called with:", userData);
    setUser(userData);
    setPWAAuth(userData);
  };

  const logout = async () => {
    console.log("🚀 Complete logout initiated...");
    
    // Sign out from Firebase to clear cached Google accounts
    try {
      await signOutFirebase();
      console.log("✅ Firebase session cleared");
    } catch (error) {
      console.warn("⚠️ Firebase signOut failed:", error);
    }
    
    // Complete cache clearing for logout
    try {
      await CacheManager.clearLogoutCaches();
      console.log("✅ Complete logout cache clearing finished");
    } catch (error) {
      console.warn("⚠️ Cache clearing failed:", error);
    }
    
    // Clear local app session
    setUser(null);
    clearPWAAuth();
    
    // Force reload to ensure clean state
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  };

  // Update activity timestamp for mobile PWA users
  const updateActivity = () => {
    if (user) {
      const currentTime = Date.now();
      localStorage.setItem('last_activity', currentTime.toString());
      // Extend session if user is active
      localStorage.setItem('session_timestamp', currentTime.toString());
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  };

  const isSuperAdmin = () => {
    return user?.role === 'super_admin';
  };

  const isCanteenOwner = () => {
    return user?.role === 'canteen_owner';
  };

  const isStudent = () => {
    return user?.role === 'student';
  };

  const isStaff = () => {
    return user?.role === 'staff';
  };

  const hasRole = (role: string) => {
    return user?.role === role;
  };

  return {
    user,
    isLoading,
    login,
    logout,
    updateUser,
    updateActivity,
    isAdmin,
    isSuperAdmin,
    isCanteenOwner,
    isStudent,
    isStaff,
    hasRole,
    isAuthenticated: !!user
  };
}