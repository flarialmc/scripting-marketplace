package scripts

import (
"encoding/json"
"log"
"net/http"
"os"
"path/filepath"
"strings"
)

type ScriptHandler struct {
baseDir string
}

func NewScriptHandler(baseDir string) *ScriptHandler {
absPath, err := filepath.Abs(baseDir)
if err != nil {
log.Printf("Warning: Could not resolve absolute path for %s: %v", baseDir, err)
absPath = baseDir
}
log.Printf("Initializing script handler with base directory: %s", absPath)
return &ScriptHandler{
baseDir: absPath,
}
}

// HandleListScripts handles GET requests to list available scripts
func (h *ScriptHandler) HandleListScripts(w http.ResponseWriter, r *http.Request) {
if r.Method != http.MethodGet {
http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
return
}

entries, err := os.ReadDir(h.baseDir)
if err != nil {
log.Printf("Error reading directory: %v", err)
http.Error(w, "Failed to read scripts directory", http.StatusInternalServerError)
return
}

var scripts []map[string]interface{}
for _, entry := range entries {
if !entry.IsDir() {
continue
}

metadataPath := filepath.Join(h.baseDir, entry.Name(), "main.json")
log.Printf("Reading metadata file: %s", metadataPath)

metadata, err := os.ReadFile(metadataPath)
if err != nil {
log.Printf("Error reading metadata file: %v", err)
continue
}

var scriptInfo map[string]interface{}
if err := json.Unmarshal(metadata, &scriptInfo); err != nil {
log.Printf("Error parsing metadata: %v", err)
continue
}

scriptInfo["id"] = entry.Name()
scripts = append(scripts, scriptInfo)
}

w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(map[string]interface{}{
"scripts": scripts,
})
}

// HandleGetScript handles GET requests for specific script files
func (h *ScriptHandler) HandleGetScript(w http.ResponseWriter, r *http.Request) {
if r.Method != http.MethodGet {
http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
return
}

// Extract script ID and filename from path
parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/scripts/"), "/")
if len(parts) < 2 {
http.Error(w, "Invalid request path", http.StatusBadRequest)
return
}

scriptID := parts[0]
filename := parts[1]

log.Printf("Requested script: %s, file: %s", scriptID, filename)

// Validate path components
if strings.Contains(scriptID, "..") || strings.Contains(filename, "..") {
http.Error(w, "Invalid script ID or filename", http.StatusBadRequest)
return
}

// Construct file path
filePath := filepath.Join(h.baseDir, scriptID, filename)
log.Printf("Attempting to serve file: %s", filePath)

// Verify file exists within script directory
absPath, err := filepath.Abs(filePath)
if err != nil || !strings.HasPrefix(absPath, h.baseDir) {
log.Printf("Invalid file path: %s", filePath)
http.Error(w, "Invalid file path", http.StatusBadRequest)
return
}

// Check if file exists
fileInfo, err := os.Stat(filePath)
if err != nil {
if os.IsNotExist(err) {
log.Printf("File not found: %s", filePath)
http.Error(w, "File not found", http.StatusNotFound)
} else {
log.Printf("Error accessing file: %v", err)
http.Error(w, "Error accessing file", http.StatusInternalServerError)
}
return
}

// Don't serve directories
if fileInfo.IsDir() {
http.Error(w, "Cannot serve directory", http.StatusBadRequest)
return
}

// Determine content type
contentType := "application/octet-stream"
if strings.HasSuffix(filename, ".json") {
contentType = "application/json"
} else if strings.HasSuffix(filename, ".lua") {
contentType = "text/plain"
}

w.Header().Set("Content-Type", contentType)
http.ServeFile(w, r, filePath)
}