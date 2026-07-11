import { handleMarketRequest } from './handler.ts';

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface WorkerCaches {
  default: {
    match(request: Request): Promise<Response | undefined>;
    put(request: Request, response: Response): Promise<unknown>;
  };
}

export default {
  fetch(request: Request, _env: unknown, context: WorkerContext): Promise<Response> {
    const workerCaches = (globalThis as typeof globalThis & { caches: WorkerCaches }).caches;
    return handleMarketRequest(request, {
      fetchUpstream: (input, init) => fetch(input, init),
      cache: workerCaches.default,
      waitUntil: (promise) => context.waitUntil(promise),
      now: () => new Date(),
    });
  },
};
