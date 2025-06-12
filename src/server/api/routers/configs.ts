import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';

interface ConfigMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloadUrl: string;
  iconUrl: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
}

interface ConfigIndexEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloadUrl: string;
  iconUrl: string;
  filename: string;
  directory: string;
}

class ConfigService {
  private cache: ConfigMetadata[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private async fetchConfigIndex(): Promise<ConfigIndexEntry[]> {
    const indexUrl = `https://cdn.statically.io/gh/flarialmc/configs/main/config-index.json`;
    
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch config index: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  }

  private convertIndexEntryToMetadata(entry: ConfigIndexEntry): ConfigMetadata {
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      author: entry.author,
      version: entry.version,
      downloadUrl: entry.downloadUrl,
      iconUrl: entry.iconUrl,
      filename: entry.filename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async loadConfigsFromIndex(): Promise<ConfigMetadata[]> {
    try {
      const indexEntries = await this.fetchConfigIndex();
      
      const configs: ConfigMetadata[] = indexEntries.map(entry => 
        this.convertIndexEntryToMetadata(entry)
      );

      return configs;
    } catch (error) {
      return [];
    }
  }

  async getConfigs(): Promise<ConfigMetadata[]> {
    const now = Date.now();
    
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const configs = await this.loadConfigsFromIndex();
      this.cache = configs;
      this.cacheExpiry = now + this.CACHE_DURATION;
      return configs;
    } catch (error) {
      const fallback = this.cache || [];
      return fallback;
    }
  }

  async getConfigIcon(configId: string): Promise<{ data: string; contentType: string }> {
    const iconUrl = `https://cdn.statically.io/gh/flarialmc/configs/main/${configId}/icon.png`;
    
    try {
      const response = await fetch(iconUrl);
      if (!response.ok) {
        throw new Error('Icon not found');
      }
      
      const buffer = await response.arrayBuffer();
      return {
        data: Buffer.from(buffer).toString('base64'),
        contentType: 'image/png',
      };
    } catch (error) {
      throw new Error('Icon not found');
    }
  }

  async getConfigArchive(configId: string): Promise<{ data: string; filename: string; contentType: string }> {
    const zipUrl = `https://cdn.statically.io/gh/flarialmc/configs/main/${configId}/${configId}.zip`;
    
    try {
      const response = await fetch(zipUrl);
      if (!response.ok) {
        throw new Error('Config archive not found');
      }
      
      const buffer = await response.arrayBuffer();
      return {
        data: Buffer.from(buffer).toString('base64'),
        filename: `${configId}.zip`,
        contentType: 'application/zip',
      };
    } catch (error) {
      console.error(`Error fetching config archive for ${configId}:`, error);
      throw new Error('Config archive not found');
    }
  }
}

const configService = new ConfigService();

export const configsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    console.log('🔄 tRPC getAll called');
    const configs = await configService.getConfigs();
    console.log('📦 tRPC returning configs:', configs.length);
    return { configs };
  }),

  getIcon: publicProcedure
    .input(z.object({
      configId: z.string(),
    }))
    .query(async ({ input }) => {
      return await configService.getConfigIcon(input.configId);
    }),

  downloadConfig: publicProcedure
    .input(z.object({
      configId: z.string(),
    }))
    .query(async ({ input }) => {
      return await configService.getConfigArchive(input.configId);
    }),
});