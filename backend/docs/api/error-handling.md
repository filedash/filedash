# Error Handling

FileDash backend uses a consistent error handling strategy with structured error responses and proper HTTP status codes.

## Error Response Format

All API errors follow a consistent JSON format:

```json
{
  "error": "error_code",
  "message": "Human-readable error description",
  "details": {
    "field": "additional_context",
    "timestamp": "2025-06-22T14:30:00Z"
  },
  "request_id": "uuid-1234-5678"
}
```

## HTTP Status Codes

### 2xx Success

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return

### 4xx Client Errors

- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required or invalid
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., file already exists)
- `413 Payload Too Large` - File or request too large
- `422 Unprocessable Entity` - Valid request, invalid data
- `429 Too Many Requests` - Rate limit exceeded

### 5xx Server Errors

- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - Service temporarily unavailable
- `507 Insufficient Storage` - Not enough disk space

## Common Error Codes

### Authentication Errors

**401 - invalid_token**

```json
{
  "error": "invalid_token",
  "message": "The provided authentication token is invalid or malformed",
  "details": {
    "token_type": "jwt",
    "reason": "signature_invalid"
  }
}
```

**401 - token_expired**

```json
{
  "error": "token_expired",
  "message": "Authentication token has expired",
  "details": {
    "expired_at": "2025-06-22T12:00:00Z",
    "current_time": "2025-06-22T14:30:00Z"
  }
}
```

**403 - insufficient_permissions**

```json
{
  "error": "insufficient_permissions",
  "message": "User does not have required permissions for this operation",
  "details": {
    "required_permissions": ["write"],
    "user_permissions": ["read"]
  }
}
```

### File Operation Errors

**404 - file_not_found**

```json
{
  "error": "file_not_found",
  "message": "The requested file or directory does not exist",
  "details": {
    "path": "/documents/nonexistent.txt",
    "operation": "read"
  }
}
```

**409 - file_exists**

```json
{
  "error": "file_exists",
  "message": "A file with this name already exists",
  "details": {
    "path": "/documents/existing_file.txt",
    "operation": "create"
  }
}
```

**413 - file_too_large**

```json
{
  "error": "file_too_large",
  "message": "File size exceeds the maximum allowed limit",
  "details": {
    "max_size": 104857600,
    "actual_size": 209715200,
    "filename": "large_file.zip"
  }
}
```

**422 - invalid_file_type**

```json
{
  "error": "invalid_file_type",
  "message": "File type is not allowed",
  "details": {
    "filename": "script.exe",
    "detected_type": "application/x-executable",
    "allowed_types": ["image/*", "application/pdf", "text/*"]
  }
}
```

**507 - insufficient_storage**

```json
{
  "error": "insufficient_storage",
  "message": "Not enough disk space available",
  "details": {
    "required_space": 104857600,
    "available_space": 52428800,
    "operation": "upload"
  }
}
```

### Path and Security Errors

**400 - invalid_path**

```json
{
  "error": "invalid_path",
  "message": "The provided path is invalid or contains illegal characters",
  "details": {
    "path": "../../../etc/passwd",
    "reason": "path_traversal_attempt"
  }
}
```

**403 - path_outside_sandbox**

```json
{
  "error": "path_outside_sandbox",
  "message": "Path is outside the allowed file system boundaries",
  "details": {
    "requested_path": "/root/sensitive_file.txt",
    "sandbox_root": "/app/files"
  }
}
```

### Validation Errors

**400 - validation_failed**

```json
{
  "error": "validation_failed",
  "message": "Request validation failed",
  "details": {
    "errors": [
      {
        "field": "filename",
        "message": "Filename cannot be empty",
        "code": "required"
      },
      {
        "field": "path",
        "message": "Path must be absolute",
        "code": "format"
      }
    ]
  }
}
```

### Rate Limiting Errors

**429 - rate_limit_exceeded**

```json
{
  "error": "rate_limit_exceeded",
  "message": "Request rate limit exceeded",
  "details": {
    "limit": 100,
    "window": 3600,
    "retry_after": 1800
  }
}
```

### Search Errors

**400 - invalid_search_query**

```json
{
  "error": "invalid_search_query",
  "message": "Search query syntax is invalid",
  "details": {
    "query": "unclosed[bracket",
    "position": 8,
    "expected": "closing bracket"
  }
}
```

**503 - search_unavailable**

```json
{
  "error": "search_unavailable",
  "message": "Search service is temporarily unavailable",
  "details": {
    "reason": "index_rebuilding",
    "estimated_completion": "2025-06-22T15:00:00Z"
  }
}
```

## Error Context

### Request Tracking

Each error response includes a unique `request_id` for tracking:

```json
{
  "error": "file_not_found",
  "message": "File does not exist",
  "request_id": "req_abc123def456",
  "details": {
    "path": "/missing/file.txt",
    "timestamp": "2025-06-22T14:30:00Z"
  }
}
```

### Error Logging

Server-side error logging includes additional context:

```rust
use tracing::{error, warn, info};

// Log error with context
error!(
    request_id = %request_id,
    user_id = %user.id,
    path = %requested_path,
    error = %err,
    "File operation failed"
);
```

## Client Error Handling

### Recommended Client Patterns

**JavaScript/TypeScript Example:**

```typescript
interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
  request_id?: string;
}

async function handleApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error.response?.data) {
      const apiError = error.response.data as ApiError;

      switch (apiError.error) {
        case 'token_expired':
          // Refresh token and retry
          await refreshToken();
          return apiCall();

        case 'file_not_found':
          // Show user-friendly message
          showNotification('File not found', 'error');
          break;

        case 'rate_limit_exceeded':
          // Wait and retry
          const retryAfter = apiError.details?.retry_after || 60;
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000)
          );
          return apiCall();

        default:
          // Generic error handling
          showNotification(apiError.message, 'error');
      }
    }

    throw error;
  }
}
```

### Retry Strategies

**Exponential Backoff:**

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Only retry on transient errors
      if (isRetryableError(error)) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

function isRetryableError(error: any): boolean {
  const retryableCodes = [
    'rate_limit_exceeded',
    'service_unavailable',
    'timeout',
    'network_error',
  ];

  return retryableCodes.includes(error.response?.data?.error);
}
```

## Error Prevention

### Input Validation

**Server-Side Validation:**

```rust
use serde::{Deserialize, Serialize};
use validator::{Validate, ValidationError};

#[derive(Deserialize, Validate)]
pub struct FileUploadRequest {
    #[validate(length(min = 1, max = 255))]
    pub filename: String,

    #[validate(custom = "validate_path")]
    pub path: String,

    #[validate(range(min = 1, max = 104857600))]
    pub size: u64,
}

fn validate_path(path: &str) -> Result<(), ValidationError> {
    if path.contains("..") {
        return Err(ValidationError::new("path_traversal"));
    }
    Ok(())
}
```

**Client-Side Validation:**

```typescript
function validateUpload(file: File, targetPath: string): string[] {
  const errors: string[] = [];

  if (file.size > 100 * 1024 * 1024) {
    errors.push('File size exceeds 100MB limit');
  }

  if (targetPath.includes('..')) {
    errors.push('Invalid path: contains path traversal');
  }

  const allowedTypes = ['image/', 'application/pdf', 'text/'];
  if (!allowedTypes.some((type) => file.type.startsWith(type))) {
    errors.push('File type not allowed');
  }

  return errors;
}
```

## Debugging

### Error Investigation

**Log Correlation:**

```bash
# Search logs by request ID
grep "req_abc123def456" /var/log/filedash/app.log

# Search by user ID
grep "user_id=user123" /var/log/filedash/app.log

# Search by error type
grep "file_not_found" /var/log/filedash/app.log
```

**Structured Logging:**

```json
{
  "timestamp": "2025-06-22T14:30:00Z",
  "level": "ERROR",
  "request_id": "req_abc123def456",
  "user_id": "user123",
  "endpoint": "/api/files/upload",
  "error": "file_too_large",
  "details": {
    "filename": "large_video.mp4",
    "size": 209715200,
    "max_size": 104857600
  },
  "stack_trace": "..."
}
```

### Performance Impact

**Error Monitoring:**

- Track error rates by endpoint
- Monitor error response times
- Alert on error spikes
- Measure client retry rates

**Metrics to Track:**

- Total errors per minute
- Error rate by status code
- Authentication failure rate
- File operation failure rate
- Search error frequency
