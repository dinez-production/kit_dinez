#!/bin/bash
# Docker Development Setup Script
# Sets up local development environment with PostgreSQL and MongoDB

set -e

echo "🐳 Setting up Docker development environment..."

# Create necessary directories
mkdir -p backups/postgres backups/mongodb
mkdir -p prisma/postgres prisma/mongodb 
mkdir -p migrations/mongodb

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration"
fi

# Generate Prisma clients
echo "🔧 Generating Prisma clients..."
npx prisma generate --schema=prisma/postgres/schema.prisma
npx prisma generate --schema=prisma/mongodb/schema.prisma

# Start Docker containers
echo "🚀 Starting Docker containers..."
docker compose up -d postgres mongodb

# Wait for databases to be ready
echo "⏳ Waiting for databases to start..."
sleep 10

# Run PostgreSQL migrations
echo "🐘 Setting up PostgreSQL schema..."
node scripts/init-postgres.js

# Push MongoDB schema
echo "🍃 Setting up MongoDB schema..."
npx prisma db push --schema=prisma/mongodb/schema.prisma

echo "✅ Docker development environment is ready!"
echo ""
echo "🔗 Connection URLs:"
echo "   PostgreSQL: postgresql://postgres:password123@localhost:5432/kit_canteen"
echo "   MongoDB: mongodb://admin:password123@localhost:27017/kit_canteen?authSource=admin"
echo ""
echo "⚙️  Additional Configuration Needed:"
echo "   📱 Firebase: Update Firebase credentials in .env file"
echo "   💳 PhonePe: Update PhonePe merchant credentials in .env file"
echo "   🔐 JWT: Update JWT_SECRET and SESSION_SECRET with secure values"
echo ""
echo "📖 See ENV_CONFIGURATION_GUIDE.md for detailed setup instructions"
echo ""
echo "🚀 Start the application with: npm run dev"