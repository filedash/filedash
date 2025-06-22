# Security Overview

FileDash backend implements multiple layers of security to protect against common threats and ensure safe file operations.

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│                    Network Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │     TLS     │  │  Firewall   │  │  Rate Limit │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                 Application Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │     JWT     │  │    CORS     │  │ Input Valid │         │
│  │    Auth     │  │ Protection  │  │  ation      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   File System Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Path     │  │ Permission  │  │   Sandbox   │         │
│  │ Validation  │  │   Control   │  │   Access    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### JWT Token Security

**Token Generation:**

- Uses HS256 algorithm with 256-bit secret
- Includes user ID, role, and permissions
- Configurable expiration time (default: 24 hours)
- Includes issued-at timestamp for validation

**Token Validation:**

- Signature verification on every request
- Expiration time checking
- Issuer validation
- Optional token blacklisting support

**Best Practices:**

```rust
// Example secure JWT configuration
[auth]
jwt_secret = "32-byte-minimum-secret-key-here"
token_expiration = 86400  # 24 hours
algorithm = "HS256"
issuer = "filedash"
audience = "filedash-users"
```

### Role-Based Access Control (RBAC)

**Permission System:**

- `read` - View files and directories
- `write` - Create, modify files
- `delete` - Remove files and directories
- `admin` - System administration

**Access Control Matrix:**
| Resource Type | Guest | User | Admin |
|---------------|-------|------|-------|
| Public Files | R | RW | RWD |
| User Files | - | RW | RWD |
| System Files | - | - | RWD |
| Admin Panel | - | - | RWD |

## Input Validation & Sanitization

### Path Validation

**Security Measures:**

- Path traversal prevention (`../`, `..\\`)
- Null byte injection protection
- Unicode normalization
- Length limitations
- Character allowlist validation

```rust
// Example path validation
fn validate_path(path: &str) -> Result<PathBuf, SecurityError> {
    // Normalize path
    let normalized = path_clean::clean(path);

    // Check for traversal attempts
    if normalized.contains("..") {
        return Err(SecurityError::PathTraversal);
    }

    // Validate characters
    if !is_safe_path(&normalized) {
        return Err(SecurityError::InvalidCharacters);
    }

    Ok(PathBuf::from(normalized))
}
```

### File Upload Security

**Validation Layers:**

1. **File Size Limits** - Prevent DoS via large uploads
2. **MIME Type Validation** - Check file content vs. extension
3. **Content Scanning** - Basic malware detection
4. **Filename Sanitization** - Remove dangerous characters
5. **Extension Filtering** - Allow/deny specific file types

```toml
[security.uploads]
max_file_size = 104857600  # 100MB
allowed_extensions = ["jpg", "png", "pdf", "txt", "md"]
denied_extensions = ["exe", "bat", "cmd", "com"]
scan_content = true
quarantine_suspicious = true
```

## File System Security

### Sandboxing

**Chroot-like Isolation:**

- All file operations restricted to configured root directory
- Symlink following restrictions
- Mount point traversal prevention
- Temporary file isolation

**Implementation:**

```rust
pub struct SecureFileSystem {
    root: PathBuf,
    allowed_paths: Vec<PathBuf>,
}

impl SecureFileSystem {
    pub fn resolve_path(&self, user_path: &str) -> Result<PathBuf> {
        let full_path = self.root.join(user_path);

        // Ensure path is within sandbox
        if !full_path.starts_with(&self.root) {
            return Err(SecurityError::OutsideSandbox);
        }

        // Check allowed paths
        if !self.is_path_allowed(&full_path) {
            return Err(SecurityError::AccessDenied);
        }

        Ok(full_path)
    }
}
```

### Permission Enforcement

**File System Permissions:**

- Read/write/execute validation
- Owner/group checking
- ACL support where available
- Permission inheritance

**Application-Level Permissions:**

- User-specific directory access
- Shared folder permissions
- Admin-only system directories
- Temporary access grants

## Network Security

### TLS/HTTPS

**Configuration:**

```toml
[server.tls]
enabled = true
cert_file = "/path/to/cert.pem"
key_file = "/path/to/key.pem"
min_version = "1.2"
ciphers = ["ECDHE-RSA-AES256-GCM-SHA384", "ECDHE-RSA-AES128-GCM-SHA256"]
```

**Security Headers:**

```rust
// Applied to all responses
headers.insert("X-Content-Type-Options", "nosniff");
headers.insert("X-Frame-Options", "DENY");
headers.insert("X-XSS-Protection", "1; mode=block");
headers.insert("Strict-Transport-Security", "max-age=63072000");
headers.insert("Content-Security-Policy", "default-src 'self'");
```

### CORS Protection

**Configuration:**

```toml
[security.cors]
allowed_origins = ["https://yourdomain.com"]
allowed_methods = ["GET", "POST", "PUT", "DELETE"]
allowed_headers = ["Authorization", "Content-Type"]
max_age = 3600
credentials = true
```

### Rate Limiting

**Implementation:**

- Token bucket algorithm
- Per-IP and per-user limits
- Different limits for different endpoints
- Sliding window support

```toml
[security.rate_limiting]
enabled = true
requests_per_minute = 60
burst_size = 10
window_size = 60

# Endpoint-specific limits
[security.rate_limiting.endpoints]
"/api/auth/login" = { requests = 5, window = 300 }  # 5 attempts per 5 minutes
"/api/files/upload" = { requests = 10, window = 60 }  # 10 uploads per minute
```

## Data Protection

### Encryption

**Data at Rest:**

- File content encryption (optional)
- Database encryption
- Configuration file encryption
- Backup encryption

**Data in Transit:**

- TLS 1.2+ enforcement
- Certificate pinning support
- HSTS headers
- Secure cookie attributes

### Password Security

**Hashing:**

```rust
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};

pub fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string();

    Ok(password_hash)
}
```

**Requirements:**

- Minimum 8 characters
- Mixed case letters
- Numbers and special characters
- No common passwords
- Password history checking

## Audit & Logging

### Security Event Logging

**Logged Events:**

- Authentication attempts (success/failure)
- Authorization failures
- File access/modifications
- Configuration changes
- Security violations

**Log Format:**

```json
{
  "timestamp": "2025-06-22T14:30:00Z",
  "level": "WARN",
  "event": "auth_failure",
  "user_id": "user123",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "details": {
    "reason": "invalid_password",
    "attempts": 3
  }
}
```

### File Access Auditing

**Tracked Operations:**

- File reads/downloads
- File writes/uploads
- File deletions
- Directory listings
- Permission changes

## Threat Mitigation

### Common Vulnerabilities

**Path Traversal (CWE-22):**

- Input validation
- Path canonicalization
- Sandbox enforcement

**File Upload Vulnerabilities:**

- MIME type validation
- Content scanning
- File size limits
- Execution prevention

**Injection Attacks:**

- Input sanitization
- Parameterized queries
- Output encoding
- Content Security Policy

**Authentication Bypass:**

- Strong JWT secrets
- Token expiration
- Secure session management
- Multi-factor authentication support

### Security Testing

**Automated Testing:**

```bash
# Security test suite
cargo test security_tests

# Dependency vulnerability scanning
cargo audit

# Static analysis
cargo clippy -- -W clippy::security
```

**Manual Testing:**

- Penetration testing
- Code review
- Configuration review
- Access control testing

## Incident Response

### Security Monitoring

**Alerting Triggers:**

- Multiple failed login attempts
- Unusual file access patterns
- Large upload attempts
- Administrative actions
- Error rate spikes

**Response Procedures:**

1. **Detection** - Automated monitoring alerts
2. **Assessment** - Analyze threat severity
3. **Containment** - Block/limit suspicious activity
4. **Eradication** - Remove threat source
5. **Recovery** - Restore normal operations
6. **Lessons Learned** - Update security measures

### Backup & Recovery

**Security Considerations:**

- Encrypted backups
- Offsite storage
- Access control for backups
- Recovery testing
- Incident documentation

## Compliance

### Data Protection

**GDPR Compliance:**

- Data minimization
- Purpose limitation
- User consent
- Right to deletion
- Data portability

**SOC 2 Controls:**

- Access control
- System monitoring
- Data encryption
- Incident response
- Vendor management

### Security Standards

**ISO 27001 Alignment:**

- Information security policy
- Risk management
- Security awareness
- Access control
- Cryptography
- System security
- Incident management

## Security Configuration Checklist

### Production Deployment

- [ ] Strong JWT secret (256+ bits)
- [ ] HTTPS/TLS enabled
- [ ] Secure headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] File upload restrictions
- [ ] Audit logging enabled
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Access control tested
- [ ] Security monitoring active
- [ ] Incident response plan ready
