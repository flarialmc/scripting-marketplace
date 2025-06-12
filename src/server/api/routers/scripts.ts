import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { promises as fs } from 'fs';
import path from 'path';


interface ScriptMetadata {
  name: string;
  description: string;
  author: string;
  type: 'module' | 'command';
}

class ScriptService {
  private moduleDir: string;
  private commandDir: string;
  private nameToFile: Map<string, Map<string, string>>;
  private moduleScripts: ScriptMetadata[];
  private commandScripts: ScriptMetadata[];

  constructor() {
    this.moduleDir = path.resolve(process.cwd(), 'scripts/module');
    this.commandDir = path.resolve(process.cwd(), 'scripts/command');
    this.nameToFile = new Map();
    this.moduleScripts = [];
    this.commandScripts = [];
    
    // Initialize the service
    this.initialize();
  }

  private async initialize() {
    try {
      this.moduleScripts = await this.listScripts(this.moduleDir, 'module');
      this.commandScripts = await this.listScripts(this.commandDir, 'command');
    } catch (error) {
      console.error('Error initializing script service:', error);
    }
  }

  private async listScripts(dir: string, scriptType: 'module' | 'command'): Promise<ScriptMetadata[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      if (!this.nameToFile.has(scriptType)) {
        this.nameToFile.set(scriptType, new Map());
      }

      const scripts: ScriptMetadata[] = [];
      
      for (const entry of entries) {
        if (entry.isDirectory() || !entry.name.endsWith('.lua')) {
          continue;
        }

        const scriptPath = path.join(dir, entry.name);
        const fileName = path.parse(entry.name).name;
        
        try {
          const content = await fs.readFile(scriptPath, 'utf-8');
          const metadata = this.parseScriptMetadata(content, scriptType);
          
          if (!metadata.name) {
            metadata.name = fileName;
          }

          const normalizedName = metadata.name.toLowerCase();
          this.nameToFile.get(scriptType)?.set(normalizedName, fileName);
          
          scripts.push(metadata);
        } catch (err) {
          console.error(`Error processing script ${scriptPath}:`, err);
        }
      }

      return scripts;
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
      return [];
    }
  }

  private parseScriptMetadata(content: string, scriptType: 'module' | 'command'): ScriptMetadata {
    const metadata: ScriptMetadata = {
      name: '',
      description: '',
      author: '',
      type: scriptType,
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
    }

    return metadata;
  }

  async getScripts() {
    // Refresh data if needed
    if (this.moduleScripts.length === 0 && this.commandScripts.length === 0) {
      await this.initialize();
    }
    
    return {
      module: this.moduleScripts,
      command: this.commandScripts,
    };
  }

  async getScript(scriptType: 'module' | 'command', scriptName: string): Promise<string> {
    const normalizedName = scriptName.toLowerCase();
    const fileName = this.nameToFile.get(scriptType)?.get(normalizedName);
    
    if (!fileName) {
      throw new Error('Script not found');
    }

    const baseDir = scriptType === 'module' ? this.moduleDir : this.commandDir;
    const filePath = path.join(baseDir, `${fileName}.lua`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch {
      throw new Error('Failed to read script file');
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