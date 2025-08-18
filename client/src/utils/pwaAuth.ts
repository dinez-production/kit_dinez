// PWA Authentication Utilities
// Handles authentication persistence and detection for Progressive Web App installations

interface StoredUser {
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

export function isPWAInstalled(): boolean {
  // Multiple ways to detect PWA installation
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    localStorage.getItem('pwa_installed') === 'true' ||
    new URLSearchParams(window.location.search).get('pwa') === 'true'
  );
}

export function getPWAAuthState(): { isAuthenticated: boolean; user: StoredUser | null; debug: any } {
  const storedUser = localStorage.getItem('user');
  const sessionTimestamp = localStorage.getItem('session_timestamp');
  const lastActivity = localStorage.getItem('last_activity');
  
  const debug = {
    storedUser: !!storedUser,
    storedUserLength: storedUser?.length || 0,
    sessionTimestamp: !!sessionTimestamp,
    sessionTimestampValue: sessionTimestamp,
    lastActivity: !!lastActivity,
    lastActivityValue: lastActivity,
    isPWA: isPWAInstalled(),
    currentTime: Date.now(),
    localStorageKeys: Object.keys(localStorage)
  };

  console.log("PWA Auth State Debug:", debug);

  if (!storedUser || !sessionTimestamp) {
    return { isAuthenticated: false, user: null, debug };
  }

  try {
    const userData = JSON.parse(storedUser);
    const loginTime = parseInt(sessionTimestamp);
    const maxSessionDuration = 90 * 24 * 60 * 60 * 1000; // 90 days
    const currentTime = Date.now();
    
    const sessionDebug = {
      ...debug,
      parsedUser: userData,
      loginTime,
      currentTime,
      sessionAge: currentTime - loginTime,
      maxDuration: maxSessionDuration,
      isValidSession: currentTime - loginTime < maxSessionDuration
    };

    console.log("PWA Session Validation:", sessionDebug);

    if (currentTime - loginTime < maxSessionDuration) {
      // Update session timestamp to extend session
      localStorage.setItem('session_timestamp', currentTime.toString());
      localStorage.setItem('last_activity', currentTime.toString());
      
      return { 
        isAuthenticated: true, 
        user: userData, 
        debug: { ...sessionDebug, action: 'session_extended' }
      };
    } else {
      // Session expired
      localStorage.removeItem('user');
      localStorage.removeItem('session_timestamp');
      localStorage.removeItem('last_activity');
      
      return { 
        isAuthenticated: false, 
        user: null, 
        debug: { ...sessionDebug, action: 'session_expired' }
      };
    }
  } catch (error) {
    console.error("PWA Auth Error:", error);
    // Clear corrupted data
    localStorage.removeItem('user');
    localStorage.removeItem('session_timestamp');
    localStorage.removeItem('last_activity');
    
    return { 
      isAuthenticated: false, 
      user: null, 
      debug: { ...debug, error: (error as Error)?.message || 'Unknown error', action: 'data_corrupted' }
    };
  }
}

export function setPWAAuth(userData: StoredUser): void {
  const currentTime = Date.now();
  
  console.log("Setting PWA Auth:", userData);
  
  localStorage.setItem('user', JSON.stringify(userData));
  localStorage.setItem('session_timestamp', currentTime.toString());
  localStorage.setItem('last_activity', currentTime.toString());
  localStorage.setItem('pwa_installed', 'true');
  
  console.log("PWA Auth Set - localStorage updated:", {
    user: localStorage.getItem('user'),
    sessionTimestamp: localStorage.getItem('session_timestamp'),
    lastActivity: localStorage.getItem('last_activity')
  });
}

export function clearPWAAuth(): void {
  console.log("Clearing PWA Auth");
  
  localStorage.removeItem('user');
  localStorage.removeItem('session_timestamp');
  localStorage.removeItem('last_activity');
  localStorage.removeItem('pwa_installed');
}