import type { NextApiRequest, NextApiResponse } from 'next';
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

 
  const origin = req.headers.origin;
  if (origin === 'https://marketplace.flarial.xyz') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  }

  try {
    const ctx = createTRPCContext();
    const caller = appRouter.createCaller(ctx);
    const scripts = await caller.scripts.getAll();
    
    res.status(200).json(scripts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}