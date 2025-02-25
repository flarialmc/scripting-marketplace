package scripts

import (
	"archive/tar"
	"compress/gzip"
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

	// Handle CORS preflight (for all relevant requests)
	h.HandleCORS(w, r)

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

// HandleDownloadScript handles GET requests to download a script as a gzipped archive
func (h *ScriptHandler) HandleDownloadScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Handle CORS preflight
	h.HandleCORS(w, r)

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

	// Set response headers
	w.Header().Set("Content-Type", "application/gzip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.tar.gz", scriptID))

	// Create gzip writer
	gw := gzip.NewWriter(w)
	defer gw.Close()

	// Create tar writer
	tw := tar.NewWriter(gw)
	defer tw.Close()

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

		// Create tar header
		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return fmt.Errorf("error creating tar header: %v", err)
		}

		// Update header name to be relative to script directory
		relPath, err := filepath.Rel(scriptDir, path)
		if err != nil {
			return fmt.Errorf("error getting relative path: %v", err)
		}
		header.Name = relPath

		// Write header
		if err := tw.WriteHeader(header); err != nil {
			return fmt.Errorf("error writing tar header: %v", err)
		}

		// If it's a directory, continue
		if info.IsDir() {
			return nil
		}

		// Open and copy file contents
		file, err := os.Open(path)
		if err != nil {
			return fmt.Errorf("error opening file: %v", err)
		}
		defer file.Close()

		if _, err := io.Copy(tw, file); err != nil {
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
