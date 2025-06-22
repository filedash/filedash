# FileDash Backend - Stage 1 Testing Guide

This guide provides step-by-step instructions to test all Stage 1 functionality of the FileDash backend.

## Stage 1 Features

Stage 1 includes the foundation and basic file operations:

- ✅ Health check endpoint
- ✅ File listing with metadata
- ✅ File upload (multipart)
- ✅ File download with proper headers
- ✅ File deletion
- ✅ Directory browsing
- ✅ Path traversal protection
- ✅ Error handling
- ✅ Static frontend serving

## Prerequisites

- **Rust** 1.70+ installed
- **curl** for API testing
- **jq** for JSON formatting (optional but recommended)

Install jq if not available:

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Windows (using choco)
choco install jq
```

## Setup & Start Server

1. **Navigate to backend directory:**

   ```bash
   cd /path/to/filedash/backend
   ```

2. **Build and start the server:**

   ```bash
   cargo run
   ```

   Expected output:

   ```
   2025-06-22T07:41:48.948908Z  INFO filedash: Starting FileDash server on http://0.0.0.0:8080
   ```

   Keep this terminal open - the server needs to be running for all tests.

## Test Commands

Open a new terminal window for running the test commands while keeping the server running.

### 1. Health Check

Test the basic health endpoint:

```bash
curl -v "http://localhost:8080/health"
```

**Expected Response:**

- Status: `200 OK`
- Body: `OK`

### 2. File Listing

List files in the root directory:

```bash
curl -s "http://localhost:8080/api/files" | jq .
```

**Expected Response:**

```json
{
  "files": [
    {
      "name": "documents",
      "path": "documents",
      "size": 96,
      "modified": {...},
      "is_directory": true,
      "mime_type": null
    },
    {
      "name": "welcome.txt",
      "path": "welcome.txt",
      "size": 350,
      "modified": {...},
      "is_directory": false,
      "mime_type": "text/plain"
    }
  ],
  "path": "/"
}
```

### 3. Directory Browsing

Browse a subdirectory:

```bash
curl -s "http://localhost:8080/api/files?path=documents" | jq .
```

**Expected Response:**

```json
{
  "files": [
    {
      "name": "sample.md",
      "path": "documents/sample.md",
      "size": 239,
      "modified": {...},
      "is_directory": false,
      "mime_type": "text/markdown"
    }
  ],
  "path": "documents"
}
```

### 4. File Download

Download a file:

```bash
curl -v "http://localhost:8080/api/files/download/welcome.txt"
```

**Expected Response:**

- Status: `200 OK`
- Headers: `content-disposition: attachment; filename="welcome.txt"`
- Body: Contents of the welcome.txt file

### 5. File Upload

Create a test file and upload it:

```bash
# Create a test file
echo "This is a test upload file." > /tmp/test_upload.txt

# Upload the file
curl -v -F "file=@/tmp/test_upload.txt" "http://localhost:8080/api/files/upload"
```

**Expected Response:**

```json
{
  "uploaded": [
    {
      "name": "test_upload.txt",
      "path": "test_upload.txt",
      "size": 28,
      "modified": {...},
      "is_directory": false,
      "mime_type": "text/plain"
    }
  ],
  "failed": []
}
```

**Verify Upload:**
List files again to confirm the upload:

```bash
curl -s "http://localhost:8080/api/files" | jq .
```

You should see `test_upload.txt` in the file list.

### 6. File Deletion

Delete the uploaded test file:

```bash
curl -v -X DELETE "http://localhost:8080/api/files/test_upload.txt"
```

**Expected Response:**

```json
{
  "message": "File deleted successfully",
  "path": "test_upload.txt"
}
```

**Verify Deletion:**
List files to confirm deletion:

```bash
curl -s "http://localhost:8080/api/files" | jq .
```

The `test_upload.txt` file should no longer be in the list.

### 7. Error Handling

Test error handling for non-existent file:

```bash
curl -s "http://localhost:8080/api/files/download/nonexistent.txt" | jq .
```

**Expected Response:**

```json
{
  "error": "file_not_found",
  "message": "File not found: nonexistent.txt",
  "details": {
    "path": "nonexistent.txt"
  }
}
```

### 8. Security - Path Traversal Protection

Test path traversal attack prevention:

```bash
curl -s "http://localhost:8080/api/files?path=../../../etc" | jq .
```

**Expected Response:**

```json
{
  "error": "invalid_path",
  "message": "Invalid path: ../../../etc",
  "details": {
    "path": "../../../etc"
  }
}
```

### 9. Static Frontend Serving

Test that the frontend is served correctly:

```bash
curl -s "http://localhost:8080/" | head -10
```

**Expected Response:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FileDash</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
```

## Complete Test Script

You can run all tests with this script:

```bash
#!/bin/bash

echo "🧪 FileDash Stage 1 Testing Script"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
    local name="$1"
    local command="$2"
    local expected_status="$3"

    echo -n "Testing $name... "

    if [ "$expected_status" = "200" ]; then
        if eval "$command" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PASS${NC}"
        else
            echo -e "${RED}❌ FAIL${NC}"
        fi
    else
        # For non-200 expected status, just run the command
        eval "$command" > /dev/null 2>&1
        echo -e "${GREEN}✅ DONE${NC}"
    fi
}

# Test all endpoints
test_endpoint "Health Check" "curl -s http://localhost:8080/health | grep -q OK" "200"
test_endpoint "File Listing" "curl -s http://localhost:8080/api/files | jq -e '.files'" "200"
test_endpoint "Directory Browse" "curl -s 'http://localhost:8080/api/files?path=documents' | jq -e '.files'" "200"
test_endpoint "File Download" "curl -s http://localhost:8080/api/files/download/welcome.txt | grep -q 'Welcome to FileDash'" "200"

# Upload test
echo "This is a test file" > /tmp/test_stage1.txt
test_endpoint "File Upload" "curl -s -F 'file=@/tmp/test_stage1.txt' http://localhost:8080/api/files/upload | jq -e '.uploaded[0]'" "200"

test_endpoint "File Deletion" "curl -s -X DELETE http://localhost:8080/api/files/test_stage1.txt | jq -e '.message'" "200"

test_endpoint "Error Handling" "curl -s http://localhost:8080/api/files/download/nonexistent.txt | jq -e '.error'" "404"

test_endpoint "Path Traversal Protection" "curl -s 'http://localhost:8080/api/files?path=../../../etc' | jq -e '.error'" "400"

test_endpoint "Frontend Serving" "curl -s http://localhost:8080/ | grep -q 'FileDash'" "200"

# Cleanup
rm -f /tmp/test_stage1.txt

echo ""
echo "🎉 Stage 1 testing complete!"
echo ""
echo "If all tests passed, Stage 1 is working correctly."
echo "You can now proceed to Stage 2 implementation."
```

Save this script as `test_stage1.sh`, make it executable, and run it:

```bash
chmod +x test_stage1.sh
./test_stage1.sh
```

## Troubleshooting

### Server Not Starting

1. **Check if port 8080 is already in use:**

   ```bash
   lsof -i :8080
   ```

2. **Use a different port:**
   ```bash
   FILEDASH_SERVER__PORT=8081 cargo run
   ```
   Then update test URLs to use port 8081.

### Connection Refused

1. **Ensure server is running** - Check that `cargo run` is still active
2. **Check server logs** for any error messages
3. **Try localhost instead of 127.0.0.1** or vice versa

### Permission Errors

1. **Check file permissions** in the `files/` directory:

   ```bash
   ls -la files/
   ```

2. **Ensure write permissions:**
   ```bash
   chmod -R u+rw files/
   ```

### JSON Parsing Errors

If you get jq errors, you can test without jq:

```bash
# Instead of:
curl -s "http://localhost:8080/api/files" | jq .

# Use:
curl -s "http://localhost:8080/api/files"
```

## Next Steps

Once all Stage 1 tests pass, you're ready to move to **Stage 2: Authentication & Authorization**.

Stage 2 will add:

- User registration and login
- JWT token authentication
- Protected routes
- User-specific file access
- Role-based permissions

## API Reference

### Endpoints Summary

| Method | Endpoint                     | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| GET    | `/health`                    | Health check                             |
| GET    | `/api/files`                 | List files (optional `?path=` parameter) |
| POST   | `/api/files/upload`          | Upload files (multipart form data)       |
| GET    | `/api/files/download/{path}` | Download a file                          |
| DELETE | `/api/files/{path}`          | Delete a file                            |
| GET    | `/`                          | Serve static frontend                    |

### Response Formats

**Success Response:**

```json
{
  "files": [...],
  "path": "/"
}
```

**Error Response:**

```json
{
  "error": "error_code",
  "message": "Human readable message",
  "details": {
    "additional": "context"
  }
}
```

---

**Note:** This testing guide is specifically for Stage 1. Future stages will have their own testing documentation.
