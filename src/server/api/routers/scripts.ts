import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';

interface ScriptMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  type: 'module' | 'command';
  version: string;
  downloadUrl: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
}

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

class ScriptService {
  private cache: { module: ScriptMetadata[]; command: ScriptMetadata[] } | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private async fetchGitHubDirectory(path: string): Promise<GitHubFile[]> {
    const response = await fetch(`https://api.github.com/repos/flarialmc/scripts/contents/${path}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub directory: ${response.statusText}`);
    }
    return response.json();
  }

  private async fetchScriptContent(downloadUrl: string): Promise<string> {
    // Try Statically.io first as it's more reliable for raw file access
    const staticUrl = downloadUrl.replace('https://raw.githubusercontent.com/', 'https://cdn.statically.io/gh/');
    
    try {
      console.log('Trying Statically.io:', staticUrl);
      const response = await fetch(staticUrl);
      if (response.ok) {
        return response.text();
      }
      console.log('Statically.io failed, falling back to GitHub raw');
    } catch (error) {
      console.log('Statically.io error, falling back to GitHub raw:', error);
    }

    // Fallback to GitHub raw
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch script content: ${response.statusText}`);
    }
    return response.text();
  }

  private parseScriptMetadata(content: string, scriptType: 'module' | 'command', fileName: string): ScriptMetadata {
    const metadata = {
      id: `${scriptType}-${fileName.replace('.lua', '')}`,
      name: '',
      description: '',
      author: '',
      type: scriptType,
      version: '1.0.0',
      downloadUrl: `https://cdn.statically.io/gh/flarialmc/scripts/main/${scriptType}/${fileName}`,
      filename: fileName.replace('.lua', ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl: '',
    };

    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }

      if (trimmed.startsWith('name = ')) {
        const value = trimmed.split('=')[1]?.trim();
        if (value) {
          metadata.name = value.replace(/["']/g, '');
        }
      }

      if (trimmed.startsWith('description = ')) {
        const value = trimmed.split('=')[1]?.trim();
        if (value) {
          metadata.description = value.replace(/["']/g, '');
        }
      }

      if (trimmed.startsWith('author = ')) {
        const value = trimmed.split('=')[1]?.trim();
        if (value) {
          metadata.author = value.replace(/["']/g, '');
        }
      }

      if (trimmed.startsWith('version = ')) {
        const value = trimmed.split('=')[1]?.trim();
        if (value) {
          metadata.version = value.replace(/["']/g, '');
        }
      }
    }

    return metadata;
  }

  private async loadScriptsFromGitHub(scriptType: 'module' | 'command'): Promise<ScriptMetadata[]> {
    try {
      const files = await this.fetchGitHubDirectory(scriptType);
      const scripts: ScriptMetadata[] = [];

      for (const file of files) {
        if (file.type === 'file' && file.name.endsWith('.lua')) {
          try {
            const content = await this.fetchScriptContent(file.download_url);
            const metadata = this.parseScriptMetadata(content, scriptType, file.name);
            
            if (!metadata.name) {
              metadata.name = file.name.replace('.lua', '');
            }

            scripts.push(metadata);
          } catch (err) {
            console.error(`Error processing script ${file.name}:`, err);
          }
        }
      }

      return scripts;
    } catch (error) {
      console.error(`Error loading ${scriptType} scripts from GitHub:`, error);
      return [];
    }
  }

  async getScripts() {
    const now = Date.now();
    
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const [moduleScripts, commandScripts] = await Promise.all([
        this.loadScriptsFromGitHub('module'),
        this.loadScriptsFromGitHub('command')
      ]);

      this.cache = {
        module: moduleScripts,
        command: commandScripts,
      };
      this.cacheExpiry = now + this.CACHE_DURATION;

      return this.cache;
    } catch (error) {
      console.error('Error fetching scripts from GitHub:', error);
      return this.cache || { module: [], command: [] };
    }
  }

  async getScript(scriptType: 'module' | 'command', scriptName: string): Promise<string> {
    try {
      const files = await this.fetchGitHubDirectory(scriptType);
      const file = files.find(f => f.name.replace('.lua', '').toLowerCase() === scriptName.toLowerCase());
      
      if (!file) {
        throw new Error('Script not found');
      }

      return await this.fetchScriptContent(file.download_url);
    } catch (error) {
      console.error(`Error fetching script ${scriptName}:`, error);
      throw new Error('Failed to fetch script');
    }
  }
}

const scriptService = new ScriptService();

export const scriptsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return await scriptService.getScripts();
  }),

  getScript: publicProcedure
    .input(z.object({
      type: z.enum(['module', 'command']),
      name: z.string(),
    }))
    .query(async ({ input }) => {
      return await scriptService.getScript(input.type, input.name);
    }),

  downloadScript: publicProcedure
    .input(z.object({
      type: z.enum(['module', 'command']),
      name: z.string(),
    }))
    .query(async ({ input }) => {
      const content = await scriptService.getScript(input.type, input.name);
      return {
        content,
        filename: `${input.name}.lua`,
      };
    }),
});