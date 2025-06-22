# FileDash Backend

A high-performance file browser backend built with Rust and Axum.

## Quick Start

### Prerequisites

- **Rust** 1.70+ (install from [rustup.rs](https://rustup.rs/))

### Start the Backend

```bash
# Navigate to backend directory
cd filedash/backend

# Run the server
cargo run
```

The server will start on `http://localhost:8080`

## Testing

To test all Stage 1 functionality, see: **[📋 Stage 1 Testing Guide](TESTING_STAGE1.md)**

## API Endpoints

- `GET /health` - Health check
- `GET /api/files` - List files
- `POST /api/files/upload` - Upload files
- `GET /api/files/download/{path}` - Download file
- `DELETE /api/files/{path}` - Delete file

## Configuration

Default configuration in `config.toml`:

- Server runs on port 8080
- Files stored in `./files/` directory
- No authentication required (Stage 1)

## Development

```bash
# Auto-reload on changes
cargo install cargo-watch
cargo watch -x run

# Production build
cargo build --release
./target/release/filedash
```
