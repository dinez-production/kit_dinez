/**
 * Database Client Configuration
 * Sets up separate Prisma clients for PostgreSQL and MongoDB
 */

import { PrismaClient as PostgreSQLClient } from '@prisma/client-postgres';
import { PrismaClient as MongoDBClient } from '@prisma/client-mongodb';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Client - for user authentication and relational data
export const pgClient = new PostgreSQLClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// MongoDB Client - for business data (orders, menu, etc.)
export const mongoClient = new MongoDBClient({
  datasources: {
    db: {
      url: process.env.MONGODB_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Connection test functions
export async function testPostgreSQLConnection() {
  try {
    await pgClient.$connect();
    console.log('✅ PostgreSQL connection successful');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

export async function testMongoDBConnection() {
  try {
    await mongoClient.$connect();
    console.log('✅ MongoDB connection successful');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await pgClient.$disconnect();
  await mongoClient.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pgClient.$disconnect();
  await mongoClient.$disconnect();
  process.exit(0);
});