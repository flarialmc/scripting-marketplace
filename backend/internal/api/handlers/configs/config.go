package configs

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// ConfigHandler handles config-related API endpoints
type ConfigHandler struct {
	BaseDir string
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
// NewConfigHandler creates a new ConfigHandler with the given base directory
func NewConfigHandler(baseDir string) *ConfigHandler {
	return &ConfigHandler{BaseDir: baseDir}
}

// HandleDownloadConfig serves configuration files as .zip
func (h *ConfigHandler) HandleDownloadConfig(w http.ResponseWriter, r *http.Request) {
	configName := strings.TrimPrefix(r.URL.Path, "/api/configs/")
	configName = strings.TrimSuffix(configName, "/download")

	if configName == "" {
		http.Error(w, "Config name not provided", http.StatusBadRequest)
		return
	}

	configPath := filepath.Join(h.BaseDir, configName+".zip")

	file, err := os.Open(configPath)
	if err != nil {
		http.Error(w, "Config not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Disposition", "attachment; filename="+configName+".zip")
	w.Header().Set("Content-Type", "application/zip")
	http.ServeFile(w, r, configPath)
}
