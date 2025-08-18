import { useState, useEffect } from 'react';
import { getPWAAuthState, setPWAAuth, clearPWAAuth, isPWAInstalled } from '@/utils/pwaAuth';

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
    const loadUserFromStorage = () => {
      const authState = getPWAAuthState();
      
      console.log("useAuth loadUserFromStorage - PWA State:", authState);
      
      if (authState.isAuthenticated && authState.user) {
        console.log("Valid PWA session found, setting user:", authState.user);
        setUser(authState.user);
      } else {
        console.log("No valid PWA session, clearing user state");
        setUser(null);
      }
    };

    // Cross-tab synchronization for mobile PWA - sync login/logout across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'session_timestamp') {
        console.log("Storage change detected for PWA:", e.key);
        loadUserFromStorage();
      }
    };

    // Initial load
    loadUserFromStorage();
    setIsLoading(false);

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

  const logout = () => {
    console.log("useAuth logout called");
    setUser(null);
    clearPWAAuth();
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