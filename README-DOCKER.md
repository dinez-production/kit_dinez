# Docker Development Setup Guide

This project uses a dual database architecture with PostgreSQL and MongoDB running in Docker containers for local development.

## Quick Start

1. **Setup the environment:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Update .env with your configuration
   nano .env
   ```

2. **Start development with Docker:**
   ```bash
   # Setup and start everything
   ./scripts/setup-docker.sh
   
   # Or manually:
   docker compose up -d
   npm run db:generate
   npm run dev:migrate:pg
   npm run sync:mongo
   npm run dev
   ```

## Architecture Overview

### Database Setup
- **PostgreSQL**: Handles user authentication, posts, and relational data
- **MongoDB**: Handles business data (orders, menu items, categories, payments)
- **Prisma ORM**: Two separate schemas for each database

### File Structure
```
├── docker-compose.yml          # Container orchestration
├── prisma/
│   ├── postgres/
│   │   └── schema.prisma       # PostgreSQL models
│   └── mongodb/
│       └── schema.prisma       # MongoDB models
├── migrations/
│   ├── postgres/               # Auto-generated SQL migrations
│   └── mongodb/                # Custom JS migration scripts
├── scripts/
│   ├── backup.js               # Database backup utility
│   ├── deploy.js               # Production deployment
│   └── setup-docker.sh         # Development setup
└── server/
    └── db-clients.ts           # Database client configuration
```

## Available Scripts

### Database Operations
```bash
# Generate Prisma clients
npm run db:generate           # Both databases
npm run db:generate:pg        # PostgreSQL only
npm run db:generate:mongo     # MongoDB only

# Schema migrations
npm run dev:migrate:pg        # PostgreSQL dev migration
npm run prod:migrate:pg       # PostgreSQL production migration  
npm run sync:mongo            # MongoDB schema sync

# Data migrations
npm run migrate:mongo:data    # Run MongoDB data migrations
```

### Backup & Restore
```bash
npm run backup:pg             # Backup PostgreSQL
npm run backup:mongo          # Backup MongoDB
npm run backup:all            # Backup both databases
```

### Testing
```bash
npm run db:test:pg            # Test PostgreSQL connection
npm run db:test:mongo         # Test MongoDB connection
```

### Docker Management
```bash
npm run docker:dev            # Start development containers
npm run docker:down           # Stop and remove containers
```

## Environment Variables

### Required Variables
```env
# PostgreSQL
DATABASE_URL=postgresql://postgres:password123@localhost:5432/kit_canteen

# MongoDB  
MONGODB_URL=mongodb://admin:password123@localhost:27017/kit_canteen?authSource=admin

# Application
NODE_ENV=development
PORT=5000
```

### Container Configuration
```env
# PostgreSQL Container
POSTGRES_DB=kit_canteen
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password123
POSTGRES_PORT=5432

# MongoDB Container
MONGO_DB=kit_canteen
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=password123
MONGO_PORT=27017
```

## Production Deployment

### Pre-deployment Checklist
- [ ] Update production environment variables
- [ ] Test database connections
- [ ] Create database backups
- [ ] Review migration scripts

### Deploy to Production
```bash
# Automated production deployment
npm run deploy:prod
```

This script will:
1. Create pre-deployment backups
2. Run PostgreSQL migrations
3. Push MongoDB schema changes
4. Execute data migration scripts
5. Perform post-deployment validation

### Manual Deployment Steps
```bash
# 1. Backup existing data
npm run backup:all

# 2. Deploy PostgreSQL changes
npm run prod:migrate:pg

# 3. Deploy MongoDB changes
npm run sync:mongo
npm run migrate:mongo:data

# 4. Test deployment
npm run db:test:pg
npm run db:test:mongo
```

## Data Migration Examples

### MongoDB Migration Script Template
```javascript
// migrations/mongodb/002_add_new_field.js
import { MongoClient } from 'mongodb';

const MONGODB_URL = process.env.MONGODB_URL;
const BATCH_SIZE = 1000;

async function runMigration() {
  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  
  const db = client.db();
  const collection = db.collection('your_collection');
  
  // Check if migration already ran
  const alreadyMigrated = await collection.findOne({ newField: { $exists: true } });
  if (alreadyMigrated) {
    console.log('✅ Migration already completed');
    return;
  }
  
  // Process in batches
  const cursor = collection.find({ newField: { $exists: false } });
  const batch = [];
  
  for await (const doc of cursor) {
    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { newField: 'default_value' } }
      }
    });
    
    if (batch.length === BATCH_SIZE) {
      await collection.bulkWrite(batch);
      batch.length = 0;
    }
  }
  
  if (batch.length > 0) {
    await collection.bulkWrite(batch);
  }
  
  await client.close();
}

runMigration();
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check container status
   docker compose ps
   
   # Check logs
   docker compose logs postgres
   docker compose logs mongodb
   ```

2. **Prisma Client Errors**
   ```bash
   # Regenerate clients
   npm run db:generate
   ```

3. **Migration Failures**
   ```bash
   # Reset PostgreSQL schema (development only)
   npx prisma migrate reset --schema=prisma/postgres/schema.prisma
   
   # Force push MongoDB schema
   npm run sync:mongo -- --force-reset
   ```

### Health Checks

The containers include health checks that verify:
- PostgreSQL accepts connections
- MongoDB responds to ping commands

Wait for both services to be healthy before running migrations:
```bash
docker compose ps
# Should show "healthy" status for both databases
```

## Security Notes

### Development
- Default passwords are used for local development
- Containers are bound to localhost only
- Data is persisted in Docker volumes

### Production
- Use strong, unique passwords
- Enable SSL/TLS connections
- Restrict network access
- Regular security updates
- Automated backups with retention policy

### Environment Variables
- Never commit .env files
- Use secrets management in production
- Rotate credentials regularly
- Audit access logs

## Performance Optimization

### PostgreSQL
- Connection pooling enabled
- Query logging in development
- Optimized indexes for user queries

### MongoDB  
- Connection pooling configured
- Bulk operations for migrations
- Indexed fields for performance

### Docker
- Multi-stage builds for production
- Volume mounts for development
- Health checks for reliability