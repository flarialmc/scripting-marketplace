import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';

// Update interface to match the back-end's singular keys
interface ScriptsResponse {
  module: Script[];
  command: Script[];
}

export async function listScripts(): Promise<Script[]> {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`;
    console.log('Fetching scripts from:', url); // Debug log
    const response = await fetch(url, {
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as ScriptsResponse;
    console.log('Fetched scripts data:', data); // Debug log
    // Combine module and command into a single array, with fallback for missing keys
    return [...(data.module || []), ...(data.command || [])];
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return []; // Return empty array on error to prevent UI crashes
  }
}

export async function getScriptDownloadResponse(name: string, scriptType: 'module' | 'command'): Promise<Response> {
  try {
    const url = `${API_CONFIG.BASE_URL}/api/scripts/${scriptType}/${name}/download`;
    console.log('Downloading script from:', url); // Debug log
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download script: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('Error downloading script:', error);
    throw error; // Rethrow for caller to handle (e.g., in ScriptCard)
  }
}