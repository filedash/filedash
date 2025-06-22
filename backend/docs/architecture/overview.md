# System Architecture Overview

FileDash backend follows a layered architecture pattern designed for scalability, maintainability, and security.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Web UI    │  │  Mobile App │  │  API Client │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway Layer                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Axum HTTP Server                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                  Middleware Layer                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │     Auth     │ │     CORS     │ │   Logging    │        │
│  │  Middleware  │ │  Middleware  │ │  Middleware  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   Route Handler Layer                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │     Auth     │ │     Files    │ │    Search    │        │
│  │   Handlers   │ │   Handlers   │ │   Handlers   │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │     Auth     │ │     File     │ │    Search    │        │
│  │   Service    │ │   Service    │ │   Service    │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   Storage Layer                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │   Database   │ │  File System │ │     Cache    │        │
│  │   (SQLite)   │ │   (Local)    │ │   (Memory)   │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Component Overview

### 1. API Gateway Layer (Axum)

- **Primary Role**: HTTP request handling and routing
- **Responsibilities**:
  - Request parsing and validation
  - Response formatting
  - Static file serving (frontend)
  - WebSocket connections (future)

### 2. Middleware Layer

- **Authentication Middleware**: JWT validation and user context
- **CORS Middleware**: Cross-origin request handling
- **Logging Middleware**: Request/response logging
- **Rate Limiting**: API abuse prevention
- **Error Handler**: Centralized error processing

### 3. Route Handler Layer

- **Auth Handlers**: Login, logout, token management
- **File Handlers**: CRUD operations on files/directories
- **Search Handlers**: File search and indexing
- **Health Handlers**: System status and monitoring

### 4. Service Layer

- **Business Logic**: Core application functionality
- **Data Validation**: Input sanitization and validation
- **Authorization**: Permission checking
- **Integration**: External service communication

### 5. Storage Layer

- **Database**: User data, sessions, metadata
- **File System**: Actual file storage
- **Cache**: Performance optimization

## Directory Structure

```
src/
├── main.rs                 # Application entry point
├── lib.rs                  # Library root and app builder
├── api/                    # Route handlers
│   ├── mod.rs
│   ├── auth.rs            # Authentication endpoints
│   ├── files.rs           # File operation endpoints
│   └── search.rs          # Search endpoints
├── services/               # Business logic layer
│   ├── mod.rs
│   ├── auth_service.rs    # Authentication logic
│   ├── file_service.rs    # File operation logic
│   └── search_service.rs  # Search functionality
├── middleware/             # Request processing
│   ├── mod.rs
│   ├── auth.rs            # JWT validation
│   └── cors.rs            # CORS handling
├── config/                 # Configuration management
│   ├── mod.rs
│   └── settings.rs        # Config structs and loading
├── db/                     # Database layer
│   ├── mod.rs
│   ├── models.rs          # Data models
│   └── connection.rs      # DB connection handling
├── errors/                 # Error handling
│   ├── mod.rs
│   └── api_error.rs       # Custom error types
└── utils/                  # Utility functions
    ├── mod.rs
    ├── security.rs        # Security helpers
    └── validation.rs      # Input validation
```

## Data Flow

### 1. Request Processing Flow

```
HTTP Request → Middleware → Router → Handler → Service → Storage
```

### 2. File Operation Flow

```
Client Request → Auth Check → Path Validation → File Service → File System
```

### 3. Search Flow

```
Search Query → Input Validation → Search Service → File Index → Results
```

## Key Design Patterns

### 1. Dependency Injection

- Services are injected into handlers
- Configuration is shared via Arc<Config>
- Database connections are pooled

### 2. Error Handling

- Custom error types with context
- Centralized error conversion
- Consistent API error responses

### 3. Async/Await

- Non-blocking I/O operations
- Efficient resource utilization
- Concurrent request handling

### 4. Middleware Pattern

- Composable request processing
- Cross-cutting concerns separation
- Reusable functionality

## Security Architecture

### 1. Authentication Layer

- JWT token validation
- User session management
- Role-based access control

### 2. Authorization Layer

- Path-based permissions
- Resource access control
- Operation validation

### 3. Input Validation

- Request parameter validation
- File path sanitization
- Upload size limits

### 4. File System Security

- Sandboxed file access
- Path traversal prevention
- Permission enforcement

## Performance Considerations

### 1. Async I/O

- All file operations are non-blocking
- Concurrent request handling
- Efficient resource utilization

### 2. Streaming

- Large file downloads use streaming
- Memory-efficient uploads
- Chunked transfer encoding

### 3. Caching

- Metadata caching for frequently accessed files
- Search result caching
- Configuration caching

### 4. Connection Pooling

- Database connection reuse
- HTTP client pooling
- Resource management

## Scalability Design

### 1. Stateless Architecture

- No server-side session storage
- JWT-based authentication
- Horizontal scaling capability

### 2. Modular Services

- Loosely coupled components
- Independent service scaling
- Microservice-ready design

### 3. Database Strategy

- SQLite for simplicity (development)
- PostgreSQL support (production)
- Read replica support

### 4. File Storage Strategy

- Local file system (single node)
- Network storage support (NFS, S3)
- CDN integration for downloads

## Monitoring & Observability

### 1. Logging

- Structured logging with tracing
- Request/response logging
- Error tracking and alerting

### 2. Metrics

- API endpoint metrics
- File operation statistics
- System resource monitoring

### 3. Health Checks

- Service health endpoints
- Database connectivity checks
- File system availability

### 4. Tracing

- Request tracing across components
- Performance bottleneck identification
- Debugging support
