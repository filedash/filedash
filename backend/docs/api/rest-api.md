# REST API Reference

The FileDash backend provides a RESTful API for file operations, authentication, and search functionality.

## Base URL

```
http://localhost:8080/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

## File Operations

### List Files and Directories

```http
GET /api/files?path={path}&page={page}&limit={limit}
```

**Parameters:**

- `path` (optional): Directory path to list (default: root)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 100)

**Response:**

```json
{
  "files": [
    {
      "name": "document.pdf",
      "path": "/documents/document.pdf",
      "size": 1024576,
      "modified": "2025-06-22T10:30:00Z",
      "is_directory": false,
      "permissions": "rw-r--r--",
      "mime_type": "application/pdf"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 100
}
```

### Download File

```http
GET /api/files/download/{path}
```

**Parameters:**

- `path`: URL-encoded file path

**Response:**

- File content with appropriate headers
- Supports range requests for resumable downloads

### Upload Files

```http
POST /api/files/upload
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: File content (multiple files supported)
- `path` (optional): Target directory path

**Response:**

```json
{
  "uploaded": [
    {
      "name": "uploaded_file.txt",
      "path": "/uploads/uploaded_file.txt",
      "size": 2048
    }
  ],
  "errors": []
}
```

### Delete File/Directory

```http
DELETE /api/files/{path}
```

**Parameters:**

- `path`: URL-encoded file or directory path

**Response:**

```json
{
  "message": "File deleted successfully",
  "path": "/documents/old_file.txt"
}
```

### Rename/Move File

```http
PUT /api/files/rename
Content-Type: application/json
```

**Request Body:**

```json
{
  "from": "/documents/old_name.txt",
  "to": "/documents/new_name.txt"
}
```

**Response:**

```json
{
  "message": "File renamed successfully",
  "from": "/documents/old_name.txt",
  "to": "/documents/new_name.txt"
}
```

### Create Directory

```http
POST /api/files/mkdir
Content-Type: application/json
```

**Request Body:**

```json
{
  "path": "/new_directory",
  "recursive": true
}
```

## Search

### Search Files

```http
GET /api/search?q={query}&path={path}&type={type}
```

**Parameters:**

- `q`: Search query (supports fuzzy matching)
- `path` (optional): Limit search to specific directory
- `type` (optional): Filter by file type (file, directory, or both)

**Response:**

```json
{
  "results": [
    {
      "name": "matching_file.txt",
      "path": "/documents/matching_file.txt",
      "score": 0.95,
      "size": 1024,
      "modified": "2025-06-22T10:30:00Z"
    }
  ],
  "query": "matching",
  "total": 5
}
```

## Health Check

### Server Health

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 3600,
  "storage": {
    "available": 1073741824,
    "total": 10737418240
  }
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `413 Payload Too Large` - File too large
- `500 Internal Server Error` - Server error

## Rate Limiting

API requests are limited to prevent abuse:

- **File Operations**: 100 requests per minute per user
- **Search**: 30 requests per minute per user
- **Upload**: 10 requests per minute per user

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Examples

### Upload a file with curl

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/local/file.txt" \
  -F "path=/uploads" \
  http://localhost:8080/api/files/upload
```

### Search for files

```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/search?q=report&type=file"
```

### Download a file

```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  -O \
  http://localhost:8080/api/files/download/documents/report.pdf
```
