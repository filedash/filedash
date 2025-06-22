# API Documentation

Complete API reference for the FileDash backend.

## Core APIs

### [REST API Reference](./rest-api.md)

Complete documentation of all HTTP endpoints, request/response formats, and examples.

### [Authentication](./authentication.md)

JWT-based authentication system, user roles, and authorization mechanisms.

### [File Operations](./file-operations.md)

File and directory management endpoints including upload, download, and metadata operations.

### [Search API](./search.md)

Full-text search capabilities with fuzzy matching, filters, and indexing.

### [Error Handling](./error-handling.md)

Comprehensive error codes, response formats, and client handling strategies.

## Quick Reference

### Authentication Headers

```http
Authorization: Bearer <jwt_token>
```

### Common Response Format

```json
{
  "data": {},
  "error": null,
  "request_id": "uuid"
}
```

### Error Response Format

```json
{
  "error": "error_code",
  "message": "Description",
  "details": {},
  "request_id": "uuid"
}
```

## API Endpoints Summary

| Method | Endpoint                     | Description            |
| ------ | ---------------------------- | ---------------------- |
| POST   | `/api/auth/login`            | User authentication    |
| GET    | `/api/files`                 | List files/directories |
| POST   | `/api/files/upload`          | Upload files           |
| GET    | `/api/files/download/{path}` | Download file          |
| DELETE | `/api/files/{path}`          | Delete file/directory  |
| GET    | `/api/search`                | Search files           |
| GET    | `/health`                    | Health check           |

## Rate Limits

- **File Operations**: 100 requests/minute
- **Search**: 30 requests/minute
- **Authentication**: 10 requests/minute
- **Upload**: 5 requests/minute

## SDK Examples

### JavaScript/TypeScript

```typescript
const client = new FileDashClient({
  baseURL: 'http://localhost:8080',
  token: 'your-jwt-token',
});

const files = await client.files.list('/documents');
```

### Python

```python
import filedash

client = filedash.Client(
    base_url='http://localhost:8080',
    token='your-jwt-token'
)

files = client.files.list('/documents')
```

### Rust

```rust
use filedash_client::Client;

let client = Client::new("http://localhost:8080")
    .with_token("your-jwt-token");

let files = client.files().list("/documents").await?;
```
