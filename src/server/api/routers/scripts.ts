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

interface ScriptIndexEntry {
  filename: string;
  name: string;
  description: string;
  author: string;
  version: string;
  type: 'module' | 'command';
  path: string;
}

class ScriptService {
  private cache: { module: ScriptMetadata[]; command: ScriptMetadata[] } | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private async fetchScriptIndex(scriptType: 'module' | 'command'): Promise<ScriptIndexEntry[]> {
    const indexUrl = `https://cdn.statically.io/gh/flarialmc/scripts/main/${scriptType}-index.json`;
    
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${scriptType} index: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  }

  private async fetchScriptContent(scriptType: 'module' | 'command', filename: string): Promise<string> {
    const scriptUrl = `https://cdn.statically.io/gh/flarialmc/scripts/main/${scriptType}/${filename}`;
    
    const response = await fetch(scriptUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch script: ${response.statusText}`);
    }
    return response.text();
  }

  private convertIndexEntryToMetadata(entry: ScriptIndexEntry): ScriptMetadata {
    return {
      id: `${entry.type}-${entry.filename.replace('.lua', '')}`,
      name: entry.name || entry.filename.replace('.lua', ''),
      description: entry.description || '',
      author: entry.author || '',
      type: entry.type,
      version: entry.version || '1.0.0',
      downloadUrl: `https://cdn.statically.io/gh/flarialmc/scripts/main/${entry.path}`,
      filename: entry.filename.replace('.lua', ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl: '',
    };
  }

  private async loadScriptsFromIndex(scriptType: 'module' | 'command'): Promise<ScriptMetadata[]> {
    try {
      const indexEntries = await this.fetchScriptIndex(scriptType);
      
      const scripts: ScriptMetadata[] = indexEntries.map(entry => 
        this.convertIndexEntryToMetadata(entry)
      );

      return scripts;
    } catch {
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
        this.loadScriptsFromIndex('module'),
        this.loadScriptsFromIndex('command')
      ]);

      this.cache = {
        module: moduleScripts,
        command: commandScripts,
      };
      this.cacheExpiry = now + this.CACHE_DURATION;

      return this.cache;
    } catch {
      const fallback = this.cache || { module: [], command: [] };
      return fallback;
    }
  }

  async getScript(scriptType: 'module' | 'command', scriptName: string): Promise<string> {
    try {
      const indexEntries = await this.fetchScriptIndex(scriptType);
      const entry = indexEntries.find(e => 
        e.filename.replace('.lua', '').toLowerCase() === scriptName.toLowerCase()
      );
      
      if (!entry) {
        throw new Error('Script not found in index');
      }

      return await this.fetchScriptContent(scriptType, entry.filename);
    } catch {
      throw new Error('Failed to fetch script');
    }
  }
}

const scriptService = new ScriptService();

export const scriptsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    const scripts = await scriptService.getScripts();
    return scripts;
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