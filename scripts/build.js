#!/usr/bin/env node

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables from .env.production
dotenv.config({ path: join(rootDir, '.env.production') });

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
  console.error('\n💡 Make sure these variables are set in your .env.production file');
  process.exit(1);
}

try {
  console.log('📦 Building frontend with Vite...');
  
  execSync('npx vite build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  
  console.log('🖥️  Building backend with esbuild...');
  
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  
  console.log('✅ Build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
