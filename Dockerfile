# Multi-stage Dockerfile for FileDash - Production Ready
# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files first for better caching
COPY frontend/package*.json ./

# Install frontend dependencies (including dev dependencies for build)
RUN npm ci

# Copy frontend source and config files
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY frontend/components.json ./
COPY frontend/eslint.config.js ./
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html ./

# Build frontend for production
RUN npm run build -- --outDir=dist

# Stage 2: Build Backend
FROM rust:1.88-slim AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend manifests first for better layer caching
COPY backend/Cargo.toml backend/Cargo.lock ./

# Create a dummy src/main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (this layer will be cached)
RUN cargo build --release && rm -rf src

# Copy actual source code
COPY backend/src ./src

# Build the application
RUN cargo build --release

# Stage 3: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    sqlite3 \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r filedash && useradd -r -g filedash -s /bin/false -M filedash

# Create application directory structure
WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p /app/files /app/data /app/logs /app/frontend_dist \
    && chown -R filedash:filedash /app

# Copy built application from backend builder
COPY --from=backend-builder /app/target/release/filedash /app/filedash

# Copy built frontend from frontend builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend_dist

# Copy configuration template
COPY backend/config.toml /app/config.template.toml

# Create production configuration
RUN cp /app/config.template.toml /app/config.toml && \
    sed -i 's|home_directory = "./files"|home_directory = "/app/files"|g' /app/config.toml && \
    sed -i 's|frontend_dist_path = "./frontend_dist"|frontend_dist_path = "/app/frontend_dist"|g' /app/config.toml && \
    sed -i 's|url = "sqlite:./data/filedash.db"|url = "sqlite:/app/data/filedash.db"|g' /app/config.toml && \
    chown filedash:filedash /app/config.toml

# Make binary executable
RUN chmod +x /app/filedash

# Create volumes for persistent data
VOLUME ["/app/files", "/app/data", "/app/logs"]

# Switch to non-root user
USER filedash

# Expose port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the application
CMD ["/app/filedash"]
