import { Config } from '@/types/config';
import { API_CONFIG } from '@/config/api';

interface ConfigsResponse {
  configs: Config[];
}

export async function listConfigs(): Promise<Config[]> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONFIGS.LIST}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds, then revalidate
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as ConfigsResponse;
    return data.configs || [];
  } catch {
    return [];
  }
}

export async function getConfigDownloadResponse(configId: string): Promise<Response> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONFIGS.DOWNLOAD(configId)}`,
      {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download config: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    throw error;
  }
}
