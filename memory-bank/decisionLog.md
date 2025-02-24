# Decision Log

## 2024-02-24 - Script Distribution Format Change

**Context:** 
Currently, scripts are served as individual files. This requires multiple requests to download a complete script package and doesn't guarantee consistency between files.

**Decision:**
Modify the script serving mechanism to deliver entire script directories as gzipped archives.

**Rationale:**
1. Single request download improves efficiency
2. Ensures atomic delivery of all script files
3. Maintains script package integrity
4. Reduces network overhead through compression

**Implementation Plan:**
1. Add new endpoint: `GET /api/scripts/{scriptId}/download`
   - Returns entire script directory as gzipped archive
   - Content-Type: application/gzip
   - Suggested filename via Content-Disposition header

2. Modify ScriptHandler:
   - Add new method for handling archive downloads
   - Implement directory gzipping functionality
   - Add proper error handling and logging

3. Keep existing endpoints:
   - `/api/scripts` (listing)
   - `/api/scripts/{scriptId}/{filename}` (individual file access)
   These remain useful for browsing and inspection.

**Technical Details:**
- Use Go's archive/tar and compress/gzip packages
- Include all files from script directory
- Exclude system files (e.g., .DS_Store)
- Set appropriate HTTP headers for download