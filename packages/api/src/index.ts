import { createApp } from "./app.js";
import { D1KeyStore, MemoryKeyStore, type KeyStore } from "./store.js";

export interface Env {
  DB?: D1Database;
  RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  ENVIRONMENT?: string;
  /** Comma-separated browser origins allowed to call the API, besides this host. */
  FIRST_PARTY_ORIGINS?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

let memory: MemoryKeyStore | undefined;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const app = createApp({
      store: storeFor(env),
      environment: env.ENVIRONMENT,
      rateLimiter: env.RATE_LIMITER,
      firstPartyOrigins: env.FIRST_PARTY_ORIGINS,
    });
    if (url.pathname.startsWith("/api/")) return app.fetch(request);
    // /s/:token and /result?share= are the SPA shell. A preview fetch of the HTML
    // must not consume the share; only GET /api/v1/shares/:token does.
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return app.fetch(request);
  },
};

function storeFor(env: Env): KeyStore {
  if (env.DB) return new D1KeyStore(env.DB);
  return (memory ??= new MemoryKeyStore());
}
