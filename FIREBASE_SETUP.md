# Firebase Configuration Instructions

## Current Status
Firebase authentication is configured but requires domain authorization.

## Required Setup Steps

### 1. Firebase Console Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `kit-canteeen`
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Add the following domains:
   - `localhost` (for development)
   - Your Replit domain (e.g., `your-repl-name.replit.app`)
   - Any custom domains you plan to use

### 2. Current Environment Variables
The following Firebase credentials are already configured:
- ✅ VITE_FIREBASE_API_KEY
- ✅ VITE_FIREBASE_APP_ID  
- ✅ VITE_FIREBASE_PROJECT_ID

### 3. Error Messages Explained
- `auth/unauthorized-domain`: Current domain not in authorized domains list
- `auth/popup-blocked`: Browser blocked the Google sign-in popup
- `auth/popup-closed-by-user`: User closed the sign-in window

### 4. Testing Authentication
After adding domains to Firebase Console:
1. Try the "Continue with College Email" button
2. Complete Google sign-in flow
3. User will be redirected to home page with stored authentication data

## Fallback Options
If Firebase authentication continues to have issues:
1. Traditional email/password authentication
2. Guest access (already implemented with "Skip for now")
3. Direct admin/owner dashboard access (already available)