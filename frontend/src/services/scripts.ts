import { Script } from '@/types/script';
import { API_CONFIG } from '@/config/api';

class ScriptsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  async listScripts(): Promise<Script[]> {
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.SCRIPTS.LIST}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching scripts:', error);
      throw error;
    }
  }

  async downloadScript(scriptId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.ENDPOINTS.SCRIPTS.DOWNLOAD(scriptId)}`
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
}

export const scriptsService = new ScriptsService();