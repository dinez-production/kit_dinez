#!/usr/bin/env node

/**
 * Debug script to check environment variable availability
 */

console.log('Environment Variables Debug:');
console.log('==========================');

const firebaseVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID', 
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID'
];

firebaseVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? '✅ Set (length: ' + value.length + ')' : '❌ Missing'}`);
});

console.log('\nAll Environment Variables starting with VITE_:');
Object.keys(process.env)
  .filter(key => key.startsWith('VITE_'))
  .forEach(key => {
    const value = process.env[key];
    console.log(`${key}: ${value ? '✅ Set' : '❌ Missing'}`);
  });