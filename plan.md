# Flarial Client Scripting Marketplace

## System Architecture

### Backend (Go)
- **File Server**
  - Serves script files from the `scripts` directory
  - Provides API endpoints for:
    - Listing available scripts
    - Retrieving script metadata
    - Downloading script packages
    - Searching/filtering scripts by tags

- **Data Structure**
  ```go
  type Script struct {
    Name        string   `json:"name"`
    Description string   `json:"description"`
    MainClass   string   `json:"main_class"`
    ApiRevision int      `json:"api_revision"`
    Tags        []string `json:"tags"`
    Path        string   `json:"path"`  // Path to the script files
  }
  ```

### Frontend (NextJS)
- **Pages**
  - Home/Browse Page
    - Script listing with search and tag filtering
    - Grid/List view of available scripts
  - Script Details Page
    - Shows full script information
    - Download button
    - Installation instructions
  - Submit Script Page
    - Instructions for GitHub PR submission
    - Link to GitHub repository
    - Documentation on script structure

- **Features**
  - Search functionality
  - Tag-based filtering
  - Sorting options (alphabetical, newest)
  - Script preview/details
  - Download integration

### Script Structure
```
scripts/
  script-name/
    main.json         # Script metadata
    script-name.lua   # Main script file
    [additional files]  # Any other required resources
```

### main.json Schema
```json
{
  "name": "string (required)",
  "description": "string (required)",
  "main_class": "string (required - must end in .lua)",
  "api_revision": "number (required)",
  "tags": ["string"]  // Added by maintainers during PR review
}
```

## Implementation Plan

### Phase 1: Backend Development
1. Set up Go project structure
2. Implement file server functionality
3. Create API endpoints for:
   - GET /api/scripts - List all scripts
   - GET /api/scripts/:name - Get specific script details
   - GET /api/download/:name - Download script package
   - GET /api/tags - List all available tags
   - GET /api/search - Search scripts with filters

### Phase 2: Frontend Development
1. Set up Next.js project with TypeScript
2. Create responsive layout and components
3. Implement script browsing and filtering
4. Add script details view
5. Integrate with backend API
6. Add search functionality
7. Implement tag-based filtering

### Phase 3: Documentation and GitHub Setup
1. Create documentation for:
   - Script submission process
   - Script structure requirements
   - PR guidelines
2. Set up GitHub repository with:
   - PR templates
   - Contribution guidelines
   - Script validation workflows

## Security Considerations
1. Validate script structure and content during PR review
2. Ensure proper file permissions on the server
3. Implement rate limiting for downloads
4. Add file size limits for script packages

## Deployment Considerations
1. Set up CI/CD pipeline for backend
2. Configure frontend deployment
3. Implement monitoring and logging
4. Set up backup system for script repository