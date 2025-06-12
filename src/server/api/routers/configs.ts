import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';

interface ConfigMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  [key: string]: unknown;
}

class ConfigService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'configs');
  }

  async getConfigs(): Promise<ConfigMetadata[]> {
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const configs: ConfigMetadata[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const metadataPath = path.join(this.baseDir, entry.name, 'main.json');
        
        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const configInfo = JSON.parse(metadataContent) as ConfigMetadata;
          
          // Ensure essential fields exist
          if (!configInfo.name) {
            configInfo.name = entry.name;
          }
          configInfo.id = entry.name;
          
          configs.push(configInfo);
        } catch (err) {
          console.error(`Error reading metadata for ${entry.name}:`, err);
        }
      }

      return configs;
    } catch (err) {
      console.error('Error reading configs directory:', err);
      return [];
    }
  }

  private async findConfigDirCaseInsensitive(configID: string): Promise<string> {
    const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
    const lowerConfigID = configID.toLowerCase();
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.toLowerCase() === lowerConfigID) {
        return entry.name;
      }
    }
    
    throw new Error('Config not found');
  }

  async getConfigIcon(configID: string): Promise<Buffer> {
    const actualConfigName = await this.findConfigDirCaseInsensitive(configID);
    const iconPath = path.join(this.baseDir, actualConfigName, 'icon.png');
    
    try {
      return await fs.readFile(iconPath);
    } catch {
      throw new Error('Icon not found');
    }
  }

  async getConfigArchive(configID: string): Promise<{ buffer: Buffer; filename: string }> {
    const actualConfigName = await this.findConfigDirCaseInsensitive(configID);
    const configDir = path.join(this.baseDir, actualConfigName);
    
    // Check if directory exists
    try {
      const stat = await fs.stat(configDir);
      if (!stat.isDirectory()) {
        throw new Error('Config not found');
      }
    } catch {
      throw new Error('Config not found');
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, filename: `${actualConfigName}.zip` });
      });
      archive.on('error', reject);

      // Add all files from the config directory
      archive.directory(configDir, false);
      archive.finalize();
    });
  }
}

const configService = new ConfigService();

export const configsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    const configs = await configService.getConfigs();
    return { configs };
  }),

  getIcon: publicProcedure
    .input(z.object({
      configId: z.string(),
    }))
    .query(async ({ input }) => {
      const iconBuffer = await configService.getConfigIcon(input.configId);
      // Convert buffer to base64 for transmission
      return {
        data: iconBuffer.toString('base64'),
        contentType: 'image/png',
      };
    }),

  downloadConfig: publicProcedure
    .input(z.object({
      configId: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await configService.getConfigArchive(input.configId);
      return {
        data: result.buffer.toString('base64'),
        filename: result.filename,
        contentType: 'application/zip',
      };
    }),
});