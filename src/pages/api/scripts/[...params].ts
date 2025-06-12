import type { NextApiRequest, NextApiResponse } from 'next';
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

 
  const origin = req.headers.origin;
  const allowedOrigins = ['https://marketplace.flarial.xyz', 'http://localhost:3000'];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  }

  const params = req.query.params as string[];
  
  if (!params || params.length < 2) {
    return res.status(400).json({ error: 'Invalid request path - specify type (module/command) and script name' });
  }

  const [scriptType, scriptName, action] = params;
  
  if (scriptType !== 'module' && scriptType !== 'command') {
    return res.status(400).json({ error: 'Invalid script type - must be "module" or "command"' });
  }

  try {
    const ctx = createTRPCContext();
    const caller = appRouter.createCaller(ctx);

    if (action === 'download') {
     
      const result = await caller.scripts.downloadScript({
        type: scriptType as 'module' | 'command',
        name: scriptName,
      });

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.content);
    } else {
     
      const content = await caller.scripts.getScript({
        type: scriptType as 'module' | 'command',
        name: scriptName,
      });

      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(content);
    }
  } catch (error) {
    console.error('Error handling script request:', error);
    if (error instanceof Error && error.message === 'Script not found') {
      res.status(404).json({ error: 'Script not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}