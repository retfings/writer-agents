# ============================================
# NovelFlow - Writer Agents Platform
# Multi-stage build with Nginx
# ============================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend files
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Create app directory
WORKDIR /app

# Copy backend from builder stage
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./package.json

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/frontend/dist ./static

# Copy nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R node:node /app

# Create directories for nginx
RUN mkdir -p /run/nginx /var/www/novelflow && \
    chown -R nginx:nginx /var/www/novelflow /run/nginx

# Copy static files to web root
RUN cp -r ./static/* /var/www/novelflow/

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start script
CMD ["/start.sh"]
