import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount with session persistence
    const storedUser = localStorage.getItem('user');
    const sessionTimestamp = localStorage.getItem('session_timestamp');
    
    if (storedUser && sessionTimestamp) {
      try {
        const userData = JSON.parse(storedUser);
        const loginTime = parseInt(sessionTimestamp);
        
        // Session persists until manual logout (30 days max for security)
        const maxSessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
        const currentTime = Date.now();
        
        if (currentTime - loginTime < maxSessionDuration) {
          setUser(userData);
          // Update session timestamp to extend session
          localStorage.setItem('session_timestamp', currentTime.toString());
        } else {
          // Session expired, clear stored data
          localStorage.removeItem('user');
          localStorage.removeItem('session_timestamp');
        }
      } catch (error) {
        // Error parsing stored user data - clear invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('session_timestamp');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    const currentTime = Date.now();
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('session_timestamp', currentTime.toString());
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('session_timestamp');
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
    isAdmin,
    isSuperAdmin,
    isCanteenOwner,
    isStudent,
    isStaff,
    hasRole,
    isAuthenticated: !!user
  };
}