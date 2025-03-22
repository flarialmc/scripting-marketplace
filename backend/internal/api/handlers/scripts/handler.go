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
    moduleDir  string
    commandDir string
    nameToFile map[string]map[string]string
}

func NewScriptHandler(moduleDir, commandDir string) *ScriptHandler {
    moduleAbsPath, err := filepath.Abs(moduleDir)
    if err != nil {
        log.Printf("Warning: Could not resolve absolute path for module %s: %v", moduleDir, err)
        moduleAbsPath = moduleDir
    }
    commandAbsPath, err := filepath.Abs(commandDir)
    if err != nil {
        log.Printf("Warning: Could not resolve absolute path for command %s: %v", commandDir, err)
        commandAbsPath = commandDir
    }
    
    log.Printf("Initializing script handler with module directory: %s", moduleAbsPath)
    log.Printf("Initializing script handler with command directory: %s", commandAbsPath)
    return &ScriptHandler{
        moduleDir:  moduleAbsPath,
        commandDir: commandAbsPath,
        nameToFile: make(map[string]map[string]string),
    }
}

func (h *ScriptHandler) HandleCORS(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    w.Header().Set("Access-Control-Max-Age", "86400")
    w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")

    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return
    }
}

type ScriptMetadata struct {
    Name        string
    Description string
    Author      string
    Type        string
}

func (h *ScriptHandler) listScripts(dir string, scriptType string) ([]map[string]interface{}, error) {
    log.Printf("Reading directory %s for %s scripts", dir, scriptType)
    entries, err := os.ReadDir(dir)
    if err != nil {
        log.Printf("Failed to read directory %s: %v", dir, err)
        return nil, err
    }

    if _, exists := h.nameToFile[scriptType]; !exists {
        h.nameToFile[scriptType] = make(map[string]string)
    }

    var scripts []map[string]interface{}
    for _, entry := range entries {
        log.Printf("Found entry: %s", entry.Name())
        if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".lua") {
            log.Printf("Skipping %s: not a .lua file or is a directory", entry.Name())
            continue
        }

        scriptPath := filepath.Join(dir, entry.Name())
        fileName := strings.TrimSuffix(entry.Name(), ".lua")
        log.Printf("Processing file: %s", scriptPath)

        file, err := os.Open(scriptPath)
        if err != nil {
            log.Printf("Error opening script file %s: %v", scriptPath, err)
            continue
        }
        defer file.Close()

        var metadata ScriptMetadata
        metadata.Type = scriptType
        
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
                    log.Printf("Found name: %s", metadata.Name)
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
            log.Printf("No name found in script %s, using filename", fileName)
            metadata.Name = fileName
        }

        normalizedName := strings.ToLower(metadata.Name)
        h.nameToFile[scriptType][normalizedName] = fileName
        log.Printf("Mapped %s to %s in %s scripts", normalizedName, fileName, scriptType)

        scriptInfo := map[string]interface{}{
            "name":        metadata.Name,
            "description": metadata.Description,
            "author":      metadata.Author,
            "type":        metadata.Type,
        }
        scripts = append(scripts, scriptInfo)
    }
    log.Printf("Found %d scripts in %s", len(scripts), scriptType)
    return scripts, nil
}

func (h *ScriptHandler) HandleListScripts(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    moduleScripts, err := h.listScripts(h.moduleDir, "module")
    if err != nil {
        log.Printf("Error reading module directory: %v", err)
        http.Error(w, "Failed to read module directory", http.StatusInternalServerError)
        return
    }

    commandScripts, err := h.listScripts(h.commandDir, "command")
    if err != nil {
        log.Printf("Error reading command directory: %v", err)
        http.Error(w, "Failed to read command directory", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "modules":  moduleScripts,
        "commands": commandScripts,
    })
}

func (h *ScriptHandler) getScriptBaseDir(scriptType string) string {
    if scriptType == "module" {
        return h.moduleDir
    }
    return h.commandDir
}

func (h *ScriptHandler) ensureScriptsLoaded(scriptType string) error {
    if _, exists := h.nameToFile[scriptType]; !exists {
        dir := h.getScriptBaseDir(scriptType)
        _, err := h.listScripts(dir, scriptType)
        if err != nil {
            return err
        }
    }
    return nil
}

func (h *ScriptHandler) HandleGetScript(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/scripts/"), "/")
    if len(parts) < 2 {
        http.Error(w, "Invalid request path - specify type (module/command) and script name", http.StatusBadRequest)
        return
    }

    scriptType, scriptName := parts[0], parts[1]
    if scriptType != "module" && scriptType != "command" {
        http.Error(w, "Invalid script type - must be 'module' or 'command'", http.StatusBadRequest)
        return
    }

    if err := h.ensureScriptsLoaded(scriptType); err != nil {
        log.Printf("Error loading scripts for %s: %v", scriptType, err)
        http.Error(w, "Failed to load scripts", http.StatusInternalServerError)
        return
    }

    normalizedName := strings.ToLower(scriptName)
    fileName, exists := h.nameToFile[scriptType][normalizedName]
    if !exists {
        log.Printf("Script name %s (normalized: %s) not found in %s scripts", scriptName, normalizedName, scriptType)
        http.Error(w, "Script not found", http.StatusNotFound)
        return
    }

    if strings.Contains(fileName, "..") {
        http.Error(w, "Invalid script name", http.StatusBadRequest)
        return
    }

    baseDir := h.getScriptBaseDir(scriptType)
    filePath := filepath.Join(baseDir, fileName+".lua")
    log.Printf("Attempting to serve file: %s", filePath)

    absPath, err := filepath.Abs(filePath)
    if err != nil || !strings.HasPrefix(absPath, baseDir) {
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

    parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/scripts/"), "/")
    if len(parts) < 2 {
        http.Error(w, "Invalid download request path", http.StatusBadRequest)
        return
    }

    scriptType := parts[0]
    scriptName := strings.TrimSuffix(parts[1], "/download/")
    scriptName = strings.TrimSuffix(scriptName, "/download")
    
    if scriptType != "module" && scriptType != "command" {
        http.Error(w, "Invalid script type - must be 'module' or 'command'", http.StatusBadRequest)
        return
    }

    if err := h.ensureScriptsLoaded(scriptType); err != nil {
        log.Printf("Error loading scripts for %s: %v", scriptType, err)
        http.Error(w, "Failed to load scripts", http.StatusInternalServerError)
        return
    }

    normalizedName := strings.ToLower(scriptName)
    fileName, exists := h.nameToFile[scriptType][normalizedName]
    if !exists {
        log.Printf("Script name %s (normalized: %s) not found in %s scripts", scriptName, normalizedName, scriptType)
        http.Error(w, "Script not found", http.StatusNotFound)
        return
    }

    if strings.Contains(fileName, "..") {
        http.Error(w, "Invalid script name", http.StatusBadRequest)
        return
    }

    baseDir := h.getScriptBaseDir(scriptType)
    filePath := filepath.Join(baseDir, fileName+".lua")
    log.Printf("Attempting to serve download: %s", filePath)

    absPath, err := filepath.Abs(filePath)
    if err != nil || !strings.HasPrefix(absPath, baseDir) {
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

    w.Header().Set("Content-Type", "application/octet-stream")
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.lua\"", fileName))
    log.Printf("Set Content-Disposition: attachment; filename=\"%s.lua\"", fileName)
    http.ServeFile(w, r, filePath)
}