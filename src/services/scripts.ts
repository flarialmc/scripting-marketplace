import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';


interface ScriptsResponse {
  module: Script[];
  command: Script[];
}

export async function listScripts(): Promise<Script[]> {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`;
    console.log('Fetching scripts from:', url);
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
    console.log('Fetched scripts data:', data);
   
    return [...(data.module || []), ...(data.command || [])];
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return [];
  }
}

export async function getScriptDownloadResponse(script: Script): Promise<Response> {
  try {
    // Use the server-side proxy endpoint to avoid CORS issues
    const url = `${API_CONFIG.BASE_URL}/api/scripts/${script.type}/${script.filename}/download`;
    
    console.log('Downloading script via server proxy:', url);
    console.log('Script metadata:', { name: script.name, type: script.type });
    
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/octet-stream, */*',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch from server proxy: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to download script: ${response.statusText}`);
    }
    
    console.log('Successfully fetched script via server proxy');
    return response;
  } catch (error) {
    console.error('Error downloading script:', error);
    throw error;
  }
}