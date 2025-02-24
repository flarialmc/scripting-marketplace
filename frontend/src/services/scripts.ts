import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';

export async function listScripts(): Promise<Script[]> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`, {
      cache: 'no-store', // For real-time script updates
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
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
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download script: ${response.statusText}`);
  }

  return response;
}