#!/usr/bin/env node

/**
 * Production Startup Script
 * Optimized startup process for production environment
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting application in production mode...');

// Verify build exists
const distPath = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Build not found. Run "node scripts/build.js" first.');
  process.exit(1);
}

// Set production environment
process.env.NODE_ENV = 'production';
process.env.VITE_NODE_ENV = 'production';

// Start the server with optimizations
const server = spawn('node', ['dist/server/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    // Production optimizations
    UV_THREADPOOL_SIZE: '8', // Increase thread pool for better I/O performance
    NODE_OPTIONS: '--max-old-space-size=1024', // Limit memory usage
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔄 Server exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});
