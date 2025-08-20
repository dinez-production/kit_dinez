# Server Deployment Guide

This guide covers deploying the KIT-Canteen application to your production server with all the performance optimizations and persistent session features.

## Prerequisites

### System Requirements
- Node.js 18+ (recommended: Node.js 20)
- npm or yarn package manager
- MongoDB Atlas connection (cloud database)
- PostgreSQL database
- SSL certificate for HTTPS (recommended)
- Minimum 1GB RAM, 2GB recommended

### Required Environment Variables
You'll need to set these on your server:

```bash
# Core Application
NODE_ENV=production
PORT=5000

# Database Connections
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# Authentication & Security
SESSION_SECRET=your_super_secure_session_secret_here
JWT_SECRET=your_jwt_secret_here

# Payment Gateway (PhonePe)
PHONEPE_MERCHANT_ID=your_production_merchant_id
PHONEPE_SALT_KEY=your_production_salt_key
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api.phonepe.com/apis/hermes

# Performance Optimizations (automatically added)
VITE_SSE_RECONNECT_ATTEMPTS=5
VITE_SSE_RECONNECT_DELAY=1000
VITE_SSE_MAX_DELAY=30000
VITE_PAYMENT_TIMEOUT=15000
VITE_PAYMENT_RETRY_ATTEMPTS=3
VITE_ENABLE_PERFORMANCE_LOGGING=true
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
POSTGRES_MAX_CONNECTIONS=20
```

## Step-by-Step Deployment

### 1. Server Setup
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Clone and Setup Application
```bash
# Clone your repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Install dependencies
npm install

# Create environment file
cp .env.example .env
nano .env  # Edit with your production values
```

### 3. Configure Environment Variables
Create a `.env` file with your production settings:
```bash
# Copy the environment variables listed above
# Replace placeholder values with your actual credentials
```

### 4. Build Application
```bash
# Run production build with optimizations
npm run build:production

# This will:
# - Build the frontend and backend
# - Inject version information for cache management
# - Apply production optimizations
# - Create performance configuration
```

### 5. Database Setup
```bash
# The application will automatically:
# - Connect to MongoDB Atlas
# - Validate PostgreSQL connection
# - Run schema migrations
# - Create required collections and tables
```

### 6. Start Production Server

#### Option A: Direct Start
```bash
# Start in production mode
npm run start:production
```

#### Option B: PM2 (Recommended for Production)
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'kit-canteen',
    script: 'scripts/start-production.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Nginx Configuration (Recommended)
Create nginx configuration for reverse proxy:

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/kit-canteen
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Performance optimizations
    client_max_body_size 10M;
    keepalive_timeout 65;
    
    # Static files
    location /assets/ {
        root /path/to/your/app/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API and SSE endpoints
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SSE specific settings
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
    
    # Main application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/kit-canteen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 9. Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## Performance Optimizations Included

### SSE (Real-time Updates)
- Automatic reconnection with exponential backoff
- Keep-alive pings every 30 seconds
- Production-specific headers to prevent buffering
- Dead connection cleanup

### Payment Processing
- 15-second timeout for payment verification
- Retry logic with performance monitoring
- Enhanced error handling

### Database Connections
- Optimized connection pooling for MongoDB and PostgreSQL
- Connection timeout and idle management
- Performance monitoring

## Monitoring and Maintenance

### Health Checks
The application provides several health check endpoints:
- `GET /api/health` - Comprehensive health check
- `GET /api/status` - Quick status check
- `GET /api/schema-status` - Database schema validation

### Logs Monitoring
```bash
# View application logs
pm2 logs kit-canteen

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Performance Monitoring
The application includes built-in performance logging:
- SSE connection counts and errors
- Payment processing times
- Database query performance
- Cache hit/miss rates

### Updates and Maintenance
```bash
# Pull latest changes
git pull origin main

# Rebuild application
npm run build:production

# Restart with zero downtime
pm2 reload kit-canteen
```

## Troubleshooting

### Common Issues

1. **SSE Not Working**
   - Check nginx proxy settings for buffering
   - Verify firewall allows websocket connections
   - Check application logs for connection errors

2. **Payment Timeouts**
   - Verify PhonePe production credentials
   - Check network connectivity to payment gateway
   - Review timeout settings in environment variables

3. **Database Connection Issues**
   - Verify MongoDB Atlas whitelist includes server IP
   - Check PostgreSQL connection string
   - Review database logs for authentication errors

4. **Performance Issues**
   - Monitor CPU and memory usage with `htop`
   - Check database connection pool settings
   - Review nginx access logs for bottlenecks

### Emergency Recovery
```bash
# Quick restart
pm2 restart kit-canteen

# Full restart with fresh environment
pm2 delete kit-canteen
pm2 start ecosystem.config.js
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Database Security**: Use strong passwords and enable authentication
3. **SSL/TLS**: Always use HTTPS in production
4. **Firewall**: Restrict access to necessary ports only
5. **Updates**: Keep Node.js, npm, and system packages updated

## Support

For issues or questions:
1. Check application logs: `pm2 logs kit-canteen`
2. Verify environment variables are set correctly
3. Test database connections using health check endpoints
4. Review nginx configuration for proxy issues

The application is now optimized for production with persistent sessions, automatic cache invalidation, and enhanced real-time features.