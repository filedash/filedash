# FileDash

[![Docker Pulls](https://img.shields.io/docker/pulls/filedash/filedash)](https://hub.docker.com/r/filedash/filedash)
[![Docker Image Size](https://img.shields.io/docker/image-size/filedash/filedash/latest)](https://hub.docker.com/r/filedash/filedash)
[![GitHub Release](https://img.shields.io/github/v/release/filedash/filedash)](https://github.com/filedash/filedash/releases)
[![License](https://img.shields.io/github/license/filedash/filedash)](LICENSE)

A modern, minimal, high-performance, Rust-based file browser for web.

## Features

- 📂 File Explorer with metadata (name, size, date)
- 🔄 File operations: upload, download, rename, delete
- � JWT authentication
- 🌓 Dark mode, responsive UI
- 🛡️ Security: sandboxed access, path validation, DOS protection

## Quick Start

Run FileDash with Docker:

```bash
# Create data directories first (prevents Docker from creating them as root)
mkdir -p $(pwd)/files -p $(pwd)/database -p $(pwd)/logs

# Run with your user permissions (avoids permission issues)
docker run -d \
  --name filedash \
  --user "$(id -u):$(id -g)" \
  -p 8080:8080 \
  -v $(pwd)/files:/app/files \
  -v $(pwd)/database:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e FILEDASH_AUTH__JWT_SECRET=your_secure_secret_here \
  -e FILEDASH_ADMIN_PASSWORD=admin123 \
  filedash/filedash:latest
```

Then open your browser to `http://localhost:8080`

Your files will be accessible through the web interface and stored in the `./files` directory.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
