# Decision Log

## [2024-02-24] - Initial Architecture Decisions

### Backend Technology Selection: Go
**Context:** Need for efficient file serving and API implementation
**Decision:** Using Go for the backend implementation
**Rationale:**
- Excellent performance for file serving
- Strong standard library support
- Good concurrency handling
- Easy deployment

### Frontend Framework: NextJS with TypeScript
**Context:** Need for a robust, type-safe frontend implementation
**Decision:** Using NextJS with TypeScript
**Rationale:**
- Built-in routing and SSR capabilities
- TypeScript for type safety and better development experience
- Strong ecosystem and community support
- Good performance characteristics

### Storage Strategy: File System Based
**Context:** Need for script storage and distribution
**Decision:** Using file system based storage for scripts
**Rationale:**
- Simple and direct access to script files
- Easy backup and version control integration
- Straightforward PR-based contribution workflow
- No need for complex database operations

### Script Structure Design
**Context:** Need for consistent script organization
**Decision:** Implemented structured directory format for scripts
```
scripts/
  script-name/
    main.json
    script-name.lua
    [additional files]
```
**Rationale:**
- Clear organization of script files
- Metadata separation (main.json)
- Support for additional resources
- Easy validation and processing

### API Design
**Context:** Need for script management and distribution
**Decision:** RESTful API with specific endpoints for script management
**Rationale:**
- Clear separation of concerns
- Straightforward integration with frontend
- Easy to extend and maintain
- Standard HTTP methods for operations

## [2024-02-24] - Backend Project Structure
**Context:** Need to establish a clean, maintainable Go project structure
**Decision:** Implementing a layered architecture with the following structure:
```
backend/
├── cmd/
│   └── server/           # Application entry point
│       └── main.go
├── internal/
│   ├── api/             # API route handlers
│   │   ├── handlers/    # HTTP handlers
│   │   ├── middleware/  # HTTP middleware
│   │   └── router.go    # Router setup
│   ├── core/            # Core business logic
│   │   ├── models/      # Data models
│   │   └── services/    # Business logic services
│   ├── storage/         # File system operations
│   │   ├── scripts/     # Script file management
│   │   └── metadata/    # JSON metadata handling
│   └── config/          # Configuration management
├── pkg/                 # Public packages
│   ├── validation/      # Script validation utilities
│   └── types/          # Shared type definitions
├── scripts/            # Script repository
├── go.mod
└── go.sum
```
**Rationale:**
- Clear separation of concerns with layered architecture
- Internal packages for application-specific code
- Public packages for reusable utilities
- Standard Go project layout conventions
- Easy to test and maintain
- Scalable structure for future extensions

**Implementation Plan:**
1. Initialize Go module
2. Create directory structure
3. Set up basic HTTP server
4. Implement file server functionality
5. Add API route handlers
6. Integrate script validation
7. Implement rate limiting