# Testing Guide

Comprehensive testing strategy for the FileDash backend to ensure reliability, security, and performance.

## Testing Strategy

### Test Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  ← Few, High-level
                    │   (Selenium)    │
                    └─────────────────┘
                  ┌───────────────────────┐
                  │  Integration Tests    │  ← Some, API-level
                  │   (HTTP Requests)     │
                  └───────────────────────┘
              ┌─────────────────────────────────┐
              │         Unit Tests              │  ← Many, Fast
              │   (Individual Functions)        │
              └─────────────────────────────────┘
```

### Test Categories

1. **Unit Tests** - Individual function/module testing
2. **Integration Tests** - API endpoint testing
3. **Security Tests** - Authentication, authorization, input validation
4. **Performance Tests** - Load testing, benchmarks
5. **End-to-End Tests** - Full user workflows

## Unit Testing

### Setup

```bash
# Run all unit tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_file_validation

# Run tests in parallel
cargo test -- --test-threads=4
```

### Test Structure

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_file_upload_success() {
        // Arrange
        let temp_dir = TempDir::new().unwrap();
        let file_service = FileService::new(temp_dir.path());
        let test_content = b"test file content";

        // Act
        let result = file_service
            .upload_file("test.txt", test_content)
            .await;

        // Assert
        assert!(result.is_ok());
        let file_path = result.unwrap();
        assert!(file_path.exists());
    }

    #[test]
    fn test_path_validation_rejects_traversal() {
        // Arrange
        let malicious_path = "../../../etc/passwd";

        // Act
        let result = validate_path(malicious_path);

        // Assert
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), PathError::Traversal);
    }
}
```

### Test Utilities

```rust
// tests/test_helpers.rs
use std::path::PathBuf;
use tempfile::TempDir;

pub struct TestContext {
    pub temp_dir: TempDir,
    pub config: Config,
    pub db: Database,
}

impl TestContext {
    pub async fn new() -> Self {
        let temp_dir = TempDir::new().unwrap();
        let config = Config::test_config(temp_dir.path());
        let db = Database::in_memory().await.unwrap();

        Self { temp_dir, config, db }
    }

    pub fn create_test_file(&self, name: &str, content: &[u8]) -> PathBuf {
        let file_path = self.temp_dir.path().join(name);
        std::fs::write(&file_path, content).unwrap();
        file_path
    }
}

#[macro_export]
macro_rules! assert_error_type {
    ($result:expr, $error_type:pat) => {
        match $result {
            Err($error_type) => (),
            _ => panic!("Expected error type didn't match"),
        }
    };
}
```

## Integration Testing

### HTTP Client Testing

```rust
// tests/api_tests.rs
use reqwest::Client;
use serde_json::json;

#[tokio::test]
async fn test_file_upload_api() {
    // Start test server
    let server = spawn_test_server().await;
    let client = Client::new();
    let base_url = format!("http://127.0.0.1:{}", server.port());

    // Login to get token
    let login_response = client
        .post(&format!("{}/api/auth/login", base_url))
        .json(&json!({
            "username": "test@example.com",
            "password": "password123"
        }))
        .send()
        .await
        .unwrap();

    let token = login_response
        .json::<LoginResponse>()
        .await
        .unwrap()
        .access_token;

    // Upload file
    let file_content = "test file content";
    let form = reqwest::multipart::Form::new()
        .text("path", "/uploads")
        .part("file",
            reqwest::multipart::Part::text(file_content)
                .file_name("test.txt")
        );

    let upload_response = client
        .post(&format!("{}/api/files/upload", base_url))
        .bearer_auth(&token)
        .multipart(form)
        .send()
        .await
        .unwrap();

    assert_eq!(upload_response.status(), 200);

    let upload_result: UploadResponse = upload_response
        .json()
        .await
        .unwrap();

    assert_eq!(upload_result.uploaded.len(), 1);
    assert_eq!(upload_result.uploaded[0].name, "test.txt");
}
```

### Database Testing

```rust
#[tokio::test]
async fn test_user_authentication() {
    let db = Database::in_memory().await.unwrap();
    let auth_service = AuthService::new(db.clone());

    // Create test user
    let user = User {
        username: "test@example.com".to_string(),
        password_hash: hash_password("password123").unwrap(),
        role: Role::User,
    };

    db.create_user(user).await.unwrap();

    // Test login
    let result = auth_service
        .login("test@example.com", "password123")
        .await;

    assert!(result.is_ok());
    let token = result.unwrap();
    assert!(!token.is_empty());

    // Test invalid password
    let result = auth_service
        .login("test@example.com", "wrong_password")
        .await;

    assert!(result.is_err());
}
```

## Security Testing

### Authentication Tests

```rust
#[tokio::test]
async fn test_jwt_token_validation() {
    let jwt_secret = "test_secret_key_256_bits_minimum_length";
    let auth_service = AuthService::new(jwt_secret);

    // Test valid token
    let token = auth_service.create_token("user123", Role::User).unwrap();
    let claims = auth_service.validate_token(&token).unwrap();
    assert_eq!(claims.sub, "user123");

    // Test expired token
    let expired_token = create_expired_token();
    let result = auth_service.validate_token(&expired_token);
    assert_error_type!(result, AuthError::TokenExpired);

    // Test invalid signature
    let tampered_token = token.replace("a", "b");
    let result = auth_service.validate_token(&tampered_token);
    assert_error_type!(result, AuthError::InvalidToken);
}
```

### Path Security Tests

```rust
#[test]
fn test_path_traversal_prevention() {
    let test_cases = vec![
        ("../../../etc/passwd", false),
        ("..\\..\\windows\\system32", false),
        ("/documents/report.pdf", true),
        ("./valid/file.txt", true),
        ("valid_file.txt", true),
        ("file\0.txt", false), // Null byte injection
        ("very_long_path_".repeat(100).as_str(), false), // Length limit
    ];

    for (path, should_be_valid) in test_cases {
        let result = validate_file_path(path);
        assert_eq!(result.is_ok(), should_be_valid, "Failed for path: {}", path);
    }
}
```

### Input Validation Tests

```rust
#[test]
fn test_file_upload_validation() {
    let validator = FileUploadValidator::new();

    // Test file size limits
    let large_file = vec![0u8; 200 * 1024 * 1024]; // 200MB
    let result = validator.validate_upload("large.bin", &large_file);
    assert_error_type!(result, ValidationError::FileTooLarge);

    // Test forbidden file types
    let exe_content = b"MZ\x90\x00"; // PE header
    let result = validator.validate_upload("malware.exe", exe_content);
    assert_error_type!(result, ValidationError::ForbiddenFileType);

    // Test filename validation
    let invalid_names = vec![
        "",           // Empty
        "con.txt",    // Reserved name (Windows)
        "file\0.txt", // Null byte
        "a".repeat(300).as_str(), // Too long
    ];

    for name in invalid_names {
        let result = validator.validate_filename(name);
        assert!(result.is_err(), "Should reject filename: {}", name);
    }
}
```

## Performance Testing

### Benchmarks

```rust
// benches/file_operations.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use std::time::Duration;

fn benchmark_file_upload(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let file_service = FileService::new("/tmp/benchmark");

    c.bench_function("file_upload_1mb", |b| {
        let content = vec![0u8; 1024 * 1024]; // 1MB
        b.to_async(&rt).iter(|| async {
            let result = file_service
                .upload_file("benchmark.bin", &content)
                .await;
            black_box(result.unwrap());
        });
    });
}

fn benchmark_file_search(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let search_service = SearchService::new("/tmp/search_index");

    c.bench_function("search_query", |b| {
        b.to_async(&rt).iter(|| async {
            let results = search_service
                .search("test query")
                .await;
            black_box(results.unwrap());
        });
    });
}

criterion_group!(benches, benchmark_file_upload, benchmark_file_search);
criterion_main!(benches);
```

### Load Testing

```rust
#[tokio::test]
async fn test_concurrent_uploads() {
    let server = spawn_test_server().await;
    let base_url = format!("http://127.0.0.1:{}", server.port());

    // Simulate 50 concurrent uploads
    let tasks: Vec<_> = (0..50)
        .map(|i| {
            let url = base_url.clone();
            tokio::spawn(async move {
                let client = reqwest::Client::new();
                let content = format!("test content {}", i);

                let form = reqwest::multipart::Form::new()
                    .part("file",
                        reqwest::multipart::Part::text(content)
                            .file_name(format!("test_{}.txt", i))
                    );

                client
                    .post(&format!("{}/api/files/upload", url))
                    .multipart(form)
                    .send()
                    .await
            })
        })
        .collect();

    let results = futures::future::join_all(tasks).await;

    // All uploads should succeed
    for result in results {
        let response = result.unwrap().unwrap();
        assert_eq!(response.status(), 200);
    }
}
```

## Test Configuration

### Test Environment

```toml
# config.test.toml
[server]
host = "127.0.0.1"
port = 0  # Use random available port

[storage]
home_directory = "./test_files"
max_upload_size = 10485760  # 10MB for faster tests

[auth]
jwt_secret = "test_secret_key_256_bits_minimum_length_here"
token_expiration = 3600  # 1 hour

[database]
url = ":memory:"  # In-memory SQLite for tests

[logging]
level = "debug"
```

### Test Fixtures

```rust
// tests/fixtures/mod.rs
pub struct TestUser {
    pub username: String,
    pub password: String,
    pub role: Role,
}

impl TestUser {
    pub fn admin() -> Self {
        Self {
            username: "admin@test.com".to_string(),
            password: "admin123".to_string(),
            role: Role::Admin,
        }
    }

    pub fn regular_user() -> Self {
        Self {
            username: "user@test.com".to_string(),
            password: "user123".to_string(),
            role: Role::User,
        }
    }
}

pub struct TestFiles;

impl TestFiles {
    pub fn small_text() -> (&'static str, &'static [u8]) {
        ("small.txt", b"Small test file content")
    }

    pub fn large_binary() -> (&'static str, Vec<u8>) {
        ("large.bin", vec![0u8; 5 * 1024 * 1024]) // 5MB
    }

    pub fn pdf_sample() -> (&'static str, &'static [u8]) {
        ("sample.pdf", include_bytes!("../fixtures/sample.pdf"))
    }
}
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          components: clippy, rustfmt

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Run tests
        run: cargo test --verbose

      - name: Run clippy
        run: cargo clippy -- -D warnings

      - name: Check formatting
        run: cargo fmt -- --check

      - name: Run security audit
        run: |
          cargo install cargo-audit
          cargo audit

      - name: Generate coverage
        run: |
          cargo install cargo-tarpaulin
          cargo tarpaulin --out xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Data Management

### Database Migrations for Tests

```sql
-- tests/migrations/001_test_users.sql
INSERT INTO users (id, username, password_hash, role, created_at) VALUES
('test-user-1', 'user@test.com', '$argon2id$...', 'user', datetime('now')),
('test-admin-1', 'admin@test.com', '$argon2id$...', 'admin', datetime('now'));
```

### Cleanup Strategy

```rust
impl Drop for TestContext {
    fn drop(&mut self) {
        // Cleanup is automatic with TempDir
        // But we can add custom cleanup if needed
        if let Err(e) = std::fs::remove_dir_all(&self.temp_dir.path()) {
            eprintln!("Failed to cleanup test directory: {}", e);
        }
    }
}
```

## Running Tests

### Local Development

```bash
# Run all tests
cargo test

# Run unit tests only
cargo test --lib

# Run integration tests only
cargo test --test '*'

# Run specific test file
cargo test --test api_tests

# Run with coverage
cargo tarpaulin --out html

# Run benchmarks
cargo bench
```

### Test Organization

```
tests/
├── unit/                    # Unit tests (if separated)
├── integration/            # Integration tests
│   ├── api_tests.rs       # API endpoint tests
│   ├── auth_tests.rs      # Authentication tests
│   └── file_tests.rs      # File operation tests
├── fixtures/              # Test data
│   ├── sample.pdf
│   ├── test_image.jpg
│   └── test_config.toml
├── helpers/               # Test utilities
│   ├── mod.rs
│   ├── server.rs         # Test server setup
│   └── assertions.rs     # Custom assertions
└── performance/          # Performance tests
    ├── load_tests.rs
    └── benchmarks.rs
```
