#!/usr/bin/env node

/**
 * MongoDB Configuration Check Script
 * 
 * This script verifies MongoDB 3.6+ configuration and provides
 * environment-specific setup guidance.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 MongoDB 3.6+ Configuration Check\n');

// Check for environment file
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found');
  if (fs.existsSync(envExamplePath)) {
    console.log('💡 Copy .env.example to .env and configure your settings:');
    console.log('   cp .env.example .env\n');
  }
} else {
  console.log('✅ .env file found');
}

// Load environment variables
dotenv.config();

// Check MongoDB configuration
console.log('📊 MongoDB Configuration Status:');

const mongoUri = process.env.MONGODB_URI || 
                 process.env.MONGODB_ATLAS_URI || 
                 process.env.MONGODB_LOCAL_URI;

if (!mongoUri) {
  console.log('❌ No MongoDB URI configured');
  console.log('💡 Set one of the following environment variables:');
  console.log('   - MONGODB_URI (primary)');
  console.log('   - MONGODB_ATLAS_URI (Atlas-specific)');
  console.log('   - MONGODB_LOCAL_URI (local development)');
  console.log('\n📋 Example configurations:');
  console.log('   Local:  MONGODB_URI=mongodb://localhost:27017/kit-canteen');
  console.log('   Atlas:  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kit-canteen');
  console.log('   Custom: MONGODB_URI=mongodb://user:pass@host:port/database\n');
} else {
  console.log('✅ MongoDB URI configured');
  
  // Determine connection type
  let connectionType = 'custom';
  if (mongoUri.includes('mongodb.net') || mongoUri.includes('mongodb+srv')) {
    connectionType = 'atlas';
  } else if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
    connectionType = 'local';
  }
  
  console.log(`   Type: ${connectionType}`);
  console.log(`   URI:  ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
}

// Check PostgreSQL configuration
console.log('\n📊 PostgreSQL Configuration Status:');

if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL not configured');
  console.log('💡 This is required for user authentication');
} else {
  console.log('✅ PostgreSQL DATABASE_URL configured');
}

// Check application configuration
console.log('\n📊 Application Configuration:');

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'PHONEPE_MERCHANT_ID',
  'SESSION_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('⚠️  Missing environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
} else {
  console.log('✅ All required environment variables configured');
}

// Configuration recommendations
console.log('\n💡 Configuration Recommendations:');

if (process.env.NODE_ENV === 'production') {
  console.log('🏭 Production Environment Detected');
  console.log('   - Ensure MongoDB Atlas connection string is secure');
  console.log('   - Verify IP whitelist is properly configured');
  console.log('   - Use strong authentication credentials');
} else {
  console.log('🔧 Development Environment');
  console.log('   - Local MongoDB: Start service with `sudo systemctl start mongod` (Linux)');
  console.log('   - Atlas MongoDB: Add 0.0.0.0/0 to IP whitelist for development');
  console.log('   - Consider using local MongoDB for faster development');
}

console.log('\n📖 Documentation:');
console.log('   - MongoDB Setup Guide: ./MONGODB_36_SETUP_GUIDE.md');
console.log('   - Environment Template: ./.env.example');
console.log('   - Health Check: http://localhost:5000/api/health (when running)');

console.log('\n🚀 To start the application:');
console.log('   npm run dev');

console.log('\n✨ Configuration check complete!');