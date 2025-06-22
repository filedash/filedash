# Authentication & Authorization

FileDash uses JWT (JSON Web Tokens) for stateless authentication and role-based authorization.

## Authentication Flow

### 1. User Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Request:**

```json
{
  "username": "user@example.com",
  "password": "secure_password"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "123",
    "username": "user@example.com",
    "role": "user",
    "permissions": ["read", "write"]
  }
}
```

### 2. Token Usage

Include the JWT token in the Authorization header for protected endpoints:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Token Refresh

```http
POST /api/auth/refresh
Authorization: Bearer <current_token>
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

### 4. Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Successfully logged out"
}
```

## JWT Token Structure

### Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload

```json
{
  "sub": "user_id",
  "username": "user@example.com",
  "role": "user",
  "permissions": ["read", "write"],
  "exp": 1640995200,
  "iat": 1640908800
}
```

## User Roles & Permissions

### Admin Role

- **Permissions**: `["read", "write", "delete", "admin"]`
- **Access**: All files and directories
- **Capabilities**:
  - Full file system access
  - User management
  - System configuration
  - View audit logs

### User Role

- **Permissions**: `["read", "write"]`
- **Access**: Limited to user's home directory and shared folders
- **Capabilities**:
  - Read/write files in allowed directories
  - Upload files (within quota)
  - Create directories
  - Search files

### Guest Role

- **Permissions**: `["read"]`
- **Access**: Read-only access to public directories
- **Capabilities**:
  - View and download files
  - Search public files
  - No upload or modification rights

## Path-Based Authorization

Access control is enforced at the path level:

```rust
// Example authorization rules
/home/{user_id}/*     -> User can access their own directory
/shared/*             -> All authenticated users can access
/public/*             -> Everyone (including guests) can access
/admin/*              -> Admin role required
```

## Authentication Middleware

The authentication middleware:

1. **Extracts JWT** from Authorization header
2. **Validates token** signature and expiration
3. **Loads user context** from token claims
4. **Enforces permissions** for the requested resource
5. **Handles errors** gracefully with appropriate HTTP status codes

### Middleware Flow

```
Request → Auth Middleware → Permission Check → Route Handler
```

## Security Configuration

### JWT Settings

```toml
[auth]
jwt_secret = "your-256-bit-secret"      # Must be 256+ bits for HS256
token_expiration = 86400                # 24 hours in seconds
refresh_threshold = 3600                # Refresh if expires within 1 hour
enable_auth = true                      # Global auth toggle

[security]
max_login_attempts = 5                  # Account lockout threshold
lockout_duration = 300                  # 5 minutes lockout
password_min_length = 8                 # Minimum password length
require_special_chars = true            # Password complexity
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": "unauthorized",
  "message": "Invalid or missing authentication token",
  "code": 4001
}
```

### 403 Forbidden

```json
{
  "error": "forbidden",
  "message": "Insufficient permissions for this resource",
  "code": 4003
}
```

### 422 Token Expired

```json
{
  "error": "token_expired",
  "message": "JWT token has expired",
  "code": 4022
}
```

## Best Practices

### Token Management

- **Store tokens securely** (httpOnly cookies or secure storage)
- **Implement token rotation** for long-lived sessions
- **Use short expiration times** with refresh mechanisms
- **Validate tokens** on every request

### Password Security

- **Hash passwords** with Argon2 or bcrypt
- **Enforce strong passwords** with complexity requirements
- **Implement rate limiting** for login attempts
- **Use secure password reset** flows

### API Security

- **Always use HTTPS** in production
- **Validate all inputs** to prevent injection attacks
- **Implement CORS** properly for browser clients
- **Log security events** for monitoring

## Testing Authentication

### Test Login

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"password"}' \
  http://localhost:8080/api/auth/login
```

### Test Protected Endpoint

```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/files
```

### Test Token Expiration

```bash
# Use an expired token
curl -X GET \
  -H "Authorization: Bearer expired_token" \
  http://localhost:8080/api/files
```
