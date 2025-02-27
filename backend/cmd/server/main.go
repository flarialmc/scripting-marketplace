package main

import (
	"encoding/json"
	"log"
	"net/http"
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

// corsMiddleware wraps an http.Handler and adds CORS headers to all responses
// func corsMiddleware(next http.Handler) http.Handler {
// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		// Set CORS headers for all responses
// 		w.Header().Set("Access-Control-Allow-Origin", "*") // Allow all origins - you may want to restrict this in production
// 		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
// 		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
// 		w.Header().Set("Access-Control-Allow-Credentials", "true")
// 		w.Header().Set("Access-Control-Max-Age", "86400") // Cache preflight requests for 24 hours

// 		// Handle preflight requests
// 		if r.Method == http.MethodOptions {
// 			w.WriteHeader(http.StatusOK)
// 			return
// 		}

// 		// Call the next handler
// 		next.ServeHTTP(w, r)
// 	})
// }

func main() {
	// Configure routes
	mux := http.NewServeMux()

	// Set up script handler with base directory
	scriptHandler := scripts.NewScriptHandler("scripts") // Path relative to backend directory

	// Routes
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

	// Configure server with CORS middleware
	server := &http.Server{
		Addr:    ":5019",
	}

	// Start server
	log.Printf("Starting server on :5019")
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
