import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';
import { sampleScripts } from '@/data/sampleScripts';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function listScripts(): Promise<Script[]> {
  if (isDevelopment) {
    // Use sample data in development
    return Promise.resolve(sampleScripts);
  }

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
    // Return sample data as fallback in development
    if (isDevelopment) {
      console.warn('Using sample data as fallback in development mode');
      return sampleScripts;
    }
    throw error;
  }
}

export async function downloadScript(scriptId: string): Promise<void> {
  if (isDevelopment) {
    console.warn('Download functionality is mocked in development mode');
    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return;
  }

  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCRIPTS.DOWNLOAD(scriptId)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const contentDisposition = response.headers.get('content-disposition');
    const filenameMatch = contentDisposition?.match(/filename=(.+\.tar\.gz)/);
    
    a.href = url;
    a.download = filenameMatch?.[1] || `script-${scriptId}.tar.gz`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading script:', error);
    throw error;
  }
}