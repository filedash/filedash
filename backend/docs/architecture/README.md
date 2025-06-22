# Architecture Documentation

Technical architecture and design documentation for FileDash backend.

## Architecture Overview

### [System Overview](./overview.md)

High-level system architecture, component relationships, and design patterns.

### [Database Schema](./database.md)

Data models, relationships, and database design decisions.

### [Service Layer](./services.md)

Business logic organization and service layer architecture.

### [Middleware](./middleware.md)

Request processing pipeline and middleware components.

## Architecture Diagrams

### System Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Server    │    │  Storage    │
│   (React)   │◄──►│   (Axum)    │◄──►│ (SQLite)    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Request Flow

```
Request → Middleware → Router → Handler → Service → Storage
```

### Component Dependencies

```
┌─────────────┐
│   main.rs   │
└─────┬───────┘
      │
┌─────▼───────┐    ┌─────────────┐
│   lib.rs    │◄──►│   config    │
└─────┬───────┘    └─────────────┘
      │
┌─────▼───────┐    ┌─────────────┐    ┌─────────────┐
│     api     │◄──►│  services   │◄──►│     db      │
└─────────────┘    └─────────────┘    └─────────────┘
      │                    │
┌─────▼───────┐    ┌─────▼───────┐
│ middleware  │    │   utils     │
└─────────────┘    └─────────────┘
```

## Design Principles

### 1. Separation of Concerns

- **API Layer**: HTTP handling and routing
- **Service Layer**: Business logic
- **Data Layer**: Storage and persistence

### 2. Security by Design

- Input validation at boundaries
- Least privilege access
- Defense in depth

### 3. Performance First

- Async/await throughout
- Streaming for large files
- Efficient memory usage

### 4. Maintainability

- Clear module boundaries
- Comprehensive testing
- Documentation as code

## Key Technologies

| Component      | Technology | Purpose          |
| -------------- | ---------- | ---------------- |
| HTTP Server    | Axum       | Web framework    |
| Runtime        | Tokio      | Async runtime    |
| Database       | SQLite     | Data persistence |
| Authentication | JWT        | Stateless auth   |
| Logging        | Tracing    | Observability    |
| Config         | TOML       | Configuration    |

## Architecture Decisions

### ADR-001: Web Framework Choice

**Decision**: Use Axum instead of Actix-web
**Reasoning**: Better integration with Tokio ecosystem, type safety, performance

### ADR-002: Database Choice

**Decision**: SQLite for development, PostgreSQL for production
**Reasoning**: Simplicity for development, scalability for production

### ADR-003: Authentication Strategy

**Decision**: JWT tokens instead of sessions
**Reasoning**: Stateless, scalable, suitable for API-first design

### ADR-004: File Storage Strategy

**Decision**: Local filesystem with pluggable backends
**Reasoning**: Simplicity, performance, extensibility for cloud storage

## Scalability Considerations

### Horizontal Scaling

- Stateless design enables load balancing
- Database connection pooling
- File storage can be externalized

### Performance Optimization

- Connection pooling
- Async I/O operations
- Efficient serialization
- Streaming responses

### Resource Management

- Memory-mapped file access
- Lazy loading
- Connection limits
- Request timeouts
