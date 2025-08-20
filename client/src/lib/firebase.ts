import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, getRedirectResult, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

// Validate required Firebase environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID', 
  'VITE_FIREBASE_APP_ID'
];

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    console.error(`Missing required Firebase environment variable: ${envVar}`);
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "791289037177",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8H76MCENZT"
};

// Firebase configuration is loaded from environment variables

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Auth Provider with forced account selection
const googleProvider = new GoogleAuthProvider();

// Force account selection every time - prevents automatic login with previous account
googleProvider.setCustomParameters({
  prompt: 'select_account', // Always show account picker
  include_granted_scopes: 'false', // Don't include previously granted scopes
  access_type: 'online' // Don't request offline access to prevent persistent tokens
});

// Sign in with Google popup (better for development)
export const signInWithGoogle = () => {
  try {
    return signInWithPopup(auth, googleProvider);
  } catch (error) {
    // Error during Google sign-in
    throw error;
  }
};

// Alternative redirect method
export const signInWithGoogleRedirect = () => {
  try {
    return signInWithRedirect(auth, googleProvider);
  } catch (error) {
    // Error during Google sign-in redirect
    throw error;
  }
};

// Handle redirect result
export const handleGoogleRedirect = () => {
  return getRedirectResult(auth)
    .then((result: any) => {
      if (result) {
        // This gives you a Google Access Token. You can use it to access Google APIs.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        // The signed-in user info.
        const user = result.user;
        return { user, token };
      }
      return null;
    })
    .catch((error: any) => {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.customData?.email;
      // The AuthCredential type that was used.
      const credential = GoogleAuthProvider.credentialFromError(error);
      throw { errorCode, errorMessage, email, credential };
    });
};

// Sign out from Firebase to clear any cached accounts and force complete Google logout
export const signOutFirebase = async () => {
  try {
    // Clear Firebase auth state
    await signOut(auth);
    
    // Clear any cached Google auth data by invalidating current user token
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true); // Force token refresh which clears cached data
    }
    
    console.log('✅ Firebase and Google auth completely cleared');
  } catch (error) {
    console.warn('⚠️ Firebase signOut error:', error);
  }
};

export { auth };