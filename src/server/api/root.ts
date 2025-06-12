import { createTRPCRouter } from '~/server/api/trpc';
import { scriptsRouter } from '~/server/api/routers/scripts';
import { configsRouter } from '~/server/api/routers/configs';

export const appRouter = createTRPCRouter({
  scripts: scriptsRouter,
  configs: configsRouter,
});

export type AppRouter = typeof appRouter;