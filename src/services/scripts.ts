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
    // Convert GitHub raw URL to Statically CDN URL to bypass servers
    const url = script.downloadUrl?.replace(
      'https://raw.githubusercontent.com/',
      'https://cdn.statically.io/gh/'
    ) || `https://cdn.statically.io/gh/flarialmc/lua-scripts/main/scripts/${script.type}/${script.name}.lua`;
    
    console.log('Downloading script from Statically CDN:', url);
    
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
    throw error;
  }
}