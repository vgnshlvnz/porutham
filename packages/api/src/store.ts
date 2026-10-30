/** Per-caller request windows. The D1 `api_keys` table is unused and left in place. */

/** Finished readings stay readable for a week, then rows are deleted. */
export const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 32 bytes, unpadded base64url. 256 bits, above the 128-bit floor. */
export const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export type ConsumeShareResult =
  | { status: "ok"; report: unknown; expiresAt: string }
  | { status: "gone" }
  | { status: "missing" };

export interface KeyStore {
  consume(bucketId: string, limit: number, nowMs: number): Promise<{ ok: boolean; remaining: number; retryAfter: number }>;
  createShare(snapshot: unknown, nowMs: number, ttlMs: number): Promise<{ token: string; expiresAt: string }>;
  /** Claim a live share. A second call, or an expired row, is `gone`. */
  consumeShare(token: string, nowMs: number): Promise<ConsumeShareResult>;
}

const WINDOW_SEC = 60;

function randomShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

interface MemoryShare {
  snapshot: unknown;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}

export class MemoryKeyStore implements KeyStore {
  private buckets = new Map<string, Map<number, number>>();
  private shares = new Map<string, MemoryShare>();

  async consume(bucketId: string, limit: number, nowMs: number) {
    let windows = this.buckets.get(bucketId);
    if (!windows) {
      windows = new Map();
      this.buckets.set(bucketId, windows);
    }
    return bump(windows, limit, nowMs);
  }

  async createShare(snapshot: unknown, nowMs: number, ttlMs: number) {
    const token = randomShareToken();
    const createdAt = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + ttlMs).toISOString();
    this.shares.set(token, { snapshot, createdAt, expiresAt, consumedAt: null });
    this.purgeShares(nowMs);
    return { token, expiresAt };
  }

  async consumeShare(token: string, nowMs: number): Promise<ConsumeShareResult> {
    const nowIso = new Date(nowMs).toISOString();
    const row = this.shares.get(token);
    let result: ConsumeShareResult;
    if (!row) result = { status: "missing" };
    else if (row.consumedAt || row.expiresAt <= nowIso) result = { status: "gone" };
    else {
      row.consumedAt = nowIso;
      result = { status: "ok", report: row.snapshot, expiresAt: row.expiresAt };
    }
    this.purgeShares(nowMs);
    return result;
  }

  private purgeShares(nowMs: number) {
    const nowIso = new Date(nowMs).toISOString();
    for (const [token, row] of this.shares) {
      if (row.expiresAt <= nowIso) this.shares.delete(token);
    }
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

interface D1RunResult<T = unknown> {
  results?: T[];
  meta?: { changes?: number };
}

interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      run<T = unknown>(): Promise<D1RunResult<T>>;
    };
  };
  /** Present on D1. Pins the follow-up read to the primary that just wrote. */
  withSession?(mode: "first-primary"): D1Like;
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

  async createShare(snapshot: unknown, nowMs: number, ttlMs: number) {
    const token = randomShareToken();
    const createdAt = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + ttlMs).toISOString();
    const db = this.primary();
    await db
      .prepare("INSERT INTO shares (token, snapshot, created_at, expires_at) VALUES (?, ?, ?, ?)")
      .bind(token, JSON.stringify(snapshot), createdAt, expiresAt)
      .run();
    await db.prepare("DELETE FROM shares WHERE expires_at <= ?").bind(createdAt).run();
    return { token, expiresAt };
  }

  async consumeShare(token: string, nowMs: number): Promise<ConsumeShareResult> {
    const nowIso = new Date(nowMs).toISOString();
    const db = this.primary();
    const claimed = await db
      .prepare(
        `UPDATE shares SET consumed_at = ?
         WHERE token = ? AND consumed_at IS NULL AND expires_at > ?
         RETURNING snapshot, expires_at`,
      )
      .bind(nowIso, token, nowIso)
      .run<{ snapshot: string; expires_at: string }>();
    let result: ConsumeShareResult;
    if ((claimed.meta?.changes ?? 0) === 1) {
      const row = claimed.results?.[0];
      const follow =
        row ??
        (await db
          .prepare("SELECT snapshot, expires_at FROM shares WHERE token = ?")
          .bind(token)
          .first<{ snapshot: string; expires_at: string }>());
      result = follow
        ? { status: "ok", report: JSON.parse(follow.snapshot) as unknown, expiresAt: follow.expires_at }
        : { status: "missing" };
    } else {
      const existing = await db.prepare("SELECT token FROM shares WHERE token = ?").bind(token).first<{ token: string }>();
      result = existing ? { status: "gone" } : { status: "missing" };
    }
    await db.prepare("DELETE FROM shares WHERE expires_at <= ?").bind(nowIso).run();
    return result;
  }

  /** Read-your-writes. Falls back when the binding has no session API (tests). */
  private primary(): D1Like {
    return this.db.withSession?.("first-primary") ?? this.db;
  }
}
