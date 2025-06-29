# FileDash

A modern, minimal, high-performance, rust based file browser for web.

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

### Quick Start

```bash
docker run -d \
  -p 8080:8080 \
  -v ./data/files:/app/files \
  -v ./data/database:/app/data \
  -v ./data/logs:/app/logs \
  -e FILEDASH_AUTH__JWT_SECRET=your_secure_secret \
  rahulkatiyar1995/filedash:latest
```