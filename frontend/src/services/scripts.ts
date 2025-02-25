import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';

interface ScriptsResponse {
  scripts: Script[];
}

export async function listScripts(): Promise<Script[]> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`, {
      cache: 'no-store',
      mode: 'cors', // Add CORS mode
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as ScriptsResponse;
    return data.scripts || [];
    
  } catch (error) {
    console.error('Error fetching scripts:', error);
    throw error;
  }
}

export async function getScriptDownloadResponse(scriptId: string): Promise<Response> {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.DOWNLOAD(scriptId)}`,
    {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors', // Add CORS mode
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download script: ${response.statusText}`);
  }

  return response;
}
