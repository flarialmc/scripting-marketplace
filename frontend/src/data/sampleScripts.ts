import { Script } from '@/types/script';

export const sampleScripts: Script[] = [
  {
    id: 'test-script',
    name: 'Test Script',
    description: 'A sample test script demonstrating Flarial scripting capabilities.',
    version: '1.0.0',
    author: 'Flarial Team',
    downloadUrl: '/api/scripts/test-script/download',
    createdAt: '2024-02-24T00:00:00Z',
    updatedAt: '2024-02-24T00:00:00Z',
  },
  {
    id: 'hello-world',
    name: 'Hello World',
    description: 'A basic hello world script to get started with Flarial.',
    version: '1.0.0',
    author: 'Flarial Community',
    downloadUrl: '/api/scripts/hello-world/download',
    createdAt: '2024-02-24T00:00:00Z',
    updatedAt: '2024-02-24T00:00:00Z',
  }
];