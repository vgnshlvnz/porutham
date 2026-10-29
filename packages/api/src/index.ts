import { createApp } from "./app.js";
import { D1KeyStore, MemoryKeyStore, type KeyStore } from "./store.js";

export interface Env {
  DB?: D1Database;
  RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  ENVIRONMENT?: string;
  /** Comma-separated browser origins that may call the API without a key. */
  FIRST_PARTY_ORIGINS?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

let memory: MemoryKeyStore | undefined;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const store = await storeFor(env);
    const app = createApp({
      store,
      environment: env.ENVIRONMENT,
      rateLimiter: env.RATE_LIMITER,
      firstPartyOrigins: env.FIRST_PARTY_ORIGINS,
    });
    if (url.pathname.startsWith("/api/")) return app.fetch(request);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return app.fetch(request);
  },
};

async function storeFor(env: Env): Promise<KeyStore> {
  const store = env.DB ? new D1KeyStore(env.DB) : (memory ??= new MemoryKeyStore());
  if (env.ENVIRONMENT !== "production") await store.seedDevKey();
  return store;
}
