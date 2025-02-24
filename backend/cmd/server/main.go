package main

import (
	"encoding/json"
	"log"
	"net/http"
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
	mux.HandleFunc("/health", healthHandler)

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