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
    console.log(`🔗 Fetching ${scriptType} index:`, indexUrl);
    
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${scriptType} index: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📚 Loaded ${data.length} ${scriptType} scripts from index`);
    return data;
  }

  private async fetchScriptContent(scriptType: 'module' | 'command', filename: string): Promise<string> {
    const scriptUrl = `https://cdn.statically.io/gh/flarialmc/scripts/main/${scriptType}/${filename}`;
    console.log('🔗 Fetching script:', scriptUrl);
    
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
      console.log(`🔍 Loading ${scriptType} scripts from index...`);
      const indexEntries = await this.fetchScriptIndex(scriptType);
      
      const scripts: ScriptMetadata[] = indexEntries.map(entry => 
        this.convertIndexEntryToMetadata(entry)
      );

      console.log(`✅ Successfully loaded ${scripts.length} ${scriptType} scripts`);
      return scripts;
    } catch (error) {
      console.error(`❌ Error loading ${scriptType} scripts from index:`, error);
      return [];
    }
  }

  async getScripts() {
    console.log('🔄 getScripts() called');
    const now = Date.now();
    
    if (this.cache && now < this.cacheExpiry) {
      console.log('💾 Returning cached scripts');
      return this.cache;
    }

    console.log('🆕 Cache expired or empty, loading fresh scripts...');
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

      console.log(`💾 Cached ${moduleScripts.length} modules and ${commandScripts.length} commands`);
      return this.cache;
    } catch (error) {
      console.error('❌ Error fetching scripts:', error);
      const fallback = this.cache || { module: [], command: [] };
      console.log('🔄 Returning fallback scripts');
      return fallback;
    }
  }

  async getScript(scriptType: 'module' | 'command', scriptName: string): Promise<string> {
    try {
      console.log(`🔍 Fetching ${scriptType} script: ${scriptName}`);
      const indexEntries = await this.fetchScriptIndex(scriptType);
      const entry = indexEntries.find(e => 
        e.filename.replace('.lua', '').toLowerCase() === scriptName.toLowerCase()
      );
      
      if (!entry) {
        throw new Error('Script not found in index');
      }

      return await this.fetchScriptContent(scriptType, entry.filename);
    } catch (error) {
      console.error(`❌ Error fetching script ${scriptName}:`, error);
      throw new Error('Failed to fetch script');
    }
  }
}

const scriptService = new ScriptService();

export const scriptsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    console.log('🔄 tRPC scripts.getAll called');
    const scripts = await scriptService.getScripts();
    console.log(`📦 tRPC returning ${scripts.module.length} modules and ${scripts.command.length} commands`);
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