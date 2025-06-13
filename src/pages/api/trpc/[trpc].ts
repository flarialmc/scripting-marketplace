import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '~/server/api/root';

export default createNextApiHandler({
  router: appRouter,
  createContext: () => ({}),
  onError: undefined,
});