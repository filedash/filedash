# FileDash Backend

A high-performance file browser backend built with Rust and Axum, providing secure file operations, authentication, and search capabilities.

## Quick Start Guide

### Prerequisites

- **Rust** 1.70+ (install from [rustup.rs](https://rustup.rs/))
- **Git** (for cloning the repository)

### Installation & Setup

1. **Clone and navigate to the project:**

   ```bash
   git clone <repository-url>
   cd filedash/backend
   ```

2. **Install dependencies:**

   ```bash
   cargo build
   ```

3. **Configure the application:**

   Copy and edit the configuration file:

   ```bash
   cp config.toml config.local.toml  # Optional: for local overrides
   ```

   Key configuration options in `config.toml`:

   ```toml
   [server]
   port = 8080
   host = "0.0.0.0"

   [storage]
   home_directory = "./files"           # Directory to serve files from
   max_upload_size = 104857600         # 100 MB upload limit

   [auth]
   jwt_secret = "your-secret-here"     # Change in production!
   enable_auth = true                  # Set to false to disable auth
   ```

4. **Run the server:**

   ```bash
   cargo run
   ```

   The server will start on `http://localhost:8080`

### Development Mode

For development with auto-reload:

```bash
cargo install cargo-watch
cargo watch -x run
```

### Production Build

```bash
cargo build --release
./target/release/filedash
```

## API Endpoints

### File Operations

- `GET /api/files` - List files and directories
- `GET /api/files/download/{path}` - Download a file
- `POST /api/files/upload` - Upload files (multipart)
- `DELETE /api/files/{path}` - Delete a file
- `PUT /api/files/rename` - Rename/move a file

### Search

- `GET /api/search?q={query}` - Fuzzy search files

### Authentication (if enabled)

- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user info

### Health Check

- `GET /health` - Server health status

## Configuration

### Environment Variables

You can override configuration with environment variables:

```bash
export RUST_LOG=debug                    # Set log level
export FILEDASH_SERVER__PORT=3000       # Override server port
export FILEDASH_AUTH__JWT_SECRET=secret  # Override JWT secret
```

### Configuration File Structure

```toml
[server]
port = 8080                    # Server port
host = "0.0.0.0"              # Bind address

[storage]
home_directory = "./files"     # Root directory for file operations
allowed_extensions = ["*"]     # File type restrictions (* = all)
max_upload_size = 104857600   # Max upload size in bytes

[auth]
jwt_secret = "secret"         # JWT signing secret (change in production!)
token_expiration = 86400      # Token expiration in seconds
enable_auth = true            # Enable/disable authentication
```

## Security Features

- **Path Validation**: Prevents directory traversal attacks
- **JWT Authentication**: Secure token-based authentication
- **File Type Validation**: Configurable allowed file extensions
- **Upload Size Limits**: Prevents DOS attacks via large uploads
- **CORS Protection**: Configurable cross-origin request handling

## File Storage

By default, files are stored in the `./files` directory relative to the backend. This directory is automatically created if it doesn't exist.

**Important**: Ensure the application has read/write permissions to the storage directory.

## Testing

Run the test suite:

```bash
cargo test
```

Run with coverage:

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out html
```

Test files are located in the `test_files/` directory for integration testing.

## Logging

The application uses `tracing` for structured logging. Set the log level with:

```bash
export RUST_LOG=debug    # debug, info, warn, error
cargo run
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**

   - Ensure the storage directory has proper read/write permissions
   - Check that the port isn't already in use

2. **File Upload Failures**

   - Verify `max_upload_size` configuration
   - Check available disk space

3. **Authentication Issues**
   - Ensure `jwt_secret` is set and consistent
   - Check token expiration settings

### Debug Mode

Run with debug logging:

```bash
RUST_LOG=debug cargo run
```

## Performance

### Optimization Tips

1. **Release Build**: Always use `cargo build --release` for production
2. **File Serving**: Large files are streamed to minimize memory usage
3. **Async I/O**: All file operations are non-blocking

### Monitoring

The application exposes metrics at `/health` for basic health checking.

## Dependencies

Key dependencies and their purposes:

- **axum**: Web framework and HTTP server
- **tokio**: Async runtime
- **serde**: JSON serialization/deserialization
- **jsonwebtoken**: JWT authentication
- **argon2**: Password hashing
- **tracing**: Structured logging
- **config**: Configuration management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass with `cargo test`
5. Submit a pull request

## License

See the `LICENSE` file in the project root.
