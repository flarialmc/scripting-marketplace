import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';
import { sampleScripts } from '@/data/sampleScripts';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function listScripts(): Promise<Script[]> {
  if (isDevelopment) {
    console.log('Using sample data in development mode');
    return sampleScripts;
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`, {
      cache: 'no-store', // For real-time script updates
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ensure we always return an array
    if (!Array.isArray(data)) {
      console.error('API did not return an array:', data);
      if (isDevelopment) {
        console.warn('Falling back to sample data');
        return sampleScripts;
      }
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching scripts:', error);
    if (isDevelopment) {
      console.warn('Using sample data due to error');
      return sampleScripts;
    }
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