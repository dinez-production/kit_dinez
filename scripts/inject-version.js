#!/usr/bin/env node

/**
 * Script to inject version and build timestamp into files during build
 * This enables deployment-based cache invalidation
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Generate version hash based on current timestamp and random data
const generateVersion = () => {
  const timestamp = Date.now().toString();
  const random = randomBytes(8).toString('hex');
  return `v${timestamp}-${random}`;
};

const version = generateVersion();
const buildTimestamp = Date.now().toString();
const cacheVersion = `cache-${version}`;

console.log(`🔧 Injecting version: ${version}`);
console.log(`🕐 Build timestamp: ${buildTimestamp}`);

// Files to process with their respective placeholders
const filesToProcess = [
  {
    path: join(rootDir, 'client/src/utils/cacheManager.ts'),
    replacements: [
      { placeholder: '__APP_VERSION__', value: version },
      { placeholder: '__BUILD_TIMESTAMP__', value: buildTimestamp }
    ]
  },
  {
    path: join(rootDir, 'client/public/sw.js'),
    replacements: [
      { placeholder: '__CACHE_VERSION__', value: cacheVersion }
    ]
  }
];

// Process each file
filesToProcess.forEach(({ path: filePath, replacements }) => {
  try {
    if (!existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = readFileSync(filePath, 'utf8');
    
    // Apply all replacements
    replacements.forEach(({ placeholder, value }) => {
      const regex = new RegExp(placeholder, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        content = content.replace(regex, value);
        console.log(`✅ Replaced ${matches.length} instances of ${placeholder} with ${value} in ${filePath.split('/').pop()}`);
      } else {
        console.warn(`⚠️  No instances of ${placeholder} found in ${filePath.split('/').pop()}`);
      }
    });
    
    // Write the updated content back
    writeFileSync(filePath, content);
    console.log(`📝 Updated ${filePath.split('/').pop()}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

// Create version info file for reference
const versionInfo = {
  version,
  buildTimestamp,
  cacheVersion,
  buildDate: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development'
};

try {
  writeFileSync(join(rootDir, 'version.json'), JSON.stringify(versionInfo, null, 2));
  console.log('📋 Version info saved to version.json');
} catch (error) {
  console.error('❌ Error creating version.json:', error.message);
}

console.log('🎉 Version injection completed successfully!');