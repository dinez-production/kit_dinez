#!/bin/bash

# Docker Setup Script for KIT Canteen Application
# Automates the Docker environment setup and validation

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Docker version
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi

    local docker_version=$(docker --version | grep -o '[0-9]\+\.[0-9]\+' | head -1)
    print_success "Docker version: $docker_version"

    if ! command_exists docker-compose; then
        print_warning "docker-compose not found. Checking for 'docker compose'..."
        if ! docker compose version >/dev/null 2>&1; then
            print_error "Docker Compose is not available. Please install Docker Compose."
            exit 1
        else
            print_success "Using 'docker compose' (newer version)"
            COMPOSE_CMD="docker compose"
        fi
    else
        COMPOSE_CMD="docker-compose"
        local compose_version=$(docker-compose --version | grep -o '[0-9]\+\.[0-9]\+' | head -1)
        print_success "Docker Compose version: $compose_version"
    fi
}

# Function to create environment file
setup_environment() {
    print_status "Setting up environment configuration..."

    if [ ! -f .env ]; then
        if [ -f .env.docker ]; then
            cp .env.docker .env
            print_success "Created .env from .env.docker template"
        elif [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env from .env.example template"
        else
            print_warning "No environment template found. Creating basic .env file..."
            cat > .env << 'EOF'
# Basic Docker Environment Configuration
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password@postgres:5432/kit_canteen
MONGODB_URI=mongodb://mongodb:27017/kit-canteen
SESSION_SECRET=your_very_long_random_session_secret_here_minimum_32_characters_for_docker
EOF
            print_success "Created basic .env file"
        fi
    else
        print_warning ".env file already exists. Skipping creation."
    fi

    print_warning "Please review and update the .env file with your specific configuration!"
}

# Function to validate Docker setup
validate_docker_setup() {
    print_status "Validating Docker setup..."

    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi

    # Check available disk space (minimum 10GB recommended)
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 10 ]; then
        print_warning "Available disk space: ${available_space}GB. Recommended: 10GB+"
    else
        print_success "Available disk space: ${available_space}GB"
    fi

    # Check available memory
    if command_exists free; then
        local available_memory=$(free -g | awk 'NR==2{print $7}')
        if [ "$available_memory" -lt 4 ]; then
            print_warning "Available memory: ${available_memory}GB. Recommended: 4GB+"
        else
            print_success "Available memory: ${available_memory}GB"
        fi
    fi
}

# Function to create Docker network
setup_network() {
    print_status "Setting up Docker network..."

    if docker network ls | grep -q kit-canteen-network; then
        print_warning "Network 'kit-canteen-network' already exists"
    else
        docker network create kit-canteen-network >/dev/null 2>&1 || true
        print_success "Created Docker network: kit-canteen-network"
    fi
}

# Function to pull Docker images
pull_images() {
    print_status "Pulling Docker images..."

    local images=(
        "node:20-alpine"
        "postgres:15-alpine"
        "mongo:7.0-jammy"
        "nginx:alpine"
        "redis:7-alpine"
    )

    for image in "${images[@]}"; do
        print_status "Pulling $image..."
        docker pull "$image"
    done

    print_success "All images pulled successfully"
}

# Function to build application image
build_application() {
    print_status "Building application Docker image..."

    if docker build -t kit-canteen-app --target development . >/dev/null 2>&1; then
        print_success "Application image built successfully"
    else
        print_error "Failed to build application image"
        exit 1
    fi
}

# Function to start services
start_services() {
    local mode=${1:-development}
    
    if [ "$mode" = "production" ]; then
        print_status "Starting production services..."
        $COMPOSE_CMD -f docker-compose.prod.yml up -d
    else
        print_status "Starting development services..."
        $COMPOSE_CMD up -d
    fi

    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 10

    # Check service health
    check_services
}

# Function to check service health
check_services() {
    print_status "Checking service health..."

    local services=("postgres" "mongodb" "app")
    local healthy_services=0

    for service in "${services[@]}"; do
        if $COMPOSE_CMD ps "$service" | grep -q "Up"; then
            print_success "$service is running"
            ((healthy_services++))
        else
            print_warning "$service is not running properly"
        fi
    done

    if [ $healthy_services -eq ${#services[@]} ]; then
        print_success "All core services are running"
        
        # Test application health endpoint
        print_status "Testing application health endpoint..."
        sleep 5  # Give app time to fully start
        
        if curl -sf http://localhost:5000/api/status >/dev/null 2>&1; then
            print_success "Application is responding to health checks"
        else
            print_warning "Application health check failed - it may still be starting up"
        fi
    else
        print_warning "Some services are not running properly"
    fi
}

# Function to display service URLs
show_urls() {
    echo ""
    print_success "🚀 Docker setup completed successfully!"
    echo ""
    echo "Service URLs:"
    echo "  📱 Application:       http://localhost:5000"
    echo "  🏥 Health Check:      http://localhost:5000/api/health"
    echo "  🏥 Status Check:      http://localhost:5000/api/status"
    echo ""
    echo "Optional Admin Interfaces (with --profile admin):"
    echo "  🍃 MongoDB Admin:     http://localhost:8081"
    echo "  🐘 PostgreSQL Admin: http://localhost:8080"
    echo ""
    echo "Useful commands:"
    echo "  📄 View logs:         $COMPOSE_CMD logs -f"
    echo "  🔍 Service status:    $COMPOSE_CMD ps"
    echo "  🛑 Stop services:     $COMPOSE_CMD down"
    echo "  🗑️  Full cleanup:      $COMPOSE_CMD down -v"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -m, --mode MODE     Set deployment mode (development|production) [default: development]"
    echo "  -p, --pull          Pull latest Docker images"
    echo "  -b, --build         Build application image"
    echo "  -s, --start         Start services"
    echo "  -c, --check         Check service health"
    echo "  --admin             Start with admin interfaces"
    echo "  --no-build          Skip building application image"
    echo "  --clean             Clean up existing containers and volumes"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full setup with development mode"
    echo "  $0 -m production    # Setup for production"
    echo "  $0 --clean --start  # Clean setup and start services"
    echo "  $0 --admin          # Start with admin interfaces"
}

# Parse command line arguments
MODE="development"
PULL_IMAGES=true
BUILD_APP=true
START_SERVICES=true
ADMIN_PROFILE=""
CLEAN_SETUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -p|--pull)
            PULL_IMAGES=true
            shift
            ;;
        -b|--build)
            BUILD_APP=true
            shift
            ;;
        -s|--start)
            START_SERVICES=true
            shift
            ;;
        -c|--check)
            check_services
            exit 0
            ;;
        --admin)
            ADMIN_PROFILE="--profile admin"
            shift
            ;;
        --no-build)
            BUILD_APP=false
            shift
            ;;
        --clean)
            CLEAN_SETUP=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "🐳 KIT Canteen Docker Setup Script"
    echo "================================="
    echo ""

    # Validate environment
    check_docker
    validate_docker_setup

    # Clean setup if requested
    if [ "$CLEAN_SETUP" = true ]; then
        print_warning "Cleaning up existing containers and volumes..."
        $COMPOSE_CMD down -v >/dev/null 2>&1 || true
        docker system prune -f >/dev/null 2>&1 || true
        print_success "Cleanup completed"
    fi

    # Setup environment
    setup_environment
    setup_network

    # Pull images if requested
    if [ "$PULL_IMAGES" = true ]; then
        pull_images
    fi

    # Build application if requested
    if [ "$BUILD_APP" = true ]; then
        build_application
    fi

    # Start services if requested
    if [ "$START_SERVICES" = true ]; then
        start_services "$MODE"
    fi

    # Show URLs and completion message
    show_urls
}

# Run main function
main "$@"