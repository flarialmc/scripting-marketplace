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
