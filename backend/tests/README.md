# FileDash Backend Tests

This directory contains automated tests for the FileDash backend API. These tests validate endpoint functionality and ensure the backend operates correctly.

## Test Structure

- **api_tests.rs**: Integration tests for all API endpoints (auth, files, search)
- **test_helpers.rs**: Utilities for setting up test servers and environments
- **config/test_config.toml**: Test-specific configuration file

## Requirements

Before running tests, ensure you have:

1. Rust installed (recommended: rustup)
2. Required dependencies (`reqwest` with JSON and multipart features)
3. Test files directory writable by the current user

## Running Tests

### Running all tests locally

From the backend directory:

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific tests
cargo test test_auth_login -- --nocapture
```

### Running API tests only

```bash
# Run only API tests
cargo test --test api_tests

# Run with output
cargo test --test api_tests -- --nocapture
```

### Running a specific API test

```bash
# Run only file operations test
cargo test --test api_tests test_file_operations -- --nocapture
```

## What's Being Tested

1. **Authentication**

   - Login with valid/invalid credentials
   - Token validation
   - Authentication middleware

2. **File Operations**

   - Listing files
   - Uploading files
   - Downloading files
   - Renaming files
   - Moving files
   - Deleting files

3. **Search**
   - Finding files by name/content
   - Proper result ranking

## Continuous Integration

These tests run automatically in CI via GitHub Actions when:

- Code is pushed to main
- A pull request is opened against main

See `.github/workflows/rust-tests.yml` for CI configuration.

## Troubleshooting

- **Port conflicts**: Tests use port 8123 by default. If there's a conflict, modify `tests/config/test_config.toml`
- **Permission issues**: Ensure the test directory is writable
- **Slow tests**: Tests run servers, which might be slow to start. Adjust the wait times in `wait_for_server` function if needed
