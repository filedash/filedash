# Search API Documentation

FileDash provides powerful search capabilities with support for fuzzy matching, filtering, and indexing.

## Search Endpoints

### Basic Search

```http
GET /api/search?q={query}
```

Performs a basic search across all accessible files and directories.

**Query Parameters:**

- `q` (string, required): Search query text
- `limit` (integer, optional): Maximum results to return (default: 50, max: 1000)
- `offset` (integer, optional): Number of results to skip for pagination (default: 0)

**Response:**

```json
{
  "query": "annual report",
  "results": [
    {
      "name": "annual_report_2025.pdf",
      "path": "/documents/reports/annual_report_2025.pdf",
      "score": 0.95,
      "type": "file",
      "size": 2048576,
      "modified": "2025-06-22T14:30:00Z",
      "mime_type": "application/pdf",
      "highlights": {
        "name": ["<mark>annual</mark>_<mark>report</mark>_2025.pdf"],
        "content": ["This <mark>annual report</mark> covers..."]
      }
    }
  ],
  "total": 15,
  "took": 45,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### Advanced Search

```http
POST /api/search/advanced
Content-Type: application/json
```

Supports complex search queries with filters and advanced options.

**Request Body:**

```json
{
  "query": "annual report",
  "filters": {
    "path": "/documents/**",
    "type": "file",
    "mime_type": ["application/pdf", "text/plain"],
    "size": {
      "min": 1024,
      "max": 10485760
    },
    "modified": {
      "after": "2025-01-01T00:00:00Z",
      "before": "2025-12-31T23:59:59Z"
    },
    "tags": ["important", "financial"]
  },
  "sort": {
    "field": "score",
    "order": "desc"
  },
  "limit": 20,
  "offset": 0,
  "include_content": true,
  "highlight": true
}
```

**Response:** Same format as basic search with additional filtering applied.

## Search Features

### Fuzzy Matching

The search engine supports fuzzy string matching to handle typos and variations:

- **Levenshtein Distance**: Finds strings within edit distance
- **Phonetic Matching**: Matches words that sound similar
- **Stemming**: Matches word variations (run, running, ran)
- **Synonyms**: Configurable synonym expansion

**Examples:**

```
Query: "docment"     → Matches: "document"
Query: "colour"      → Matches: "color" (with synonyms)
Query: "running"     → Matches: "run", "ran", "runner"
```

### Content Indexing

**Supported File Types:**

- **Text Files**: `.txt`, `.md`, `.rtf`
- **Documents**: `.pdf`, `.doc`, `.docx`
- **Code Files**: `.rs`, `.js`, `.py`, `.html`, `.css`
- **Data Files**: `.csv`, `.json`, `.xml`, `.yaml`
- **Configuration**: `.toml`, `.ini`, `.conf`

**Indexing Process:**

1. **Text Extraction**: Extract searchable text from files
2. **Tokenization**: Split text into searchable terms
3. **Normalization**: Convert to lowercase, remove punctuation
4. **Stemming**: Reduce words to root forms
5. **Indexing**: Store in searchable index

### Search Operators

**Boolean Operators:**

```
annual AND report           # Both terms must be present
annual OR yearly            # Either term must be present
annual NOT draft            # First term present, second absent
"annual report"             # Exact phrase matching
```

**Wildcard Matching:**

```
report*                     # Starts with "report"
*2025                       # Ends with "2025"
rep?rt                      # Single character wildcard
```

**Field-Specific Search:**

```
name:report                 # Search in filename only
content:budget              # Search in file content only
path:/documents/*           # Search in specific path
type:pdf                    # Search by file type
```

### Filters

#### Path Filters

```json
{
  "path": "/documents/**", // All files under documents
  "path": "/images/*.jpg", // JPG files in images
  "path": "!/private/**" // Exclude private directory
}
```

#### Type Filters

```json
{
  "type": "file", // Only files
  "type": "directory", // Only directories
  "type": ["file", "directory"] // Both files and directories
}
```

#### Size Filters

```json
{
  "size": {
    "min": 1024, // Minimum 1KB
    "max": 10485760, // Maximum 10MB
    "exact": 2048 // Exactly 2KB
  }
}
```

#### Date Filters

```json
{
  "modified": {
    "after": "2025-01-01T00:00:00Z",
    "before": "2025-12-31T23:59:59Z"
  },
  "created": {
    "within": "7d" // Within last 7 days
  }
}
```

#### MIME Type Filters

```json
{
  "mime_type": "application/pdf",
  "mime_type": ["image/*", "video/*"],
  "mime_category": "document" // Predefined categories
}
```

## Search Index Management

### Index Status

```http
GET /api/search/index/status
```

Returns current indexing status and statistics.

**Response:**

```json
{
  "status": "ready",
  "total_files": 15420,
  "indexed_files": 15420,
  "last_updated": "2025-06-22T14:30:00Z",
  "index_size": 52428800,
  "pending_updates": 0,
  "statistics": {
    "documents": 8500,
    "images": 3200,
    "videos": 1500,
    "other": 2220
  }
}
```

### Rebuild Index

```http
POST /api/search/index/rebuild
Authorization: Bearer <admin_token>
```

Rebuilds the search index from scratch (admin only).

**Request Body:**

```json
{
  "background": true, // Run in background
  "paths": ["/documents", "/shared"] // Specific paths only
}
```

### Update Index

```http
POST /api/search/index/update
Authorization: Bearer <admin_token>
```

Updates the index with recent file changes.

## Search Configuration

### Indexing Settings

```toml
[search]
enabled = true
index_path = "./data/search_index"
update_interval = 300  # 5 minutes

[search.content]
max_file_size = 10485760  # 10MB
extract_text = true
extract_metadata = true
supported_types = ["text/*", "application/pdf", "application/msword"]

[search.performance]
max_results = 1000
default_limit = 50
cache_results = true
cache_ttl = 300  # 5 minutes

[search.fuzzy]
enabled = true
max_distance = 2
min_similarity = 0.6
phonetic_matching = true
```

### Text Extraction

**PDF Files:**

```rust
// Uses pdf-extract crate
let text = pdf_extract::extract_text(&file_path)?;
```

**Office Documents:**

```rust
// Uses docx/xlsx parsing
let text = extract_office_document(&file_path)?;
```

**Code Files:**

```rust
// Preserves structure and comments
let text = extract_code_content(&file_path, &language)?;
```

## Performance Optimization

### Indexing Strategy

**Incremental Updates:**

- Monitor file system changes
- Update index in real-time
- Batch small changes
- Background processing

**Memory Management:**

- Configurable index size limits
- LRU cache for frequently accessed files
- Memory-mapped file access
- Compression for stored content

### Search Performance

**Query Optimization:**

- Query plan analysis
- Index selection
- Result caching
- Parallel processing

**Response Time Targets:**

- Simple queries: < 50ms
- Complex queries: < 200ms
- Large result sets: < 500ms
- Index updates: < 1s

## Error Handling

### Search Errors

**400 Bad Request**

```json
{
  "error": "invalid_query",
  "message": "Query syntax is invalid",
  "details": {
    "query": "invalid[syntax",
    "position": 7,
    "expected": "closing bracket"
  }
}
```

**503 Service Unavailable**

```json
{
  "error": "index_rebuilding",
  "message": "Search index is currently being rebuilt",
  "retry_after": 300
}
```

**413 Request Too Large**

```json
{
  "error": "query_too_complex",
  "message": "Query exceeds complexity limits",
  "max_terms": 100,
  "actual_terms": 150
}
```

## Usage Examples

### Simple File Search

```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/search?q=report&limit=10"
```

### Search with Filters

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "budget",
    "filters": {
      "path": "/documents/**",
      "type": "file",
      "modified": {
        "after": "2025-01-01T00:00:00Z"
      }
    },
    "limit": 20
  }' \
  http://localhost:8080/api/search/advanced
```

### Search by File Type

```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/search?q=type:pdf%20annual"
```

### Rebuild Search Index

```bash
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"background": true}' \
  http://localhost:8080/api/search/index/rebuild
```
