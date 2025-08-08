# Docker Deployment Guide for KIT Canteen Application

This guide provides comprehensive instructions for dockerizing and deploying the KIT Canteen application with MongoDB 3.6+ and PostgreSQL support.

## 🐳 Docker Configuration Overview

The application includes a complete Docker setup with:
- **Multi-stage Dockerfile** for development and production builds
- **Docker Compose** configurations for different environments
- **Database initialization** scripts for MongoDB and PostgreSQL
- **Nginx reverse proxy** with SSL support
- **Redis caching** (optional)
- **Health monitoring** and logging

## 📁 Docker Files Structure

```
project-root/
├── Dockerfile                    # Multi-stage build configuration
├── docker-compose.yml           # Development environment
├── docker-compose.prod.yml      # Production environment
├── .dockerignore                # Build context exclusions
├── .env.docker                  # Docker-specific environment variables
└── docker/
    ├── mongodb/
    │   └── init/
    │       └── 01-init-user.js   # MongoDB initialization
    ├── postgres/
    │   └── init/
    │       └── 01-init-database.sql # PostgreSQL initialization
    ├── nginx/
    │   └── nginx.conf            # Nginx configuration
    └── redis/
        └── redis.conf            # Redis configuration
```

## 🚀 Quick Start (Development)

### Prerequisites
- Docker 24.0+ and Docker Compose 2.0+
- 8GB+ RAM recommended
- 20GB+ disk space

### 1. Clone and Configure
```bash
# Clone the repository (if needed)
git clone <your-repo>
cd kit-canteen

# Copy Docker environment configuration
cp .env.docker .env

# Edit environment variables as needed
nano .env
```

### 2. Start Development Environment
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Access the Application
- **Application**: http://localhost:5000
- **MongoDB Admin**: http://localhost:8081 (with admin profile)
- **PostgreSQL Admin**: http://localhost:8080 (with admin profile)
- **Health Check**: http://localhost:5000/api/health

## 📊 Service Details

### Application Container
- **Image**: Node.js 20 Alpine
- **Port**: 5000
- **Health Check**: `/api/status` endpoint
- **Auto-restart**: Unless stopped
- **MongoDB**: Version 7.0 (3.6+ compatible)
- **PostgreSQL**: Version 15

### Database Services

#### MongoDB (7.0)
- **Port**: 27017
- **Database**: kit-canteen
- **Authentication**: Optional (configured in init script)
- **Persistence**: Named volume `mongodb_data`
- **Indexes**: Automatically created for optimal performance

#### PostgreSQL (15)
- **Port**: 5432
- **Database**: kit_canteen
- **User**: postgres/password (development)
- **Persistence**: Named volume `postgres_data`

## 🏗️ Production Deployment

### 1. Production Environment Setup
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# For production with Nginx proxy
docker-compose -f docker-compose.prod.yml --profile nginx up -d
```

### 2. Environment Configuration
Create production environment variables:
- Database credentials
- Firebase production keys
- PhonePe production credentials
- SSL certificates (for HTTPS)

### 3. SSL Certificate Setup (Optional)
```bash
# Create SSL directory
mkdir -p docker/nginx/ssl

# Copy your SSL certificates
cp your-cert.pem docker/nginx/ssl/cert.pem
cp your-key.pem docker/nginx/ssl/key.pem

# Update nginx.conf to enable HTTPS
```

## 🔧 Docker Commands

### Development Operations
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f [service-name]

# Execute commands in containers
docker-compose exec app npm run db:push
docker-compose exec mongodb mongosh kit-canteen
docker-compose exec postgres psql -U postgres -d kit_canteen
```

### Production Operations
```bash
# Deploy production
docker-compose -f docker-compose.prod.yml up -d

# Update application only
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# Backup databases
docker-compose exec mongodb mongodump --db kit-canteen --out /backup
docker-compose exec postgres pg_dump -U postgres kit_canteen > backup.sql

# Scale application
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

### Database Operations
```bash
# MongoDB operations
docker-compose exec mongodb mongosh kit-canteen
docker-compose exec mongodb mongodump --db kit-canteen --out /data/backup

# PostgreSQL operations
docker-compose exec postgres psql -U postgres -d kit_canteen
docker-compose exec postgres pg_dump -U postgres kit_canteen > backup.sql
```

## 📈 Monitoring and Health Checks

### Built-in Health Checks
All services include health checks:
- **Application**: HTTP endpoint monitoring
- **MongoDB**: Connection and ping tests
- **PostgreSQL**: Database connectivity tests
- **Redis**: Command response tests

### Monitoring Endpoints
- **Application Health**: `GET /api/health`
- **Simple Status**: `GET /api/status`
- **Database Info**: Included in health response

### Log Management
```bash
# View service logs
docker-compose logs -f app
docker-compose logs -f mongodb
docker-compose logs -f postgres

# Container resource usage
docker stats

# System resource monitoring
docker system df
docker system prune  # Clean up unused resources
```

## 🔐 Security Considerations

### Development Environment
- Default passwords are used (change for production)
- All ports exposed for debugging
- Basic security headers applied

### Production Environment
- Strong passwords required
- Limited port exposure
- Nginx security headers
- Rate limiting enabled
- SSL/TLS encryption recommended

### Security Best Practices
1. **Change default passwords**
2. **Use environment secrets management**
3. **Enable SSL/TLS certificates**
4. **Configure firewall rules**
5. **Regular security updates**
6. **Monitor access logs**

## 🔄 Data Persistence

### Volume Management
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect kit-canteen-mongodb-data

# Backup volume
docker run --rm -v kit-canteen-mongodb-data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v kit-canteen-mongodb-data:/data -v $(pwd):/backup alpine tar xzf /backup/mongodb-backup.tar.gz -C /data
```

### Database Migration
```bash
# Run database migrations
docker-compose exec app npm run db:push

# Reset databases (development only)
docker-compose down -v  # Removes volumes
docker-compose up -d
```

## 🚨 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check container logs
docker-compose logs [service-name]

# Inspect container
docker inspect [container-name]

# Check resource usage
docker system df
```

#### Database Connection Issues
```bash
# Test MongoDB connection
docker-compose exec app node -e "
const { connectToMongoDB } = require('./server/mongodb');
connectToMongoDB().then(() => console.log('Connected')).catch(console.error);
"

# Test PostgreSQL connection
docker-compose exec postgres pg_isready -U postgres -d kit_canteen
```

#### Performance Issues
```bash
# Monitor container resources
docker stats

# Check application health
curl http://localhost:5000/api/health

# Optimize Docker performance
docker system prune -a
```

### Debug Mode
```bash
# Run with debug logging
DEBUG=* docker-compose up

# Access container shell
docker-compose exec app sh
docker-compose exec mongodb mongosh
docker-compose exec postgres psql -U postgres
```

## 📋 Environment Variables

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `MONGODB_URI`: MongoDB connection string
- `SESSION_SECRET`: Session encryption key
- `VITE_FIREBASE_*`: Firebase configuration

### Optional Variables
- `REDIS_URL`: Redis connection string
- `PHONEPE_*`: Payment gateway configuration
- `LOG_LEVEL`: Logging verbosity

## 🔄 CI/CD Integration

### Docker Hub Deployment
```bash
# Build and tag image
docker build -t your-username/kit-canteen:latest .

# Push to registry
docker push your-username/kit-canteen:latest
```

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        run: |
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Support

### Getting Help
1. Check application logs: `docker-compose logs -f`
2. Verify environment configuration
3. Test database connectivity
4. Check Docker system resources

### Useful Commands Summary
```bash
# Development
docker-compose up -d                          # Start development
docker-compose logs -f app                    # View app logs
docker-compose exec app npm run db:push       # Run migrations

# Production
docker-compose -f docker-compose.prod.yml up -d    # Start production
curl http://localhost/api/health                    # Check health

# Maintenance
docker system prune                           # Clean up resources
docker-compose down -v                        # Full cleanup with volumes
```

Your KIT Canteen application is now fully dockerized with comprehensive MongoDB 3.6+ support and production-ready configurations!