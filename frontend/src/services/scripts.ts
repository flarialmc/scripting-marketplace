import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';

interface ScriptsResponse {
  modules: Script[];
  commands: Script[];
}

export async function listScripts(): Promise<Script[]> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`, {
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
    // Combine modules and commands into a single array
    return [...(data.modules || []), ...(data.commands || [])];
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return []; // Return empty array instead of throwing to prevent UI errors
  }
}

export async function getScriptDownloadResponse(name: string, scriptType: 'module' | 'command'): Promise<Response> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/scripts/${scriptType}/${name}/download`,
      {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to download script: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('Error downloading script:', error);
    throw error; // Rethrow as this is likely used directly by download functions
  }
}