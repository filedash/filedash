# FileDash Backend - Stage 2 Testing Guide

This guide provides step-by-step instructions to test all Stage 2 functionality of the FileDash backend.

## Stage 2 Features

Stage 2 adds authentication and authorization to the Stage 1 foundation:

- ✅ User authentication (JWT tokens)
- ✅ Password hashing (Argon2)
- ✅ Database layer (SQLite)
- ✅ User registration (admin-only)
- ✅ Login/logout functionality
- ✅ Protected API endpoints
- ✅ Role-based access control
- ✅ Session management
- ✅ Token blacklisting
- ✅ Current user information endpoint

## Prerequisites

- **Rust** 1.70+ installed
- **curl** for API testing
- **jq** for JSON formatting (recommended)
- **All Stage 1 functionality** working correctly

Install jq if not available:

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Windows (using choco)
choco install jq
```

## Default Admin Account

Stage 2 automatically creates a default admin account during first startup:

- **Email:** `admin@filedash.local`
- **Password:** `admin123`
- **Role:** `admin`

⚠️ **Security Note:** Change this password in production!

## Setup & Start Server

1. **Navigate to backend directory:**

   ```bash
   cd /path/to/filedash/backend
   ```

2. **Clean start (remove existing database):**

   ```bash
   rm -f data/filedash.db
   ```

3. **Build and start the server:**

   ```bash
   cargo run
   ```

   Expected output:

   ```
   2025-06-23T03:09:31.295879Z  INFO filedash::db::migrations: Default admin user created: admin@filedash.local / admin123
   2025-06-23T03:09:31.295879Z  WARN filedash::db::migrations: Please change the default admin password in production!
   2025-06-23T03:09:31.295879Z  INFO filedash::db::migrations: Database migrations completed successfully
   2025-06-23T03:09:31.297003Z  INFO filedash: Starting FileDash server on http://0.0.0.0:8080
   ```

   Keep this terminal open - the server needs to be running for all tests.

## Test Commands

Open a new terminal window for running the test commands while keeping the server running.

### 1. Health Check (Still Works)

Verify the health endpoint still works:

```bash
curl -v "http://localhost:8080/health"
```

**Expected Response:**

- Status: `200 OK`
- Body: `OK`

### 2. Authentication Tests

#### 2.1 Login with Valid Credentials

```bash
curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@filedash.local", "password": "admin123"}' | jq .
```

**Expected Response:**

```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid-here",
    "email": "admin@filedash.local",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-06-23T03:09:31Z"
  },
  "expires_at": "2025-06-24T03:09:31Z"
}
```

#### 2.2 Login with Invalid Credentials

```bash
curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@filedash.local", "password": "wrongpassword"}' | jq .
```

**Expected Response:**

```json
{
  "error": "unauthorized",
  "message": "Invalid credentials"
}
```

#### 2.3 Save Token for Further Tests

```bash
# Get token and save it for subsequent tests
TOKEN=$(curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@filedash.local", "password": "admin123"}' | jq -r '.token')

echo "Token saved: ${TOKEN:0:50}..."
```

### 3. Protected Endpoints - Current User Info

#### 3.1 Get Current User (With Valid Token)

```bash
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Response:**

```json
{
  "id": "uuid-here",
  "email": "admin@filedash.local",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-06-23T03:09:31Z"
}
```

#### 3.2 Get Current User (Without Token)

```bash
curl -s -X GET "http://localhost:8080/api/auth/me" | jq .
```

**Expected Response:**

```json
{
  "error": "unauthorized",
  "message": "Missing Authorization header"
}
```

#### 3.3 Get Current User (Invalid Token)

```bash
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer invalid-token" | jq .
```

**Expected Response:**

```json
{
  "error": "unauthorized",
  "message": "Invalid token: ..."
}
```

### 4. Protected File Operations

All file operations now require authentication.

#### 4.1 File Listing (With Authentication)

```bash
curl -s -X GET "http://localhost:8080/api/files" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Response:**

```json
{
  "files": [
    {
      "name": "documents",
      "path": "documents",
      "size": 128,
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

#### 4.2 File Listing (Without Authentication)

```bash
curl -s -X GET "http://localhost:8080/api/files" | jq .
```

**Expected Response:**

```json
{
  "error": "unauthorized",
  "message": "Missing Authorization header"
}
```

#### 4.3 File Upload (With Authentication)

```bash
# Create a test file
echo "This is a Stage 2 test upload" > /tmp/stage2_test.txt

# Upload with authentication
curl -s -X POST "http://localhost:8080/api/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/stage2_test.txt" | jq .
```

**Expected Response:**

```json
{
  "uploaded": [
    {
      "name": "stage2_test.txt",
      "path": "stage2_test.txt",
      "size": 29,
      "modified": {...},
      "is_directory": false,
      "mime_type": "text/plain"
    }
  ],
  "failed": []
}
```

#### 4.4 File Upload (Without Authentication)

```bash
curl -s -X POST "http://localhost:8080/api/files/upload" \
  -F "file=@/tmp/stage2_test.txt" | jq .
```

**Expected Response:**

```json
{
  "error": "unauthorized",
  "message": "Missing Authorization header"
}
```

#### 4.5 File Download (With Authentication)

```bash
curl -s -X GET "http://localhost:8080/api/files/download/welcome.txt" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**

- Status: `200 OK`
- Headers: `content-disposition: attachment; filename="welcome.txt"`
- Body: Contents of the welcome.txt file

#### 4.6 File Download (Without Authentication)

```bash
curl -s -X GET "http://localhost:8080/api/files/download/welcome.txt"
```

**Expected Response:**

```json
{
  "error": "unauthorized",
  "message": "Missing Authorization header"
}
```

#### 4.7 File Deletion (With Authentication)

```bash
curl -s -X DELETE "http://localhost:8080/api/files/stage2_test.txt" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Response:**

```json
{
  "message": "File deleted successfully",
  "path": "stage2_test.txt"
}
```

### 5. User Registration (Admin Only)

#### 5.1 Register New User (As Admin)

```bash
# For Linux/macOS (bash):
curl -s -X POST "http://localhost:8080/api/auth/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@filedash.local", "password": "password123", "role": "user"}' | jq .
```

**Expected Response:**

```json
{
  "id": "new-uuid-here",
  "email": "user@filedash.local",
  "role": "user",
  "is_active": true,
  "created_at": "2025-06-23T03:15:00Z"
}
```

#### 5.2 Register User (Without Authentication)

```bash
curl -s -X POST "http://localhost:8080/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@filedash.local",
    "password": "password123",
    "role": "user"
  }' | jq .
```

**Expected Response:**

```json
{
  "error": "unauthorized",
  "message": "Missing Authorization header"
}
```

#### 5.3 Test New User Login

```bash
curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@filedash.local", "password": "password123"}' | jq .
```

**Expected Response:**

```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@filedash.local",
    "role": "user",
    "is_active": true,
    "created_at": "2025-06-23T03:15:00Z"
  },
  "expires_at": "2025-06-24T03:15:00Z"
}
```

### 6. Logout Functionality

#### 6.1 Single Session Logout

```bash
# First, save current token
LOGOUT_TOKEN=$TOKEN

# Verify token works
echo "Before logout:"
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer $LOGOUT_TOKEN" | jq '.email'

# Logout
echo "Logging out..."
curl -s -X POST "http://localhost:8080/api/auth/logout" \
  -H "Authorization: Bearer $LOGOUT_TOKEN" | jq .

# Try to use token after logout
echo "After logout:"
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer $LOGOUT_TOKEN" | jq .
```

**Expected Response for Logout:**

```json
{
  "message": "Successfully logged out"
}
```

**Expected Response After Logout:**

```json
{
  "error": "unauthorized",
  "message": "Token has been revoked"
}
```

#### 6.2 Multiple Sessions Test

```bash
# Login twice to create two sessions
TOKEN_1=$(curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@filedash.local", "password": "admin123"}' | jq -r '.token')

TOKEN_2=$(curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@filedash.local", "password": "admin123"}' | jq -r '.token')

# Test both tokens work
echo "Token 1 works:"
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer $TOKEN_1" | jq '.email'

echo "Token 2 works:"
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer $TOKEN_2" | jq '.email'

# Logout from session 1
echo "Logging out from session 1..."
curl -s -X POST "http://localhost:8080/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN_1" | jq .

# Test tokens after logout
echo "Token 1 after logout (should fail):"
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer $TOKEN_1" | jq .

echo "Token 2 after logout (should still work):"
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer $TOKEN_2" | jq '.email'
```

### 7. Role-Based Access Control

#### 7.1 Admin Registration by Regular User (Should Fail)

```bash
# First login as regular user
USER_TOKEN=$(curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@filedash.local", "password": "password123"}' | jq -r '.token')

# Try to register a new user (should fail - not admin)
curl -s -X POST "http://localhost:8080/api/auth/register" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "another@filedash.local",
    "password": "password123",
    "role": "user"
  }' | jq .
```

**Expected Response:**

```json
{
  "error": "forbidden",
  "message": "Admin access required to create users"
}
```

### 8. Database Persistence

#### 8.1 Server Restart Test

```bash
# Login and save token
PERSIST_TOKEN=$(curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@filedash.local", "password": "admin123"}' | jq -r '.token')

echo "Token before restart: ${PERSIST_TOKEN:0:50}..."

# Verify it works
curl -s -X GET "http://localhost:8080/api/auth/me" \
  -H "Authorization: Bearer $PERSIST_TOKEN" | jq '.email'
```

Now stop the server (Ctrl+C in the server terminal), restart it with `cargo run`, then:

```bash
# Test if user data persisted
curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@filedash.local", "password": "password123"}' | jq '.user.email'

# Note: The old token will NOT work after restart due to JWT validation
# This is expected behavior - tokens don't survive server restarts
```

## Complete Test Script

Save this as `test_stage2.sh`:

```bash
#!/bin/bash

echo "🔐 FileDash Stage 2 Authentication Testing Script"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8080"

# Helper function to test endpoints
test_auth_endpoint() {
    local name="$1"
    local command="$2"
    local expected_pattern="$3"

    echo -n "Testing $name... "

    result=$(eval "$command" 2>/dev/null)
    if echo "$result" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo -e "${YELLOW}   Expected: $expected_pattern${NC}"
        echo -e "${YELLOW}   Got: $result${NC}"
        return 1
    fi
}

# 1. Health Check
test_auth_endpoint "Health Check" \
    "curl -s $BASE_URL/health" \
    "OK"

# 2. Login
echo -n "Getting admin token... "
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@filedash.local", "password": "admin123"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ SUCCESS${NC}"
else
    echo -e "${RED}❌ FAILED TO GET TOKEN${NC}"
    exit 1
fi

# 3. Authentication Tests
test_auth_endpoint "Login (Valid Credentials)" \
    "curl -s -X POST '$BASE_URL/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": \"admin@filedash.local\", \"password\": \"admin123\"}'" \
    "token"

test_auth_endpoint "Login (Invalid Credentials)" \
    "curl -s -X POST '$BASE_URL/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": \"admin@filedash.local\", \"password\": \"wrong\"}'" \
    "unauthorized"

test_auth_endpoint "Get Current User (With Token)" \
    "curl -s -X GET '$BASE_URL/api/auth/me' -H 'Authorization: Bearer $TOKEN'" \
    "admin@filedash.local"

test_auth_endpoint "Get Current User (No Token)" \
    "curl -s -X GET '$BASE_URL/api/auth/me'" \
    "unauthorized"

# 4. Protected File Operations
test_auth_endpoint "File Listing (With Auth)" \
    "curl -s -X GET '$BASE_URL/api/files' -H 'Authorization: Bearer $TOKEN'" \
    "files"

test_auth_endpoint "File Listing (No Auth)" \
    "curl -s -X GET '$BASE_URL/api/files'" \
    "unauthorized"

# 5. User Registration
test_auth_endpoint "Register User (Admin)" \
    "curl -s -X POST '$BASE_URL/api/auth/register' -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' -d '{\"email\": \"test@filedash.local\", \"password\": \"test123\", \"role\": \"user\"}'" \
    "test@filedash.local"

test_auth_endpoint "Register User (No Auth)" \
    "curl -s -X POST '$BASE_URL/api/auth/register' -H 'Content-Type: application/json' -d '{\"email\": \"fail@filedash.local\", \"password\": \"test123\", \"role\": \"user\"}'" \
    "unauthorized"

# 6. Logout
test_auth_endpoint "Logout" \
    "curl -s -X POST '$BASE_URL/api/auth/logout' -H 'Authorization: Bearer $TOKEN'" \
    "Successfully logged out"

# 7. File Upload Test
echo "This is a Stage 2 test file" > /tmp/stage2_test.txt

# Get fresh token after logout
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@filedash.local", "password": "admin123"}' | jq -r '.token')

test_auth_endpoint "File Upload (With Auth)" \
    "curl -s -X POST '$BASE_URL/api/files/upload' -H 'Authorization: Bearer $TOKEN' -F 'file=@/tmp/stage2_test.txt'" \
    "uploaded"

test_auth_endpoint "File Download (With Auth)" \
    "curl -s -X GET '$BASE_URL/api/files/download/stage2_test.txt' -H 'Authorization: Bearer $TOKEN'" \
    "Stage 2 test file"

test_auth_endpoint "File Deletion (With Auth)" \
    "curl -s -X DELETE '$BASE_URL/api/files/stage2_test.txt' -H 'Authorization: Bearer $TOKEN'" \
    "deleted successfully"

# Cleanup
rm -f /tmp/stage2_test.txt

echo ""
echo "🎉 Stage 2 Authentication testing complete!"
echo ""
echo "If all tests passed, Stage 2 is working correctly."
echo "Authentication and authorization are properly implemented."
```

Make it executable and run:

```bash
chmod +x test_stage2.sh
./test_stage2.sh
```

## Security Verification

### Password Hashing

Verify passwords are properly hashed by checking the database:

```bash
# Check that passwords are hashed (not stored in plain text)
sqlite3 data/filedash.db "SELECT email, password_hash FROM users;"
```

You should see hashed passwords starting with `$argon2id$`, not plain text.

### JWT Token Structure

Decode a JWT token to verify its structure:

```bash
# Get a token
TOKEN=$(curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@filedash.local", "password": "admin123"}' | jq -r '.token')

# Decode the payload (requires base64 and jq)
echo $TOKEN | cut -d. -f2 | base64 -d | jq .
```

Expected structure:

```json
{
  "sub": "user-uuid",
  "email": "admin@filedash.local",
  "role": "admin",
  "exp": 1750733805,
  "iat": 1750647405,
  "jti": "token-uuid"
}
```

## Troubleshooting

### Database Issues

1. **Database locked errors:**

   ```bash
   rm data/filedash.db
   cargo run
   ```

2. **Permission errors:**
   ```bash
   chmod -R u+rw data/
   ```

### Authentication Issues

1. **Token expired:**

   - Tokens expire after 24 hours by default
   - Login again to get a fresh token

2. **Invalid token format:**

   - Ensure Bearer prefix: `Authorization: Bearer <token>`
   - Check for extra spaces or newlines

3. **Database migration errors:**
   - Delete `data/filedash.db` and restart server

### Network Issues

1. **Connection refused:**

   - Ensure server is running with `cargo run`
   - Check that port 8080 is available

2. **CORS issues (if testing from browser):**
   - Use curl for testing
   - CORS is configured for development

## API Reference

### Authentication Endpoints

| Method | Endpoint             | Auth Required | Description           |
| ------ | -------------------- | ------------- | --------------------- |
| POST   | `/api/auth/login`    | No            | User login            |
| POST   | `/api/auth/logout`   | Yes           | User logout           |
| GET    | `/api/auth/me`       | Yes           | Get current user info |
| POST   | `/api/auth/register` | Yes (Admin)   | Register new user     |

### Protected File Endpoints

| Method | Endpoint                     | Auth Required | Description                              |
| ------ | ---------------------------- | ------------- | ---------------------------------------- |
| GET    | `/api/files`                 | Yes           | List files (optional `?path=` parameter) |
| POST   | `/api/files/upload`          | Yes           | Upload files (multipart form data)       |
| GET    | `/api/files/download/{path}` | Yes           | Download a file                          |
| DELETE | `/api/files/{path}`          | Yes           | Delete a file                            |

### Request/Response Formats

**Login Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login Response:**

```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin|user",
    "is_active": true,
    "created_at": "2025-06-23T03:09:31Z"
  },
  "expires_at": "2025-06-24T03:09:31Z"
}
```

**Error Response:**

```json
{
  "error": "error_code",
  "message": "Human readable message"
}
```

**Authentication Header:**

```
Authorization: Bearer <jwt-token>
```

---

**Note:** This testing guide is specifically for Stage 2. Ensure Stage 1 tests still pass before running Stage 2 tests.
