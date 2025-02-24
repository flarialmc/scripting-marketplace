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

// Configure server
server := &http.Server{
Addr:    ":5019",
Handler: mux,
}

// Start server
log.Printf("Starting server on :5019")
if err := server.ListenAndServe(); err != nil {
log.Fatalf("Server failed to start: %v", err)
}
}