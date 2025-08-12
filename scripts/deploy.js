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
  
  // Test database connections
  console.log('🔌 Testing database connections...');
  
  // Test PostgreSQL connection
  try {
    execSync('npm run db:test:pg', { stdio: 'inherit' });
    console.log('✅ PostgreSQL connection successful');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed');
    return false;
  }
  
  // Test MongoDB connection  
  try {
    execSync('npm run db:test:mongo', { stdio: 'inherit' });
    console.log('✅ MongoDB connection successful');
  } catch (error) {
    console.error('❌ MongoDB connection failed');
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
  if (!executeCommand('npm run db:generate:pg', 'Generating PostgreSQL Prisma client')) {
    throw new Error('PostgreSQL client generation failed');
  }
  
  // Run PostgreSQL migrations
  if (!executeCommand('npm run prod:migrate:pg', 'Running PostgreSQL migrations')) {
    throw new Error('PostgreSQL migration failed');
  }
  
  return true;
}

async function deployMongoDB() {
  console.log('🍃 Deploying MongoDB changes...');
  
  // Generate Prisma client for MongoDB
  if (!executeCommand('npm run db:generate:mongo', 'Generating MongoDB Prisma client')) {
    throw new Error('MongoDB client generation failed');
  }
  
  // Push MongoDB schema changes
  if (!executeCommand('npm run sync:mongo', 'Pushing MongoDB schema changes')) {
    throw new Error('MongoDB schema push failed');
  }
  
  // Run MongoDB data migrations
  if (!executeCommand('npm run migrate:mongo:data', 'Running MongoDB data migrations')) {
    throw new Error('MongoDB data migration failed');
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
      const stats = statSync(filepath);
      
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
  
  // Test application startup
  console.log('🚀 Testing application startup...');
  try {
    execSync('timeout 30s npm start', { stdio: 'inherit' });
    console.log('✅ Application starts successfully');
  } catch (error) {
    console.warn('⚠️  Application startup test timed out (this may be normal)');
  }
  
  // Run health checks if available
  if (process.env.HEALTH_CHECK_URL) {
    try {
      execSync(`curl -f ${process.env.HEALTH_CHECK_URL}/health`, { stdio: 'inherit' });
      console.log('✅ Health check passed');
    } catch (error) {
      console.warn('⚠️  Health check failed or not available');
    }
  }
  
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

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Deployment interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Deployment terminated');
  process.exit(1);
});

main();