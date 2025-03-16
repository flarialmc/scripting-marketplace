package main

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

	"backend/internal/api/handlers/scripts"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	response := map[string]string{
		"status": "healthy",
		"server": "Flarial Scripting Marketplace",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Zip and serve a config folder
func handleDownloadConfig(w http.ResponseWriter, r *http.Request) {
	configName := strings.TrimPrefix(r.URL.Path, "/api/configs/")
	configName = strings.TrimSuffix(configName, "/download")
	configPath := filepath.Join("configs", configName)

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		http.Error(w, "Config not found", http.StatusNotFound)
		return
	}

	zipPath := fmt.Sprintf("%s.zip", configPath)
	err := zipFolder(configPath, zipPath)
	if err != nil {
		http.Error(w, "Failed to create zip", http.StatusInternalServerError)
		return
	}
	defer os.Remove(zipPath)

	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", configName))
	w.Header().Set("Content-Type", "application/zip")

	zipFile, err := os.Open(zipPath)
	if err != nil {
		http.Error(w, "Failed to open zip file", http.StatusInternalServerError)
		return
	}
	defer zipFile.Close()

	io.Copy(w, zipFile)
}

func zipFolder(source, destination string) error {
	zipFile, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	return filepath.Walk(source, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(source, path)
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

		zipEntry, err := zipWriter.Create(relPath)
		if err != nil {
			return err
		}

		_, err = io.Copy(zipEntry, file)
		return err
	})
}

func main() {
	mux := http.NewServeMux()

	scriptHandler := scripts.NewScriptHandler("scripts")

	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/scripts", scriptHandler.HandleListScripts)
	mux.HandleFunc("/api/scripts/", func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) > len("/api/scripts/") {
			if strings.HasSuffix(r.URL.Path, "/download") {
				scriptHandler.HandleDownloadScript(w, r)
			} else {
				scriptHandler.HandleGetScript(w, r)
			}
		} else {
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/configs/", func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) > len("/api/configs/") && strings.HasSuffix(r.URL.Path, "/download") {
			handleDownloadConfig(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	server := &http.Server{
		Addr:    ":5019",
		Handler: corsMiddleware(mux),
	}

	log.Printf("Starting server on :5019")
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
