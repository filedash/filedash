# FileDash

[![Docker Pulls](https://img.shields.io/docker/pulls/rahulkatiyar19955/filedash)](https://hub.docker.com/r/rahulkatiyar19955/filedash)
[![Docker Image Size](https://img.shields.io/docker/image-size/rahulkatiyar19955/filedash/latest)](https://hub.docker.com/r/rahulkatiyar19955/filedash)
[![GitHub Release](https://img.shields.io/github/v/release/rahulkatiyar19955/filedash)](https://github.com/rahulkatiyar19955/filedash/releases)
[![License](https://img.shields.io/github/license/rahulkatiyar19955/filedash)](LICENSE)

A modern, minimal, high-performance, Rust-based file browser for web.

## Tech Stack

- **Backend**: Rust with Axum (Actix optional)
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Database**: SQLite (for config/auth/multi-user)
- **Containerization**: Docker

## Features

- 📂 File Explorer (with metadata: name, size, date, permissions)
- 🔄 File operations: upload, download (resumable), rename, delete, move
- 🔍 Fuzzy search
- 🔐 Auth (JWT/session)
- 🌓 Dark mode, responsive UI
- 🖼️ File previews (images, PDFs, text)
- 🛡️ Security: sandboxed access, path validation, DOS protection

## Getting Started

### Prerequisites

- Docker and Docker Compose installed

## Quick Start with Docker

### Using Docker Run (Simplest)

```bash
docker run -d \
  --name filedash \
  -p 8080:8080 \
  -v $(pwd)/files:/app/files \
  -v $(pwd)/data:/app/data \
  -e FILEDASH_AUTH__JWT_SECRET=your_secure_secret_here \
  rahulkatiyar19955/filedash:latest
```

### Using Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  filedash:
    image: rahulkatiyar19955/filedash:latest
    container_name: filedash
    ports:
      - '8080:8080'
    volumes:
      - ./files:/app/files
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - FILEDASH_AUTH__JWT_SECRET=your_secure_secret_here
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

### Access Your Files

- Open your browser to `http://localhost:8080`
- Your files will be accessible through the web interface
- Files are stored in the `./files` directory on your host

## Configuration

The application can be configured through environment variables:

| Variable                         | Description                   | Default                        |
| -------------------------------- | ----------------------------- | ------------------------------ |
| `FILEDASH_AUTH__JWT_SECRET`      | JWT secret for authentication | Required                       |
| `FILEDASH_SERVER__PORT`          | Server port                   | `8080`                         |
| `FILEDASH_DATABASE__URL`         | Database URL                  | `sqlite:/app/data/filedash.db` |
| `FILEDASH_FILES__HOME_DIRECTORY` | Files directory               | `/app/files`                   |

## Local Development

### Prerequisites

- **Rust** 1.70+ (install from [rustup.rs](https://rustup.rs/))
- **Node.js** 18+ and npm

### Start the Backend

```bash
# Navigate to backend directory
cd backend

# Run the server
cargo run
```

The server will start on `http://localhost:8080`

### Start the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:5173`

## Building from Source

### Build Docker Image

```bash
docker build -t filedash .
```

### Build Binaries

```bash
# Backend
cd backend
cargo build --release

# Frontend
cd frontend
npm run build
```

## Security Features

- 🛡️ **Path Validation**: Prevents directory traversal attacks
- 🔒 **JWT Authentication**: Secure token-based auth
- 🚫 **DOS Protection**: Rate limiting and file size limits
- 📁 **Sandboxed Access**: Files restricted to configured directory
- 🔐 **Secure Headers**: CORS, CSP, and security headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/rahulkatiyar19955/filedash/wiki)
- 🐛 [Issue Tracker](https://github.com/rahulkatiyar19955/filedash/issues)
- 💬 [Discussions](https://github.com/rahulkatiyar19955/filedash/discussions)
