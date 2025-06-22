# Development Setup Guide

This guide will help you set up a development environment for the FileDash backend.

## Prerequisites

### Required Software

1. **Rust** (1.70 or later)

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **Git**

   ```bash
   # macOS
   brew install git

   # Ubuntu/Debian
   sudo apt-get install git
   ```

3. **SQLite** (for database)

   ```bash
   # macOS
   brew install sqlite

   # Ubuntu/Debian
   sudo apt-get install sqlite3 libsqlite3-dev
   ```

### Optional Tools

1. **Cargo Watch** (for auto-reload during development)

   ```bash
   cargo install cargo-watch
   ```

2. **Cargo Edit** (for managing dependencies)

   ```bash
   cargo install cargo-edit
   ```

3. **SQLx CLI** (for database migrations)
   ```bash
   cargo install sqlx-cli --no-default-features --features sqlite
   ```

## Project Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd filedash/backend
```

### 2. Environment Setup

Create environment configuration:

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

Example `.env` file:

```bash
# Server Configuration
RUST_LOG=debug
FILEDASH_SERVER__HOST=127.0.0.1
FILEDASH_SERVER__PORT=8080

# Database
DATABASE_URL=sqlite:./data/filedash.db

# Authentication
FILEDASH_AUTH__JWT_SECRET=development_secret_very_long_and_secure
FILEDASH_AUTH__ENABLE_AUTH=true

# Storage
FILEDASH_STORAGE__HOME_DIRECTORY=./files
FILEDASH_STORAGE__MAX_UPLOAD_SIZE=104857600

# Development
RUST_BACKTRACE=1
```

### 3. Build Project

```bash
# Install dependencies and build
cargo build

# Run tests to verify setup
cargo test
```

### 4. Database Setup

```bash
# Create data directory
mkdir -p data

# Run database migrations
sqlx migrate run

# Alternatively, the app will create tables on first run
```

### 5. Create Test Data

```bash
# Create test files directory
mkdir -p files/documents
mkdir -p files/images

# Add some test files
echo "Test document content" > files/documents/test.txt
echo "Another document" > files/documents/readme.md
```

## Development Workflow

### Running the Server

**Standard Mode:**

```bash
cargo run
```

**Development Mode with Auto-Reload:**

```bash
cargo watch -x run
```

**With Custom Configuration:**

```bash
cargo run -- --config config.dev.toml
```

### Code Formatting

```bash
# Format code
cargo fmt

# Check formatting
cargo fmt -- --check
```

### Linting

```bash
# Run clippy for lints
cargo clippy

# Fix simple lints automatically
cargo clippy --fix
```

### Testing

```bash
# Run all tests
cargo test

# Run specific test module
cargo test api_tests

# Run tests with output
cargo test -- --nocapture

# Run tests in release mode
cargo test --release
```

### Code Coverage

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out html

# Open coverage report
open tarpaulin-report.html
```

## Project Structure

```
backend/
├── Cargo.toml              # Project dependencies
├── config.toml             # Default configuration
├── .env.example            # Environment template
├── src/
│   ├── main.rs             # Application entry point
│   ├── lib.rs              # Library root
│   ├── api/                # HTTP route handlers
│   ├── services/           # Business logic
│   ├── middleware/         # HTTP middleware
│   ├── config/             # Configuration management
│   ├── db/                 # Database layer
│   ├── errors/             # Error handling
│   └── utils/              # Utility functions
├── tests/                  # Integration tests
├── docs/                   # Documentation
├── files/                  # File storage (gitignored)
├── data/                   # Database storage (gitignored)
└── target/                 # Build artifacts (gitignored)
```

## Configuration Management

### Configuration Files

1. **config.toml** - Default configuration
2. **config.local.toml** - Local overrides (gitignored)
3. **config.dev.toml** - Development configuration
4. **config.prod.toml** - Production configuration

### Environment Variables

Override any configuration with environment variables using the pattern:

```
FILEDASH_<SECTION>__<KEY>=value
```

Examples:

- `FILEDASH_SERVER__PORT=3000`
- `FILEDASH_AUTH__ENABLE_AUTH=false`
- `FILEDASH_STORAGE__HOME_DIRECTORY=/data/files`

## Development Tools

### VS Code Setup

Recommended extensions:

- `rust-analyzer` - Rust language support
- `vadimcn.vscode-lldb` - Debugging support
- `tamasfe.even-better-toml` - TOML syntax support

VS Code settings (`.vscode/settings.json`):

```json
{
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.checkOnSave.command": "clippy",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

### Debug Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug FileDash",
      "cargo": {
        "args": ["build", "--bin=filedash"],
        "filter": {
          "name": "filedash",
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}",
      "env": {
        "RUST_LOG": "debug"
      }
    }
  ]
}
```

## Hot Reload Setup

### Using Cargo Watch

```bash
# Install cargo-watch
cargo install cargo-watch

# Run with auto-reload
cargo watch -x 'run'

# Watch specific files
cargo watch -w src -w config.toml -x run
```

### Using SystemFD (Advanced)

For zero-downtime reloads:

```bash
# Install systemfd and cargo-watch
cargo install systemfd cargo-watch

# Run with socket activation
systemfd --no-pid -s http::8080 -- cargo watch -x run
```

## Database Development

### Migrations

```bash
# Create new migration
sqlx migrate add create_users_table

# Run migrations
sqlx migrate run

# Revert last migration
sqlx migrate revert
```

### Database Queries

For compile-time query checking:

```bash
# Prepare queries for offline compilation
cargo sqlx prepare

# Check queries against database
cargo sqlx check
```

## Performance Profiling

### CPU Profiling

```bash
# Install flamegraph
cargo install flamegraph

# Profile the application
cargo flamegraph --bin filedash

# Open flamegraph.svg in browser
```

### Memory Profiling

```bash
# Use valgrind (Linux)
valgrind --tool=massif target/debug/filedash

# Use heaptrack (Linux)
heaptrack target/debug/filedash
```

## Troubleshooting

### Common Issues

1. **Build Failures**

   ```bash
   # Clean build artifacts
   cargo clean

   # Update dependencies
   cargo update

   # Check for missing system dependencies
   sudo apt-get install build-essential pkg-config libssl-dev
   ```

2. **Permission Errors**

   ```bash
   # Fix file permissions
   chmod -R 755 files/

   # Check directory ownership
   ls -la files/
   ```

3. **Port Already in Use**

   ```bash
   # Find process using port 8080
   lsof -i :8080

   # Kill process
   kill -9 <PID>

   # Or use different port
   export FILEDASH_SERVER__PORT=8081
   ```

### Debugging Tips

1. **Enable Debug Logging**

   ```bash
   export RUST_LOG=debug
   cargo run
   ```

2. **Print Stack Traces**

   ```bash
   export RUST_BACKTRACE=1
   cargo run
   ```

3. **Use Debug Print Statements**
   ```rust
   dbg!(&variable);
   println!("Debug: {:?}", variable);
   ```

### Getting Help

- Check [documentation](../docs/)
- Review [test files](../tests/) for examples
- Search [GitHub issues](../../issues)
- Ask in [discussions](../../discussions)
