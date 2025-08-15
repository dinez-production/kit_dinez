#!/usr/bin/env node

// Simple version update script for deployments
const fs = require('fs');
const path = require('path');

// Generate new version info
const buildTime = Date.now();
const version = process.env.APP_VERSION || '1.0.0';
const environment = process.env.NODE_ENV || 'production';

// Update version.ts file
const versionFilePath = path.join(__dirname, '../client/src/utils/version.ts');
const versionContent = `// App version and build information (auto-generated)
export const APP_CONFIG = {
  version: '${version}',
  buildTime: ${buildTime},
  environment: '${environment}'
};

// Generate build hash for cache busting
export const getBuildHash = (): string => {
  return APP_CONFIG.buildTime.toString(36);
};

// Get full version string
export const getVersionString = (): string => {
  return \`v\${APP_CONFIG.version} (\${APP_CONFIG.environment})\`;
};

// Check if this is a production build
export const isProduction = (): boolean => {
  return APP_CONFIG.environment === 'production';
};

// Get cache-busting query parameter
export const getCacheBuster = (): string => {
  return \`?v=\${getBuildHash()}\`;
};`;

try {
  fs.writeFileSync(versionFilePath, versionContent);
  console.log(`✅ Version updated: ${version} (${new Date(buildTime).toISOString()})`);
  
  // Update service worker cache version
  const swFilePath = path.join(__dirname, '../client/public/sw.js');
  if (fs.existsSync(swFilePath)) {
    let swContent = fs.readFileSync(swFilePath, 'utf8');
    
    // Update cache version in service worker
    const newCacheVersion = `cache-v${buildTime}-${Math.random().toString(36).substr(2, 9)}`;
    swContent = swContent.replace(
      /const CACHE_VERSION = '[^']+';/,
      `const CACHE_VERSION = '${newCacheVersion}';`
    );
    
    // Update app version
    swContent = swContent.replace(
      /const APP_VERSION = '[^']+';/,
      `const APP_VERSION = '${version}';`
    );
    
    fs.writeFileSync(swFilePath, swContent);
    console.log(`✅ Service worker updated with cache version: ${newCacheVersion}`);
  }
  
} catch (error) {
  console.error('❌ Error updating version:', error);
  process.exit(1);
}