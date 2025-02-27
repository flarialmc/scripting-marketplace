import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';

interface ScriptsResponse {
  scripts: Script[];
}

export async function listScripts(): Promise<Script[]> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`, {
      cache: 'no-store',
      mode: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as ScriptsResponse;
    return data.scripts || [];
    
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return []; // Return empty array instead of throwing to prevent UI errors
  }
}

export async function getScriptDownloadResponse(scriptId: string): Promise<Response> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.DOWNLOAD(scriptId)}`,
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