package scripts

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
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

// Add a function to handle CORS preflight requests
func (h *ScriptHandler) HandleCORS(w http.ResponseWriter, r *http.Request) {
	// Set the necessary CORS headers for the preflight request
	w.Header().Set("Access-Control-Allow-Origin", "*")          // Allow all origins (adjust as needed)
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS") // Allow GET, POST, and OPTIONS methods
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type") // Allow content type headers
	w.Header().Set("Access-Control-Max-Age", "86400")            // Cache the CORS response for a day

	// If it's a preflight request, respond with a 200 status
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
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

// HandleDownloadScript handles GET requests to download a script as a zip archive
func (h *ScriptHandler) HandleDownloadScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract script ID from path
	scriptID := strings.TrimPrefix(r.URL.Path, "/api/scripts/")
	scriptID = strings.TrimSuffix(scriptID, "/download")

	if strings.Contains(scriptID, "..") {
		http.Error(w, "Invalid script ID", http.StatusBadRequest)
		return
	}

	scriptDir := filepath.Join(h.baseDir, scriptID)

	// Verify directory exists and is within base directory
	absPath, err := filepath.Abs(scriptDir)
	if err != nil || !strings.HasPrefix(absPath, h.baseDir) {
		log.Printf("Invalid script directory: %s", scriptDir)
		http.Error(w, "Invalid script directory", http.StatusBadRequest)
		return
	}

	// Check if directory exists
	dirInfo, err := os.Stat(scriptDir)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("Script directory not found: %s", scriptDir)
			http.Error(w, "Script not found", http.StatusNotFound)
		} else {
			log.Printf("Error accessing script directory: %v", err)
			http.Error(w, "Error accessing script", http.StatusInternalServerError)
		}
		return
	}

	if !dirInfo.IsDir() {
		http.Error(w, "Not a script directory", http.StatusBadRequest)
		return
	}

	// Set response headers for zip download
	w.Header().Set("Content-Type", "application/x-zip-compressed")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", scriptID))

	// Create zip writer
	zw := zip.NewWriter(w)
	defer zw.Close()

	// Walk through the script directory
	err = filepath.Walk(scriptDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip the directory itself
		if path == scriptDir {
			return nil
		}

		// Skip hidden files and directories
		if strings.HasPrefix(filepath.Base(path), ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Get relative path for zip entry
		relPath, err := filepath.Rel(scriptDir, path)
		if err != nil {
			return fmt.Errorf("error getting relative path: %v", err)
		}

		// Create zip file entry
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return fmt.Errorf("error creating zip header: %v", err)
		}

		// Set the name to use forward slashes (zip spec)
		header.Name = filepath.ToSlash(relPath)

		// Set compression method
		header.Method = zip.Deflate

		// Create file in zip
		writer, err := zw.CreateHeader(header)
		if err != nil {
			return fmt.Errorf("error creating zip entry: %v", err)
		}

		// If it's a directory, no need to copy contents
		if info.IsDir() {
			return nil
		}

		// Open and copy file contents
		file, err := os.Open(path)
		if err != nil {
			return fmt.Errorf("error opening file: %v", err)
		}
		defer file.Close()

		if _, err := io.Copy(writer, file); err != nil {
			return fmt.Errorf("error copying file contents: %v", err)
		}

		return nil
	})

	if err != nil {
		log.Printf("Error creating archive: %v", err)
		http.Error(w, "Error creating archive", http.StatusInternalServerError)
		return
	}
}
