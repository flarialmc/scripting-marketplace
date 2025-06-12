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
    console.log(`🔗 Fetching config index:`, indexUrl);
    
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch config index: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📚 Loaded ${data.length} configs from index`);
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
      console.log('🔍 Loading configs from index...');
      const indexEntries = await this.fetchConfigIndex();
      
      const configs: ConfigMetadata[] = indexEntries.map(entry => 
        this.convertIndexEntryToMetadata(entry)
      );

      console.log(`✅ Successfully loaded ${configs.length} configs`);
      return configs;
    } catch (error) {
      console.error(`❌ Error loading configs from index:`, error);
      return [];
    }
  }

  async getConfigs(): Promise<ConfigMetadata[]> {
    console.log('🔄 getConfigs() called');
    const now = Date.now();
    
    if (this.cache && now < this.cacheExpiry) {
      console.log('💾 Returning cached configs:', this.cache.length);
      return this.cache;
    }

    console.log('🆕 Cache expired or empty, loading fresh configs...');
    try {
      const configs = await this.loadConfigsFromIndex();
      console.log('💾 Caching configs:', configs.length);
      this.cache = configs;
      this.cacheExpiry = now + this.CACHE_DURATION;
      return configs;
    } catch (error) {
      console.error('❌ Error fetching configs:', error);
      const fallback = this.cache || [];
      console.log('🔄 Returning fallback configs:', fallback.length);
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
      console.error(`Error fetching icon for ${configId}:`, error);
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