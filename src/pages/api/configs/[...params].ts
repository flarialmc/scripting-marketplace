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
  
  if (!params || params.length === 0) {
    return res.status(400).json({ error: 'Invalid request path' });
  }

  const path = params.join('/');
  
  if (path.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  try {
    const ctx = createTRPCContext();
    const caller = appRouter.createCaller(ctx);

    if (path.endsWith('/download')) {
     
      const configId = path.replace('/download', '');
      const result = await caller.configs.downloadConfig({ configId });
      
      const buffer = Buffer.from(result.data, 'base64');
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(buffer);
      
    } else if (path.endsWith('/icon.png')) {
     
      const configId = path.replace('/icon.png', '');
      const result = await caller.configs.getIcon({ configId });
      
      const buffer = Buffer.from(result.data, 'base64');
      res.setHeader('Content-Type', result.contentType);
      res.status(200).send(buffer);
      
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('Config API error:', error);
    if (error instanceof Error && (error.message === 'Config not found' || error.message === 'Icon not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  }
}