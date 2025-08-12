#!/usr/bin/env node
/**
 * PostgreSQL Initialization Script
 * Creates the users table if it doesn't exist for the dual database setup
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

function executeCommand(command, description) {
  console.log(`🚀 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function initializePostgreSQL() {
  console.log('🐘 Initializing PostgreSQL schema for dual database setup...');
  
  // Check if prisma/postgres/schema.prisma exists
  try {
    execSync('ls prisma/postgres/schema.prisma', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ PostgreSQL schema file not found at prisma/postgres/schema.prisma');
    console.log('📋 Please ensure the dual database setup is complete');
    process.exit(1);
  }
  
  // Generate PostgreSQL Prisma client
  if (!executeCommand('npx prisma generate --schema=prisma/postgres/schema.prisma', 'Generating PostgreSQL Prisma client')) {
    process.exit(1);
  }
  
  // Create initial migration
  console.log('📋 Creating initial PostgreSQL migration...');
  if (!executeCommand('npx prisma migrate dev --name init --schema=prisma/postgres/schema.prisma', 'Creating initial migration')) {
    process.exit(1);
  }
  
  console.log('🎉 PostgreSQL initialization completed successfully!');
  console.log('📊 The users table and related tables are now ready');
}

initializePostgreSQL().catch(error => {
  console.error('❌ PostgreSQL initialization failed:', error);
  process.exit(1);
});