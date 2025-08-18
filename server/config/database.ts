import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { ConnectOptions } from 'mongoose';

export interface DatabaseConfig {
  mongodb: {
    uri: string;
    options: ConnectOptions;
  };
  postgresql: {
    url: string;
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  // MongoDB Configuration
  let mongoUri: string;
  
  // Environment detection logic
  if (process.env.NODE_ENV === 'production') {
    // Production environment - require MONGODB_URI
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI must be set in production environment');
    }
    mongoUri = process.env.MONGODB_URI;
  } else {
    // Development environment - flexible configuration
    mongoUri = process.env.MONGODB_URI || 
               process.env.MONGODB_ATLAS_URI || 
               process.env.MONGODB_LOCAL_URI || 
               'mongodb://localhost:27017/kit-canteen-dev';
  }

  // PostgreSQL Configuration
  let postgresUrl: string;
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL must be set in production environment');
    }
    // Default local PostgreSQL for development
    const localPassword = process.env.POSTGRES_LOCAL_PASSWORD || 'password';
    postgresUrl = `postgresql://postgres:${localPassword}@localhost:5432/kit_canteen_dev`;
  } else {
    postgresUrl = process.env.DATABASE_URL;
  }

  // MongoDB 3.6 compatible options
  const mongoOptions: ConnectOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4
  };

  // Add additional options for Atlas connections
  if (mongoUri.includes('mongodb+srv') || mongoUri.includes('mongodb.net')) {
    mongoOptions.retryWrites = true;
    mongoOptions.w = 'majority';
  }

  return {
    mongodb: {
      uri: mongoUri,
      options: mongoOptions
    },
    postgresql: {
      url: postgresUrl
    }
  };
}

export function getEnvironmentType(): 'local' | 'atlas' | 'custom' {
  const mongoUri = getDatabaseConfig().mongodb.uri;
  
  if (mongoUri.includes('mongodb.net') || mongoUri.includes('mongodb+srv')) {
    return 'atlas';
  }
  
  if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
    return 'local';
  }
  
  return 'custom';
}

export function validateDatabaseConfig(): void {
  const config = getDatabaseConfig();
  
  // Validate MongoDB URI format
  if (!config.mongodb.uri.startsWith('mongodb://') && !config.mongodb.uri.startsWith('mongodb+srv://')) {
    throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
  }
  
  // Validate PostgreSQL URI format
  if (!config.postgresql.url.startsWith('postgresql://') && !config.postgresql.url.startsWith('postgres://')) {
    throw new Error('Invalid PostgreSQL URI format. Must start with postgresql:// or postgres://');
  }
}