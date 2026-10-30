/** Per-caller request windows. The D1 `api_keys` table is unused and left in place. */
export interface KeyStore {
  consume(bucketId: string, limit: number, nowMs: number): Promise<{ ok: boolean; remaining: number; retryAfter: number }>;
}

const WINDOW_SEC = 60;

export class MemoryKeyStore implements KeyStore {
  private buckets = new Map<string, Map<number, number>>();

  async consume(bucketId: string, limit: number, nowMs: number) {
    let windows = this.buckets.get(bucketId);
    if (!windows) {
      windows = new Map();
      this.buckets.set(bucketId, windows);
    }
    return bump(windows, limit, nowMs);
  }
}

function bump(windows: Map<number, number>, limit: number, nowMs: number) {
  const start = Math.floor(nowMs / 1000 / WINDOW_SEC) * WINDOW_SEC;
  const count = (windows.get(start) ?? 0) + 1;
  windows.set(start, count);
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: start + WINDOW_SEC - Math.floor(nowMs / 1000),
  };
}

interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
}

export class D1KeyStore implements KeyStore {
  constructor(private db: D1Like) {}

  async consume(bucketId: string, limit: number, nowMs: number) {
    const start = Math.floor(nowMs / 1000 / WINDOW_SEC) * WINDOW_SEC;
    const row = await this.db
      .prepare(
        `INSERT INTO rate_windows (key_id, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(key_id, window_start) DO UPDATE SET count = count + 1
         RETURNING count`,
      )
      .bind(bucketId, start)
      .first<{ count: number }>();
    const count = row?.count ?? 1;
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfter: start + WINDOW_SEC - Math.floor(nowMs / 1000),
    };
  }
}
