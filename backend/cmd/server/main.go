package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"backend/internal/api/handlers/scripts"
	"backend/internal/api/handlers/configs"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	response := map[string]string{
		"status": "healthy",
		"server": "Flarial Scripting Marketplace",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// corsMiddleware wraps an http.Handler and adds CORS headers to all responses
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "https://marketplace.flarial.xyz" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "86400")
			w.Header().Set("Vary", "Origin")
		}

		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Origin", "https://marketplace.flarial.xyz")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			w.Header().Set("Access-Control-Max-Age", "86400")
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()

	// Updated to use two directories for scripts
	// Also fixed directory names to plural for consistency
	scriptHandler := scripts.NewScriptHandler("scripts/module", "scripts/command")
	configHandler := configs.NewConfigHandler("configs")
    
	mux.HandleFunc("/api/configs", configHandler.HandleListConfigs)
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/scripts", scriptHandler.HandleListScripts)
	mux.HandleFunc("/api/scripts/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/scripts/")
		if len(path) > 0 {
			parts := strings.Split(path, "/")
			if len(parts) >= 2 { // Expecting at least type/scriptname
				// Handle both /download and /download/
				if strings.HasSuffix(r.URL.Path, "/download") || strings.HasSuffix(r.URL.Path, "/download/") {
					scriptHandler.HandleDownloadScript(w, r)
				} else {
					scriptHandler.HandleGetScript(w, r)
				}
			} else {
				http.NotFound(w, r)
			}
		} else {
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/configs/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/configs/")
	
		switch {
		case strings.HasSuffix(path, "/download"):
			configHandler.HandleDownloadConfig(w, r)
		case strings.HasSuffix(path, "/icon.png"):
			configHandler.HandleIconRequest(w, r)
		default:
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