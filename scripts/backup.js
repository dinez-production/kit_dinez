#!/usr/bin/env node
/**
 * Database Backup Script
 * Creates timestamped backups of PostgreSQL and MongoDB databases
 * 
 * Usage:
 *   npm run backup:pg     - Backup PostgreSQL only
 *   npm run backup:mongo  - Backup MongoDB only
 *   npm run backup:all    - Backup both databases
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = process.env.BACKUP_PATH || './backups';

// Ensure backup directories exist
mkdirSync(join(backupDir, 'postgres'), { recursive: true });
mkdirSync(join(backupDir, 'mongodb'), { recursive: true });

async function backupPostgreSQL() {
  console.log('🐘 Starting PostgreSQL backup...');
  
  const {
    POSTGRES_HOST = 'localhost',
    POSTGRES_PORT = '5432',
    POSTGRES_USER = 'postgres',
    POSTGRES_PASSWORD = 'password123',
    POSTGRES_DB = 'kit_canteen'
  } = process.env;
  
  const filename = `postgres_${POSTGRES_DB}_${timestamp}.sql`;
  const filepath = join(backupDir, 'postgres', filename);
  
  try {
    const command = `PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB} --no-password > ${filepath}`;
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ PostgreSQL backup created: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ PostgreSQL backup failed:', error.message);
    throw error;
  }
}

async function backupMongoDB() {
  console.log('🍃 Starting MongoDB backup...');
  
  const {
    MONGO_HOST = 'localhost',
    MONGO_PORT = '27017',
    MONGO_ROOT_USER = 'admin',
    MONGO_ROOT_PASSWORD = 'password123',
    MONGO_DB = 'kit_canteen'
  } = process.env;
  
  const filename = `mongodb_${MONGO_DB}_${timestamp}`;
  const filepath = join(backupDir, 'mongodb', filename);
  
  try {
    const command = `mongodump --host ${MONGO_HOST}:${MONGO_PORT} --username ${MONGO_ROOT_USER} --password ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin --db ${MONGO_DB} --out ${filepath}`;
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ MongoDB backup created: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ MongoDB backup failed:', error.message);
    throw error;
  }
}

async function cleanupOldBackups() {
  const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  console.log(`🧹 Cleaning up backups older than ${retentionDays} days...`);
  
  try {
    const command = `find ${backupDir} -type f -mtime +${retentionDays} -delete`;
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Old backups cleaned up');
  } catch (error) {
    console.warn('⚠️  Failed to cleanup old backups:', error.message);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0] || 'all';

async function main() {
  console.log(`🚀 Starting backup process: ${command}`);
  console.log(`📅 Timestamp: ${timestamp}`);
  
  try {
    switch (command) {
      case 'postgres':
      case 'pg':
        await backupPostgreSQL();
        break;
        
      case 'mongodb':
      case 'mongo':
        await backupMongoDB();
        break;
        
      case 'all':
      default:
        await Promise.all([
          backupPostgreSQL(),
          backupMongoDB()
        ]);
        break;
    }
    
    await cleanupOldBackups();
    console.log('🎉 Backup process completed successfully!');
    
  } catch (error) {
    console.error('❌ Backup process failed:', error.message);
    process.exit(1);
  }
}

main();