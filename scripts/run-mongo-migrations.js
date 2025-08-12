#!/usr/bin/env node
/**
 * MongoDB Data Migration Runner
 * Runs all migration scripts in migrations/mongodb/ directory in order
 * 
 * Usage: npm run migrate:mongo:data
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const migrationsDir = './migrations/mongodb';

async function runMigrations() {
  console.log('🚀 Starting MongoDB data migrations...');
  
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Run in alphabetical order
    
    if (files.length === 0) {
      console.log('ℹ️  No migration scripts found');
      return;
    }
    
    console.log(`📄 Found ${files.length} migration scripts`);
    
    for (const file of files) {
      const filepath = join(migrationsDir, file);
      console.log(`🔄 Running migration: ${file}`);
      
      try {
        execSync(`node ${filepath}`, { stdio: 'inherit' });
        console.log(`✅ Migration ${file} completed`);
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }
    
    console.log('🎉 All MongoDB data migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  }
}

runMigrations();