# API Documentation

This directory contains the OpenAPI/Swagger specification for the Flarial Script Marketplace API.

## Overview

The API documentation is written in OpenAPI 3.0 format and describes all available endpoints, their request/response formats, and possible error conditions.

## Script Download Endpoint

### Usage Example

```bash
# Download a script package
curl -X GET http://localhost:8080/api/scripts/my-script/download -o my-script.tar.gz

# Extract the downloaded package
tar -xzf my-script.tar.gz
```

### Security Considerations

1. Path Traversal Protection
   - The API validates script IDs to prevent directory traversal attacks
   - All file paths are validated to ensure they remain within the script's directory

2. File Access Control
   - Hidden files (starting with '.') are automatically excluded from downloads
   - Directory listing is prevented
   - Only files within the specific script directory are accessible

3. Authentication
   - Basic authentication is required for all API endpoints
   - Use HTTPS in production to secure credentials

### Package Structure

The downloaded `.tar.gz` file contains:
- `main.json` - Script metadata and configuration
- Script implementation files (e.g., `.lua` files)
- Additional resources and dependencies

### Error Handling

The endpoint returns appropriate HTTP status codes:
- `400` - Invalid script ID or path traversal attempt
- `404` - Script not found
- `405` - Method not allowed (only GET is supported)
- `500` - Server-side errors (archive creation failure, file access issues)

## Using the Documentation

1. View with Swagger UI:
   ```bash
   # Using Node.js http-server and swagger-ui
   npx http-server backend/docs -o /swagger-ui/?url=openapi.yaml
   ```

2. Generate Client Code:
   ```bash
   # Using OpenAPI Generator
   openapi-generator generate -i backend/docs/openapi.yaml -g typescript-axios -o generated-client