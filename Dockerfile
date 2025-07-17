# Multi-stage Dockerfile for FileDash - Ultra-Optimized Production Build
# Stage 1: Build Frontend (Optimized)
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files for better caching
COPY frontend/package*.json ./

# Install dependencies with clean cache
RUN npm ci --only=production --no-audit --no-fund && \
    npm ci --only=development --no-audit --no-fund

# Copy source files
COPY frontend/ ./

# Build frontend with optimization flags
RUN npm run build -- --outDir=dist && \
    # Remove source maps and unnecessary files for production
    find dist -name "*.map" -delete && \
    # Clean up node_modules to free space
    rm -rf node_modules

# Stage 2: Build Backend (Ultra-Optimized)
FROM rust:1.88-slim AS backend-builder

WORKDIR /app

# Install only necessary build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    binutils \
    && rm -rf /var/lib/apt/lists/*

# Set optimal Rust compilation flags for size and performance
ENV CARGO_PROFILE_RELEASE_STRIP=true \
    CARGO_PROFILE_RELEASE_LTO=true \
    CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1 \
    CARGO_PROFILE_RELEASE_PANIC=abort \
    CARGO_PROFILE_RELEASE_OPT_LEVEL=z

# Copy manifests first for dependency caching
COPY backend/Cargo.toml backend/Cargo.lock ./

# Build dependencies only (dummy main)
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/filedash*

# Copy source and build the real application
COPY backend/src ./src
RUN cargo build --release && \
    # Strip the binary to remove debug symbols
    strip target/release/filedash

# Stage 3: Config preparation
FROM alpine:3.19 AS config-builder
RUN apk add --no-cache sed
COPY backend/config.toml /tmp/config.toml
RUN sed -i 's|home_directory = "./files"|home_directory = "/app/files"|g' /tmp/config.toml && \
    sed -i 's|frontend_dist_path = "./frontend_dist"|frontend_dist_path = "/app/frontend_dist"|g' /tmp/config.toml && \
    sed -i 's|url = "sqlite:./data/filedash.db"|url = "sqlite:/app/data/filedash.db"|g' /tmp/config.toml

# Stage 4: Directory preparation
FROM alpine:3.19 AS directory-builder
RUN addgroup -g 65532 nonroot && adduser -D -u 65532 -G nonroot nonroot
RUN mkdir -p /app/files /app/data /app/logs && \
    chown -R nonroot:nonroot /app

# Copy sample files to provide better out-of-box experience
COPY backend/files/ /app/files/
RUN chown -R nonroot:nonroot /app/files

# Stage 5: Final Ultra-Minimal Runtime
FROM gcr.io/distroless/cc-debian12:nonroot

WORKDIR /app

# Copy CA certificates for HTTPS
COPY --from=backend-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the optimized binary
COPY --from=backend-builder /app/target/release/filedash /app/filedash

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend_dist

# Copy production configuration
COPY --from=config-builder /tmp/config.toml /app/config.toml

# Copy pre-created directories with proper permissions
COPY --from=directory-builder --chown=nonroot:nonroot /app/files /app/files
COPY --from=directory-builder --chown=nonroot:nonroot /app/data /app/data
COPY --from=directory-builder --chown=nonroot:nonroot /app/logs /app/logs

# Create volume mount points
VOLUME ["/app/files", "/app/data", "/app/logs"]

# Use nonroot user (predefined in distroless:nonroot)
USER nonroot:nonroot

# Expose port
EXPOSE 8080

# Note: Health checks are disabled for distroless to minimize image size
# External health monitoring should be used (e.g., Kubernetes liveness/readiness probes)
# The /health endpoint is available at http://localhost:8080/health

# Start the application (direct exec, no shell)
ENTRYPOINT ["/app/filedash"]
