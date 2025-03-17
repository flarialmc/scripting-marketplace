package scripts

import (
	"bufio"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"fmt"
	"encoding/json"
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

func (h *ScriptHandler) HandleCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Max-Age", "86400")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
}

type ScriptMetadata struct {
	Name        string
	Description string
	Author      string
}

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
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".lua") {
			continue
		}

		scriptPath := filepath.Join(h.baseDir, entry.Name())
		scriptName := strings.TrimSuffix(entry.Name(), ".lua")

		file, err := os.Open(scriptPath)
		if err != nil {
			log.Printf("Error opening script file %s: %v", scriptPath, err)
			continue
		}
		defer file.Close()

		var metadata ScriptMetadata
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "--") {
				continue
			}

			if strings.HasPrefix(line, "name = ") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					value := strings.TrimSpace(parts[1])
					metadata.Name = strings.Trim(value, `"`)
				}
			}

			if strings.HasPrefix(line, "description = ") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					value := strings.TrimSpace(parts[1])
					metadata.Description = strings.Trim(value, `"`)
				}
			}

			if strings.HasPrefix(line, "author = ") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					value := strings.TrimSpace(parts[1])
					metadata.Author = strings.Trim(value, `"`)
				}
			}
		}

		if err := scanner.Err(); err != nil {
			log.Printf("Error scanning file %s: %v", scriptPath, err)
			continue
		}

		if metadata.Name == "" {
			log.Printf("No name found in script %s, skipping", scriptName)
			continue
		}

		scriptInfo := map[string]interface{}{
			"name":        metadata.Name,
			"description": metadata.Description,
			"author":      metadata.Author,
			"scriptName":  scriptName,
		}
		scripts = append(scripts, scriptInfo)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"scripts": scripts,
	})
}

func (h *ScriptHandler) HandleGetScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/scripts/"), "/")
	if len(parts) < 1 {
		http.Error(w, "Invalid request path", http.StatusBadRequest)
		return
	}

	scriptName := parts[0]
	log.Printf("Requested script: %s", scriptName)

	if strings.Contains(scriptName, "..") {
		http.Error(w, "Invalid script name", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(h.baseDir, scriptName+".lua")
	log.Printf("Attempting to serve file: %s", filePath)

	absPath, err := filepath.Abs(filePath)
	if err != nil || !strings.HasPrefix(absPath, h.baseDir) {
		log.Printf("Invalid file path: %s", filePath)
		http.Error(w, "Invalid file path", http.StatusBadRequest)
		return
	}

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

	if fileInfo.IsDir() {
		http.Error(w, "Cannot serve directory", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	http.ServeFile(w, r, filePath)
}

func (h *ScriptHandler) HandleDownloadScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract script name from path (removing "/download" suffix)
	scriptName := strings.TrimPrefix(r.URL.Path, "/api/scripts/")
	scriptName = strings.TrimSuffix(scriptName, "/download")

	if strings.Contains(scriptName, "..") {
		http.Error(w, "Invalid script name", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(h.baseDir, scriptName+".lua")
	log.Printf("Attempting to serve download: %s", filePath)

	absPath, err := filepath.Abs(filePath)
	if err != nil || !strings.HasPrefix(absPath, h.baseDir) {
		log.Printf("Invalid file path: %s", filePath)
		http.Error(w, "Invalid file path", http.StatusBadRequest)
		return
	}

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

	if fileInfo.IsDir() {
		http.Error(w, "Cannot serve directory", http.StatusBadRequest)
		return
	}

	// Set headers for file download
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.lua\"", scriptName))
	http.ServeFile(w, r, filePath)
}
