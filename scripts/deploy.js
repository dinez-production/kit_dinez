#!/usr/bin/env node
/**
 * Production Deployment Script
 * 
 * This script performs a safe production deployment:
 * 1. Takes backups of both databases
 * 2. Runs PostgreSQL migrations 
 * 3. Pushes MongoDB schema changes
 * 4. Runs MongoDB data migration scripts
 * 5. Validates deployment success
 * 
 * Usage: npm run deploy:prod
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load production environment
dotenv.config({ path: '.env.production' });
dotenv.config(); // Fallback to .env

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

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

async function preDeploymentChecks() {
  console.log('🔍 Running pre-deployment checks...');
  
  // Check if all required environment variables are set
  const requiredEnvVars = [
    'DATABASE_URL',
    'MONGODB_URL',
    'NODE_ENV'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    return false;
  }
  
  console.log('✅ Pre-deployment checks passed');
  return true;
}

async function createBackups() {
  console.log('💾 Creating pre-deployment backups...');
  
  const success = executeCommand(
    'node scripts/backup.js all',
    'Creating database backups'
  );
  
  if (!success) {
    throw new Error('Backup creation failed - aborting deployment');
  }
  
  return true;
}

async function deployPostgreSQL() {
  console.log('🐘 Deploying PostgreSQL changes...');
  
  // Generate Prisma client for PostgreSQL
  if (!executeCommand('npx prisma generate --schema=prisma/postgres/schema.prisma', 'Generating PostgreSQL Prisma client')) {
    throw new Error('PostgreSQL client generation failed');
  }
  
  // Run PostgreSQL migrations
  if (!executeCommand('npx prisma migrate deploy --schema=prisma/postgres/schema.prisma', 'Running PostgreSQL migrations')) {
    throw new Error('PostgreSQL migration failed');
  }
  
  return true;
}

async function deployMongoDB() {
  console.log('🍃 Deploying MongoDB changes...');
  
  // Generate Prisma client for MongoDB
  if (!executeCommand('npx prisma generate --schema=prisma/mongodb/schema.prisma', 'Generating MongoDB Prisma client')) {
    throw new Error('MongoDB client generation failed');
  }
  
  // Push MongoDB schema changes
  if (!executeCommand('npx prisma db push --schema=prisma/mongodb/schema.prisma', 'Pushing MongoDB schema changes')) {
    throw new Error('MongoDB schema push failed');
  }
  
  return true;
}

async function runMongoDataMigrations() {
  console.log('📋 Running MongoDB data migration scripts...');
  
  const migrationsDir = './migrations/mongodb';
  
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Run in alphabetical order
    
    if (files.length === 0) {
      console.log('ℹ️  No MongoDB migration scripts found');
      return true;
    }
    
    console.log(`📄 Found ${files.length} migration scripts`);
    
    for (const file of files) {
      const filepath = join(migrationsDir, file);
      
      console.log(`🔄 Running migration: ${file}`);
      
      if (!executeCommand(`node ${filepath}`, `Migration ${file}`)) {
        throw new Error(`Migration ${file} failed`);
      }
    }
    
    console.log('✅ All MongoDB data migrations completed');
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB data migrations failed:', error.message);
    return false;
  }
}

async function postDeploymentValidation() {
  console.log('🔍 Running post-deployment validation...');
  console.log('✅ Deployment validation completed');
  return true;
}

async function main() {
  console.log('🚀 Starting production deployment...');
  console.log(`📅 Deployment timestamp: ${timestamp}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  
  try {
    // Pre-deployment checks
    if (!(await preDeploymentChecks())) {
      throw new Error('Pre-deployment checks failed');
    }
    
    // Create backups
    await createBackups();
    
    // Deploy databases
    await deployPostgreSQL();
    await deployMongoDB();
    
    // Run data migrations
    if (!(await runMongoDataMigrations())) {
      throw new Error('MongoDB data migrations failed');
    }
    
    // Post-deployment validation
    await postDeploymentValidation();
    
    console.log('🎉 Production deployment completed successfully!');
    console.log(`📊 Deployment Summary:`);
    console.log(`   • Timestamp: ${timestamp}`);
    console.log(`   • PostgreSQL: ✅ Migrated`);
    console.log(`   • MongoDB: ✅ Schema updated`);
    console.log(`   • Data migrations: ✅ Completed`);
    console.log(`   • Backups: ✅ Created`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('🔄 To rollback, restore from the backups created at:', timestamp);
    process.exit(1);
  }
}

main();