# Multi-stage Dockerfile for KIT Canteen Application
# Supports both development and production environments with MongoDB 3.6+ and PostgreSQL

# ===================================
# Stage 1: Base Node.js setup
# ===================================
FROM node:20-alpine AS base

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# ===================================
# Stage 2: Dependencies installation
# ===================================
FROM base AS deps

# Install all dependencies
RUN npm ci --frozen-lockfile

# ===================================
# Stage 3: Development stage
# ===================================
FROM base AS development

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/status || exit 1

# Start development server
CMD ["npm", "run", "dev"]

# ===================================
# Stage 4: Build stage
# ===================================
FROM base AS builder

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ===================================
# Stage 5: Production stage
# ===================================
FROM node:20-alpine AS production

# Install system dependencies for production
RUN apk add --no-cache \
    curl \
    dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/shared ./shared
COPY --from=builder --chown=nextjs:nodejs /app/server ./server

# Copy client build files
COPY --from=builder --chown=nextjs:nodejs /app/client/dist ./client/dist

# Set environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/status || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start production server
CMD ["node", "server/index.js"]