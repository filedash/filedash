# File Operations API

This document details all file-related API endpoints and their functionality.

## File Listing

### Get Directory Contents

```http
GET /api/files?path={path}&sort={sort}&order={order}&page={page}&limit={limit}
```

Lists files and directories in the specified path with optional sorting and pagination.

**Query Parameters:**

- `path` (string, optional): Directory path to list (default: "/")
- `sort` (string, optional): Sort field - `name`, `size`, `modified`, `type` (default: `name`)
- `order` (string, optional): Sort order - `asc`, `desc` (default: `asc`)
- `page` (integer, optional): Page number for pagination (default: 1)
- `limit` (integer, optional): Items per page, max 1000 (default: 100)

**Response:**

```json
{
  "path": "/documents",
  "files": [
    {
      "name": "report.pdf",
      "path": "/documents/report.pdf",
      "size": 2048576,
      "modified": "2025-06-22T14:30:00Z",
      "created": "2025-06-20T09:15:00Z",
      "is_directory": false,
      "is_hidden": false,
      "permissions": "rw-r--r--",
      "mime_type": "application/pdf",
      "extension": "pdf",
      "checksum": "sha256:abc123..."
    },
    {
      "name": "images",
      "path": "/documents/images",
      "size": 0,
      "modified": "2025-06-21T16:45:00Z",
      "created": "2025-06-21T16:45:00Z",
      "is_directory": true,
      "is_hidden": false,
      "permissions": "rwxr-xr-x",
      "children_count": 25
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 2,
    "pages": 1
  },
  "sort": {
    "field": "name",
    "order": "asc"
  }
}
```

## File Download

### Download Single File

```http
GET /api/files/download/{path}
```

Downloads a file with support for range requests and streaming.

**Path Parameters:**

- `path` (string): URL-encoded file path

**Headers:**

- `Range` (optional): Byte range for partial downloads
- `If-None-Match` (optional): ETag for cache validation

**Response Headers:**

- `Content-Type`: File MIME type
- `Content-Length`: File size in bytes
- `Content-Disposition`: attachment; filename="filename.ext"
- `ETag`: File checksum for caching
- `Accept-Ranges`: bytes
- `Last-Modified`: File modification date

**Response:**

- `200 OK`: Full file content
- `206 Partial Content`: Range request response
- `304 Not Modified`: File hasn't changed (cache hit)

### Bulk Download (Archive)

```http
POST /api/files/download/archive
Content-Type: application/json
```

Creates and downloads a ZIP archive of multiple files/directories.

**Request Body:**

```json
{
  "paths": ["/documents/report.pdf", "/images/photo.jpg", "/data/"],
  "format": "zip",
  "compression": "fast"
}
```

**Parameters:**

- `paths` (array): List of file/directory paths to include
- `format` (string, optional): Archive format - `zip`, `tar`, `tar.gz` (default: `zip`)
- `compression` (string, optional): Compression level - `none`, `fast`, `best` (default: `fast`)

## File Upload

### Single File Upload

```http
POST /api/files/upload
Content-Type: multipart/form-data
```

Uploads one or more files to the specified directory.

**Form Fields:**

- `files`: One or more file inputs
- `path` (optional): Target directory path (default: "/")
- `overwrite` (optional): Overwrite existing files (default: false)
- `create_path` (optional): Create directory path if it doesn't exist (default: true)

**Response:**

```json
{
  "uploaded": [
    {
      "name": "document.pdf",
      "path": "/uploads/document.pdf",
      "size": 1024576,
      "checksum": "sha256:def456...",
      "mime_type": "application/pdf"
    }
  ],
  "failed": [
    {
      "name": "large_file.zip",
      "error": "File size exceeds maximum allowed size",
      "code": "FILE_TOO_LARGE"
    }
  ],
  "summary": {
    "total_files": 2,
    "successful": 1,
    "failed": 1,
    "total_size": 1024576
  }
}
```

### Chunked Upload (Large Files)

```http
POST /api/files/upload/chunked
Content-Type: multipart/form-data
```

Uploads large files in chunks with resumable capability.

**Form Fields:**

- `chunk`: File chunk data
- `filename`: Original filename
- `chunk_index`: Chunk number (0-based)
- `total_chunks`: Total number of chunks
- `upload_id`: Unique upload session ID
- `chunk_size`: Size of this chunk

**Response:**

```json
{
  "upload_id": "uuid-1234-5678",
  "chunk_index": 0,
  "received": true,
  "next_chunk": 1,
  "completed": false
}
```

## File Operations

### Create Directory

```http
POST /api/files/mkdir
Content-Type: application/json
```

Creates a new directory.

**Request Body:**

```json
{
  "path": "/new/directory/path",
  "recursive": true,
  "permissions": "755"
}
```

**Response:**

```json
{
  "message": "Directory created successfully",
  "path": "/new/directory/path",
  "permissions": "rwxr-xr-x"
}
```

### Rename/Move File

```http
PUT /api/files/move
Content-Type: application/json
```

Renames or moves a file/directory.

**Request Body:**

```json
{
  "from": "/old/path/file.txt",
  "to": "/new/path/renamed_file.txt",
  "overwrite": false
}
```

**Response:**

```json
{
  "message": "File moved successfully",
  "from": "/old/path/file.txt",
  "to": "/new/path/renamed_file.txt"
}
```

### Copy File

```http
POST /api/files/copy
Content-Type: application/json
```

Copies a file or directory.

**Request Body:**

```json
{
  "from": "/source/file.txt",
  "to": "/destination/file_copy.txt",
  "overwrite": false,
  "recursive": true
}
```

### Delete File/Directory

```http
DELETE /api/files/{path}?recursive={recursive}&permanent={permanent}
```

Deletes a file or directory.

**Path Parameters:**

- `path`: URL-encoded file/directory path

**Query Parameters:**

- `recursive` (boolean, optional): Delete directory recursively (default: false)
- `permanent` (boolean, optional): Permanent deletion, skip trash (default: false)

**Response:**

```json
{
  "message": "File deleted successfully",
  "path": "/deleted/file.txt",
  "permanent": false,
  "trash_location": "/.trash/file_20250622_143000.txt"
}
```

## File Metadata

### Get File Information

```http
GET /api/files/info/{path}
```

Retrieves detailed information about a file or directory.

**Response:**

```json
{
  "name": "document.pdf",
  "path": "/documents/document.pdf",
  "size": 2048576,
  "modified": "2025-06-22T14:30:00Z",
  "created": "2025-06-20T09:15:00Z",
  "accessed": "2025-06-22T16:00:00Z",
  "is_directory": false,
  "is_hidden": false,
  "is_symlink": false,
  "permissions": "rw-r--r--",
  "owner": "user",
  "group": "staff",
  "mime_type": "application/pdf",
  "extension": "pdf",
  "checksum": {
    "sha256": "abc123def456...",
    "md5": "098f6bcd4621d373cade4e832627b4f6"
  },
  "metadata": {
    "title": "Annual Report 2025",
    "author": "John Doe",
    "pages": 42
  }
}
```

### Update File Metadata

```http
PATCH /api/files/metadata/{path}
Content-Type: application/json
```

Updates file metadata and attributes.

**Request Body:**

```json
{
  "permissions": "644",
  "metadata": {
    "title": "Updated Document Title",
    "tags": ["important", "annual", "report"]
  }
}
```

## File Sharing

### Create Share Link

```http
POST /api/files/share
Content-Type: application/json
```

Creates a shareable link for a file or directory.

**Request Body:**

```json
{
  "path": "/documents/report.pdf",
  "expiry": "2025-12-31T23:59:59Z",
  "password": "optional_password",
  "permissions": ["read"],
  "download_limit": 10
}
```

**Response:**

```json
{
  "share_id": "abc123def456",
  "url": "http://localhost:8080/share/abc123def456",
  "path": "/documents/report.pdf",
  "created": "2025-06-22T14:30:00Z",
  "expiry": "2025-12-31T23:59:59Z",
  "permissions": ["read"],
  "download_count": 0,
  "download_limit": 10
}
```

## Error Responses

### Common File Operation Errors

**404 Not Found**

```json
{
  "error": "file_not_found",
  "message": "The requested file or directory does not exist",
  "path": "/nonexistent/file.txt"
}
```

**403 Forbidden**

```json
{
  "error": "access_denied",
  "message": "Insufficient permissions to access this resource",
  "path": "/restricted/file.txt",
  "required_permissions": ["read"]
}
```

**409 Conflict**

```json
{
  "error": "file_exists",
  "message": "A file with this name already exists",
  "path": "/existing/file.txt"
}
```

**413 Payload Too Large**

```json
{
  "error": "file_too_large",
  "message": "File size exceeds the maximum allowed limit",
  "max_size": 104857600,
  "actual_size": 209715200
}
```

**422 Unprocessable Entity**

```json
{
  "error": "invalid_file_type",
  "message": "File type not allowed",
  "file_type": "application/octet-stream",
  "allowed_types": ["image/*", "application/pdf", "text/*"]
}
```
