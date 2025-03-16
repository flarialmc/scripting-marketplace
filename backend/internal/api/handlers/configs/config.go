package configs

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

type ConfigHandler struct {
	baseDir string
}

func NewConfigHandler(baseDir string) *ConfigHandler {
	absPath, err := filepath.Abs(baseDir)
	if err != nil {
		log.Printf("Warning: Could not resolve absolute path for %s: %v", baseDir, err)
		absPath = baseDir
	}
	log.Printf("Initializing config handler with base directory: %s", absPath)
	return &ConfigHandler{
		baseDir: absPath,
	}
}

// HandleListConfigs handles GET requests to list available configs
func (h *ConfigHandler) HandleListConfigs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	entries, err := os.ReadDir(h.baseDir)
	if err != nil {
		log.Printf("Error reading directory: %v", err)
		http.Error(w, "Failed to read configs directory", http.StatusInternalServerError)
		return
	}

	var configs []map[string]interface{}
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

		var configInfo map[string]interface{}
		if err := json.Unmarshal(metadata, &configInfo); err != nil {
			log.Printf("Error parsing metadata: %v", err)
			continue
		}

		configInfo["id"] = entry.Name()
		configs = append(configs, configInfo)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"configs": configs,
	})
}

// HandleDownloadConfig handles GET requests to download a config as a zip archive
func (h *ConfigHandler) HandleDownloadConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	configID := strings.TrimPrefix(r.URL.Path, "/api/configs/")
	configID = strings.TrimSuffix(configID, "/download")

	if strings.Contains(configID, "..") {
		http.Error(w, "Invalid config ID", http.StatusBadRequest)
		return
	}

	configDir := filepath.Join(h.baseDir, configID)
	absPath, err := filepath.Abs(configDir)
	if err != nil || !strings.HasPrefix(absPath, h.baseDir) {
		log.Printf("Invalid config directory: %s", configDir)
		http.Error(w, "Invalid config directory", http.StatusBadRequest)
		return
	}

	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		log.Printf("Config directory not found: %s", configDir)
		http.Error(w, "Config not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/x-zip-compressed")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", configID))

	zw := zip.NewWriter(w)
	defer zw.Close()

	err = filepath.Walk(configDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if path == configDir {
			return nil
		}

		if strings.HasPrefix(filepath.Base(path), ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		relPath, err := filepath.Rel(configDir, path)
		if err != nil {
			return err
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(relPath)
		header.Method = zip.Deflate

		writer, err := zw.CreateHeader(header)
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		return err
	})

	if err != nil {
		log.Printf("Error creating archive: %v", err)
		http.Error(w, "Error creating archive", http.StatusInternalServerError)
	}
}
