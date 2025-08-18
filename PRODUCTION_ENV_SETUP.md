# Production Environment Setup (.env file approach)

## Quick Setup for Production Server

### Step 1: Create the Build Script

Create `/var/www/kit_dinez/scripts/build.js`:

```bash
mkdir -p /var/www/kit_dinez/scripts
cat > /var/www/kit_dinez/scripts/build.js << 'EOF'
#!/usr/bin/env node

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables from .env file
const envPath = join(rootDir, '.env');
if (existsSync(envPath)) {
  console.log('📋 Loading environment variables from .env file...');
  config({ path: envPath });
} else {
  console.log('⚠️  No .env file found, using system environment variables');
}

const requiredFirebaseVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID', 
  'VITE_FIREBASE_APP_ID'
];

console.log('🔥 Starting production build process...');
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
  console.error('\n💡 Add these variables to your .env file:');
  missingVars.forEach(varName => {
    console.error(`   ${varName}=your_${varName.toLowerCase().replace('vite_firebase_', '')}_here`);
  });
  console.error('\n📋 Example .env file content:');
  console.error('   VITE_FIREBASE_API_KEY=AIza...');
  console.error('   VITE_FIREBASE_PROJECT_ID=your-project-id');  
  console.error('   VITE_FIREBASE_APP_ID=1:123456...');
  process.exit(1);
}

try {
  console.log('📦 Building frontend with Vite...');
  execSync('npx vite build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('🖥️  Building backend with esbuild...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
EOF

chmod +x /var/www/kit_dinez/scripts/build.js
```

### Step 2: Create .env File with Firebase Configuration

Create `/var/www/kit_dinez/.env` and add your Firebase configuration:

```bash
cat > /var/www/kit_dinez/.env << 'EOF'
# Database Configuration
DATABASE_URL="your_postgresql_database_url_here"
MONGODB_URI="your_mongodb_connection_string_here"

# Firebase Configuration (Required for production builds)
VITE_FIREBASE_API_KEY=AIza...your_api_key_here
VITE_FIREBASE_PROJECT_ID=kit-canteeen
VITE_FIREBASE_APP_ID=1:123456...your_app_id_here

# Optional Firebase Configuration
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXX

# Session Configuration
SESSION_SECRET=your_session_secret_here

# Environment
NODE_ENV=production
EOF
```

**Important**: Replace the placeholder values with your actual Firebase configuration values from Firebase Console.

### Step 3: Build and Run

```bash
cd /var/www/kit_dinez

# Install dependencies (if not already done)
npm install

# Build using the custom script
node scripts/build.js

# Start the production server
npm run start
```

## Firebase Configuration Values

Get these values from Firebase Console > Project Settings > General:

1. **API Key**: Web API Key
2. **Project ID**: Your project identifier (e.g., `kit-canteeen`)
3. **App ID**: App ID from your web app configuration

## Benefits of .env File Approach

- ✅ Centralized configuration management
- ✅ No need to export environment variables manually
- ✅ Easy to update and maintain
- ✅ Works across different environments
- ✅ Secure (don't commit .env to git)

## Security Note

Never commit your `.env` file to version control. Add `.env` to your `.gitignore` file.