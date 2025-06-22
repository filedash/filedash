# Docker Deployment Guide

This guide covers deploying FileDash backend using Docker containers for production environments.

## Docker Setup

### Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ (optional but recommended)
- 2GB+ available RAM
- 10GB+ available disk space

### Single Container Deployment

#### 1. Build Docker Image

```bash
# From the backend directory
docker build -t filedash-backend .
```

#### 2. Run Container

```bash
docker run -d \
  --name filedash \
  -p 8080:8080 \
  -v $(pwd)/files:/app/files \
  -v $(pwd)/data:/app/data \
  -e RUST_LOG=info \
  -e FILEDASH_AUTH__JWT_SECRET=your-production-secret-here \
  filedash-backend
```

### Docker Compose Deployment

#### 1. Create docker-compose.yml

```yaml
version: '3.8'

services:
  filedash:
    build: .
    container_name: filedash-backend
    restart: unless-stopped
    ports:
      - '8080:8080'
    volumes:
      - ./files:/app/files:rw
      - ./data:/app/data:rw
      - ./config.prod.toml:/app/config.toml:ro
    environment:
      - RUST_LOG=info
      - FILEDASH_AUTH__JWT_SECRET=${JWT_SECRET}
      - FILEDASH_SERVER__HOST=0.0.0.0
    networks:
      - filedash-network
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8080/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Reverse proxy
  nginx:
    image: nginx:alpine
    container_name: filedash-nginx
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - filedash
    networks:
      - filedash-network

networks:
  filedash-network:
    driver: bridge
```

#### 2. Environment Configuration

Create `.env` file:

```bash
# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your-very-long-and-secure-production-secret-key-here

# Database
DATABASE_URL=sqlite:/app/data/filedash.db

# File Storage
FILES_ROOT=/app/files

# Optional: External database
# DATABASE_URL=postgres://user:password@postgres:5432/filedash
```

#### 3. Deploy

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Production Dockerfile

### Multi-Stage Build

```dockerfile
# Build stage
FROM rust:1.70-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -r -s /bin/false -m -d /app filedash

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/target/release/filedash /app/filedash

# Copy configuration
COPY config.toml ./

# Create directories
RUN mkdir -p files data && \
    chown -R filedash:filedash /app

# Switch to app user
USER filedash

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run application
CMD ["./filedash"]
```

## Production Configuration

### config.prod.toml

```toml
[server]
host = "0.0.0.0"
port = 8080
workers = 4

[storage]
home_directory = "/app/files"
max_upload_size = 1073741824  # 1GB
allowed_extensions = ["*"]
temp_directory = "/tmp"

[auth]
jwt_secret = "set-via-environment"  # Override with env var
token_expiration = 86400  # 24 hours
enable_auth = true

[security]
max_request_size = 1073741824  # 1GB
rate_limit_requests = 1000
rate_limit_window = 3600  # 1 hour
cors_allowed_origins = ["https://yourdomain.com"]

[logging]
level = "info"
format = "json"
file = "/app/logs/filedash.log"

[database]
url = "sqlite:/app/data/filedash.db"
max_connections = 10
```

## Reverse Proxy Setup

### Nginx Configuration

```nginx
upstream filedash {
    server filedash:8080;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/certs/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # File Upload Configuration
    client_max_body_size 1G;
    client_body_timeout 300s;
    client_body_buffer_size 128k;

    location / {
        proxy_pass http://filedash;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file serving (optional optimization)
    location /static/ {
        alias /app/frontend_dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://filedash;
        access_log off;
    }
}
```

### Traefik Configuration

```yaml
# docker-compose.traefik.yml
version: '3.8'

services:
  filedash:
    build: .
    networks:
      - traefik
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.filedash.rule=Host(`files.yourdomain.com`)'
      - 'traefik.http.routers.filedash.tls=true'
      - 'traefik.http.routers.filedash.tls.certresolver=letsencrypt'
      - 'traefik.http.services.filedash.loadbalancer.server.port=8080'
      - 'traefik.http.middlewares.filedash-headers.headers.customrequestheaders.X-Forwarded-Proto=https'

networks:
  traefik:
    external: true
```

## Environment Variables

### Required Production Variables

```bash
# Security
JWT_SECRET=your-256-bit-secret-key
FILEDASH_AUTH__ENABLE_AUTH=true

# Server
FILEDASH_SERVER__HOST=0.0.0.0
FILEDASH_SERVER__PORT=8080

# Storage
FILEDASH_STORAGE__HOME_DIRECTORY=/app/files
FILEDASH_STORAGE__MAX_UPLOAD_SIZE=1073741824

# Database (if using external)
DATABASE_URL=postgres://user:password@db:5432/filedash

# Logging
RUST_LOG=info
```

### Optional Variables

```bash
# Performance
FILEDASH_SERVER__WORKERS=4
FILEDASH_DATABASE__MAX_CONNECTIONS=10

# Security
FILEDASH_SECURITY__RATE_LIMIT_REQUESTS=1000
FILEDASH_SECURITY__CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Features
FILEDASH_FEATURES__SEARCH_ENABLED=true
FILEDASH_FEATURES__THUMBNAILS_ENABLED=true
```

## Health Monitoring

### Health Check Endpoint

The `/health` endpoint provides detailed system status:

```bash
curl http://localhost:8080/health
```

Response:

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 3600,
  "checks": {
    "database": "healthy",
    "storage": "healthy",
    "memory": "healthy"
  },
  "metrics": {
    "requests_total": 1000,
    "active_connections": 5,
    "memory_usage": 134217728,
    "disk_usage": {
      "used": 1073741824,
      "available": 10737418240
    }
  }
}
```

### Monitoring with Prometheus

Add Prometheus metrics exposure:

```toml
# config.prod.toml
[monitoring]
prometheus_enabled = true
prometheus_endpoint = "/metrics"
```

## Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  filedash:
    build: .
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    networks:
      - filedash-network

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx-loadbalancer.conf:/etc/nginx/nginx.conf
    ports:
      - '80:80'
    depends_on:
      - filedash
    networks:
      - filedash-network
```

### Load Balancer Configuration

```nginx
upstream filedash_backend {
    least_conn;
    server filedash_1:8080;
    server filedash_2:8080;
    server filedash_3:8080;
}
```

## Backup Strategy

### Database Backup

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup SQLite database
docker exec filedash-backend sqlite3 /app/data/filedash.db ".backup /app/data/backup_$DATE.db"
docker cp filedash-backend:/app/data/backup_$DATE.db $BACKUP_DIR/

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "backup_*.db" -mtime +7 -delete
```

### File Storage Backup

```bash
#!/bin/bash
# backup-files.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create compressed backup of files
docker run --rm \
  -v filedash_files:/source:ro \
  -v $BACKUP_DIR:/backup \
  alpine:latest \
  tar czf /backup/files_$DATE.tar.gz -C /source .

# Cleanup old backups
find $BACKUP_DIR -name "files_*.tar.gz" -mtime +7 -delete
```

## Security Hardening

### Container Security

```dockerfile
# Use non-root user
RUN adduser -D -s /bin/sh -h /app filedash
USER filedash

# Read-only root filesystem
docker run --read-only --tmpfs /tmp --tmpfs /var/tmp filedash-backend

# Limit resources
docker run --memory=512m --cpus=1.0 filedash-backend

# Drop capabilities
docker run --cap-drop=ALL --cap-add=CHOWN --cap-add=SETGID --cap-add=SETUID filedash-backend
```

### Network Security

```yaml
# docker-compose.secure.yml
networks:
  filedash-internal:
    driver: bridge
    internal: true # No external access
  filedash-external:
    driver: bridge

services:
  filedash:
    networks:
      - filedash-internal
      - filedash-external
    expose:
      - '8080' # Don't publish ports directly
```
