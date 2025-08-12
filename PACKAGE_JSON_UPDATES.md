# Required Package.json Script Updates

Since I cannot directly edit package.json in this environment, here are the scripts you need to add to your `package.json` file:

## Scripts Section

Replace your current `scripts` section with:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    
    "db:generate": "npm run db:generate:pg && npm run db:generate:mongo",
    "db:generate:pg": "prisma generate --schema=prisma/postgres/schema.prisma",
    "db:generate:mongo": "prisma generate --schema=prisma/mongodb/schema.prisma",
    
    "dev:migrate:pg": "prisma migrate dev --schema=prisma/postgres/schema.prisma",
    "prod:migrate:pg": "prisma migrate deploy --schema=prisma/postgres/schema.prisma",
    "sync:mongo": "prisma db push --schema=prisma/mongodb/schema.prisma",
    
    "backup:pg": "node scripts/backup.js postgres",
    "backup:mongo": "node scripts/backup.js mongodb", 
    "backup:all": "node scripts/backup.js all",
    
    "migrate:mongo:data": "node scripts/run-mongo-migrations.js",
    
    "db:test:pg": "prisma db execute --schema=prisma/postgres/schema.prisma --stdin <<< 'SELECT 1;'",
    "db:test:mongo": "mongosh $MONGODB_URL --eval 'db.runCommand({ping: 1})'",
    
    "deploy:prod": "node scripts/deploy.js",
    "docker:dev": "docker compose up --build",
    "docker:down": "docker compose down -v",
    "docker:setup": "./scripts/setup-docker.sh"
  }
}
```

## Dependencies to Add

You'll also need these additional dependencies:

```bash
# Install MongoDB driver and additional tools
npm install mongodb
npm install --save-dev @types/pg
```

## Usage After Setup

1. **Local Development with Docker:**
   ```bash
   npm run docker:setup    # Initial setup
   npm run docker:dev      # Start containers and app
   ```

2. **Database Operations:**
   ```bash
   npm run db:generate     # Generate both Prisma clients
   npm run dev:migrate:pg  # Run PostgreSQL migrations
   npm run sync:mongo      # Sync MongoDB schema
   ```

3. **Production Deployment:**
   ```bash
   npm run deploy:prod     # Full production deployment
   ```

4. **Backups:**
   ```bash
   npm run backup:all      # Backup both databases
   ```

These scripts provide a complete dual-database development and deployment workflow.