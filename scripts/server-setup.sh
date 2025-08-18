#!/bin/bash

# KIT-Canteen Server Setup Script
# Run this script on your production server after cloning the repository

set -e  # Exit on any error

echo "🚀 Starting KIT-Canteen server setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your production credentials:"
        print_warning "nano .env"
    else
        print_error ".env.example not found. Please create .env manually."
        exit 1
    fi
else
    print_status ".env file found"
fi

# Run production optimization
print_status "Applying production optimizations..."
node scripts/production-optimization.js

# Build application
print_status "Building application for production..."
npm run build:production

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing PM2 globally..."
    sudo npm install -g pm2
fi

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f ecosystem.config.js ]; then
    print_status "Creating PM2 ecosystem configuration..."
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
fi

# Create logs directory
mkdir -p logs

# Test database connections
print_status "Testing database connections..."
node -e "
const { performStartupCheck } = require('./dist/server/startup-check.js');
performStartupCheck().then(result => {
  if (result) {
    console.log('✅ Database connections successful');
    process.exit(0);
  } else {
    console.log('❌ Database connection failed');
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ Database test failed:', err.message);
  process.exit(1);
});
" || {
    print_error "Database connection test failed. Please check your environment variables."
    print_warning "Make sure to set DATABASE_URL and MONGODB_URI in your .env file"
    exit 1
}

print_status "Setup completed successfully!"
echo
echo "🎉 Next steps:"
echo "1. Edit .env file with your production credentials: nano .env"
echo "2. Start the application: pm2 start ecosystem.config.js"
echo "3. Save PM2 configuration: pm2 save && pm2 startup"
echo "4. Configure nginx reverse proxy (see SERVER_DEPLOYMENT_GUIDE.md)"
echo "5. Set up SSL certificate with Let's Encrypt"
echo
echo "📊 Useful commands:"
echo "- View logs: pm2 logs kit-canteen"
echo "- Restart app: pm2 restart kit-canteen"
echo "- Stop app: pm2 stop kit-canteen"
echo "- View status: pm2 status"
echo
print_status "Ready for production deployment!"