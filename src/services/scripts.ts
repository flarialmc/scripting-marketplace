import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';


interface ScriptsResponse {
  module: Script[];
  command: Script[];
}

export async function listScripts(): Promise<Script[]> {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`;
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
   
    return [...(data.module || []), ...(data.command || [])];
  } catch (error) {
    return [];
  }
}

export async function getScriptDownloadResponse(script: Script): Promise<Response> {
  try {
    const url = `${API_CONFIG.BASE_URL}/api/scripts/${script.type}/${script.filename}/download`;
    
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/octet-stream, */*',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download script: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
}