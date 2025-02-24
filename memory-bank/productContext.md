# Flarial Client Scripting Marketplace - Product Context

## Project Overview
The Flarial Client Scripting Marketplace is a platform for distributing and managing Lua scripts. It consists of a Go backend serving script files and a NextJS frontend for browsing and managing scripts.

## Core Components
### Backend (Go)
- File server for script distribution
- API endpoints for script management
- Data structures for script metadata

### Frontend (NextJS)
- Browse/search interface
- Script details views
- Submission guidelines
- Tag-based filtering

## System Architecture
### Script Structure
```
scripts/
  script-name/
    main.json         # Script metadata
    script-name.lua   # Main script file
    [additional files]  # Resources
```

### Data Schema
Script metadata follows this structure:
```json
{
  "name": "string (required)",
  "description": "string (required)", 
  "main_class": "string (required - must end in .lua)",
  "api_revision": "number (required)",
  "tags": ["string"]
}
```

## Project Constraints
### Security Requirements
- Script validation during PR review
- Proper file permissions
- Rate limiting for downloads
- File size limits

### Deployment Requirements
- CI/CD pipeline setup
- Monitoring and logging implementation
- Backup system for script repository

## Memory Bank Structure
This Memory Bank contains the following core files:
- productContext.md (this file) - Project overview and key details
- activeContext.md - Current development context and goals
- progress.md - Project progress tracking
- decisionLog.md - Architecture and implementation decisions