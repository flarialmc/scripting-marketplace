export interface ScriptMetadata {
  name: string;
  description: string;
  author: string;
  type: 'module' | 'command';
}

export interface ConfigMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  [key: string]: unknown;
}

export interface ScriptResponse {
  module: ScriptMetadata[];
  command: ScriptMetadata[];
}

export interface ConfigResponse {
  configs: ConfigMetadata[];
}