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

class ConfigService {
  private cache: ConfigMetadata[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  // Hardcoded list of config directories from the repository
  private readonly CONFIG_DIRECTORIES = [
    'Astral UI',
    'BetterFlarial',
    'Default',
    'Fluro',
    'Lunar Client',
    'Material',
    'Monsoon',
    'NG Flex',
    'Phantom Force',
    'Photon',
    'Solstice',
    'Stratus',
    'Vortex'
  ];

  private async fetchFileContent(url: string): Promise<string> {
    console.log('🔗 Fetching:', url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return response.text();
  }

  private parseConfigMetadata(content: string, configName: string): ConfigMetadata {
    const metadata = {
      id: configName,
      name: configName,
      description: '',
      author: '',
      version: '1.0.0',
      downloadUrl: `https://cdn.statically.io/gh/flarialmc/configs/main/${configName}/${configName}.zip`,
      iconUrl: `https://cdn.statically.io/gh/flarialmc/configs/main/${configName}/icon.png`,
      filename: configName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const configData = JSON.parse(content);
      if (configData.name) metadata.name = configData.name;
      if (configData.description) metadata.description = configData.description;
      if (configData.author) metadata.author = configData.author;
      if (configData.version) metadata.version = configData.version;
    } catch (error) {
      console.log(`⚠️ Error parsing config metadata for ${configName}:`, error);
    }

    return metadata;
  }

  private async loadConfigsFromStatically(): Promise<ConfigMetadata[]> {
    console.log('🔍 Loading configs from Statically.io...');
    const configs: ConfigMetadata[] = [];

    for (const configName of this.CONFIG_DIRECTORIES) {
      try {
        console.log(`📂 Processing config: ${configName}`);
        const mainJsonUrl = `https://cdn.statically.io/gh/flarialmc/configs/main/${configName}/main.json`;
        
        try {
          const content = await this.fetchFileContent(mainJsonUrl);
          const metadata = this.parseConfigMetadata(content, configName);
          configs.push(metadata);
          console.log(`✅ Added config with metadata: ${configName}`);
        } catch (error) {
          console.log(`⚠️ No main.json found for ${configName}, using default metadata`);
          const metadata = this.parseConfigMetadata('{}', configName);
          configs.push(metadata);
          console.log(`✅ Added default config: ${configName}`);
        }
      } catch (error) {
        console.error(`❌ Error processing config ${configName}:`, error);
        // Still add the config with default metadata
        const metadata = this.parseConfigMetadata('{}', configName);
        configs.push(metadata);
        console.log(`✅ Added fallback config: ${configName}`);
      }
    }

    console.log(`🎉 Successfully loaded ${configs.length} configs`);
    return configs;
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
      const configs = await this.loadConfigsFromStatically();
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