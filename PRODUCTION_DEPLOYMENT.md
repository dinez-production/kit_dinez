# Production Server Deployment Guide

## Problem
When deploying to a production server, the custom build script created in the Replit environment needs to be transferred and Firebase environment variables must be properly configured.

## Solution for Production Server

### Step 1: Create the Build Script on Production Server

Create `/var/www/kit_dinez/scripts/build.js` with this content:

```javascript
#!/usr/bin/env node

/**
 * Production Build script that ensures Firebase environment variables are available during Vite build
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Required Firebase environment variables
const requiredFirebaseVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID', 
  'VITE_FIREBASE_APP_ID'
];

console.log('🔥 Starting production build process...');

// Check if Firebase environment variables are available
console.log('🔍 Checking Firebase environment variables...');
const missingVars = [];

for (const varName of requiredFirebaseVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  } else {
    console.log(`✅ ${varName} is available`);
  }
}

if (missingVars.length > 0) {
  console.error('❌ Missing Firebase environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Make sure these variables are set in your environment');
  console.error('   You can set them in your .env file or export them:');
  missingVars.forEach(varName => {
    console.error(`   export ${varName}="your_value_here"`);
  });
  process.exit(1);
}

try {
  console.log('📦 Building frontend with Vite...');
  
  // Build the frontend
  execSync('vite build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  
  console.log('🖥️  Building backend with esbuild...');
  
  // Build the backend
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  
  console.log('✅ Build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
```

### Step 2: Set Environment Variables on Production Server

You need to set the Firebase environment variables. Choose one of these methods:

#### Option A: Export Environment Variables (Recommended)
```bash
# Add these to your ~/.bashrc or ~/.profile
export VITE_FIREBASE_API_KEY="your_firebase_api_key_here"
export VITE_FIREBASE_PROJECT_ID="your_firebase_project_id_here"
export VITE_FIREBASE_APP_ID="your_firebase_app_id_here"

# Reload your shell
source ~/.bashrc
```

#### Option B: Create .env File in Project Root
Create `/var/www/kit_dinez/.env` with:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id_here
VITE_FIREBASE_APP_ID=your_firebase_app_id_here
```

### Step 3: Make Build Script Executable
```bash
cd /var/www/kit_dinez
chmod +x scripts/build.js
```

### Step 4: Run the Production Build
```bash
cd /var/www/kit_dinez
node scripts/build.js
```

### Step 5: Start Production Server
```bash
npm run start
```

## Firebase Configuration Values

You'll need these specific values from your Firebase project:

- **VITE_FIREBASE_API_KEY**: Found in Firebase Console > Project Settings > General > Web API Key
- **VITE_FIREBASE_PROJECT_ID**: Your Firebase project ID (usually in the format: `kit-canteeen`)  
- **VITE_FIREBASE_APP_ID**: Found in Firebase Console > Project Settings > General > App ID

## Troubleshooting

### Build Script Not Found
- Make sure you're in the correct directory: `/var/www/kit_dinez`
- Verify the script exists: `ls -la scripts/build.js`
- Check permissions: `ls -la scripts/`

### Missing Environment Variables
- Check if variables are set: `env | grep VITE_FIREBASE`
- If using .env file, ensure it's in the project root
- Make sure variable names are exact (case-sensitive)

### Build Fails
- Ensure all dependencies are installed: `npm install`
- Check Node.js version compatibility: `node --version`
- Verify you have sufficient disk space and memory

### Firebase Errors in Browser
- Clear browser cache
- Check browser console for specific error messages
- Verify Firebase project settings in Firebase Console
- Ensure authorized domains include your production domain