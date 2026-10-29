export const DEV_TOKEN = "vnm_dev_local_key";

export interface ApiKeyRecord {
  id: string;
  prefix: string;
  name: string;
  email: string;
  rateLimit: number;
  createdAt: string;
}

export interface KeyStore {
  seedDevKey(): Promise<void>;
  issue(input: { name: string; email: string; rateLimit?: number }): Promise<{ record: ApiKeyRecord; token: string }>;
  authenticate(token: string): Promise<ApiKeyRecord | null>;
  consume(keyId: string, limit: number, nowMs: number): Promise<{ ok: boolean; remaining: number; retryAfter: number }>;
}

const WINDOW_SEC = 60;

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `vnm_${body}`;
}

interface MemoryRow extends ApiKeyRecord {
  hash: string;
}

export class MemoryKeyStore implements KeyStore {
  private rows = new Map<string, MemoryRow>();
  private byHash = new Map<string, MemoryRow>();
  private buckets = new Map<string, Map<number, number>>();

  async seedDevKey(): Promise<void> {
    const hash = await sha256(DEV_TOKEN);
    if (this.byHash.has(hash)) return;
    const row: MemoryRow = {
      id: "key_dev_local",
      hash,
      prefix: DEV_TOKEN.slice(0, 12),
      name: "Local web app",
      email: "dev@vinmeen.local",
      rateLimit: 600,
      createdAt: new Date(0).toISOString(),
    };
    this.rows.set(row.id, row);
    this.byHash.set(hash, row);
  }

  async issue(input: { name: string; email: string; rateLimit?: number }) {
    const token = randomToken();
    const hash = await sha256(token);
    const row: MemoryRow = {
      id: `key_${crypto.randomUUID()}`,
      hash,
      prefix: token.slice(0, 12),
      name: input.name,
      email: input.email,
      rateLimit: input.rateLimit ?? 60,
      createdAt: new Date().toISOString(),
    };
    this.rows.set(row.id, row);
    this.byHash.set(hash, row);
    return { record: publicRow(row), token };
  }

  async authenticate(token: string) {
    const row = this.byHash.get(await sha256(token));
    return row ? publicRow(row) : null;
  }

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

function publicRow(row: MemoryRow): ApiKeyRecord {
  return { id: row.id, prefix: row.prefix, name: row.name, email: row.email, rateLimit: row.rateLimit, createdAt: row.createdAt };
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

  async seedDevKey(): Promise<void> {
    const hash = await sha256(DEV_TOKEN);
    const existing = await this.db.prepare("SELECT id FROM api_keys WHERE key_hash = ?").bind(hash).first<{ id: string }>();
    if (existing) return;
    await this.db
      .prepare(
        "INSERT INTO api_keys (id, key_hash, key_prefix, name, email, rate_limit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("key_dev_local", hash, DEV_TOKEN.slice(0, 12), "Local web app", "dev@vinmeen.local", 600, new Date(0).toISOString())
      .run();
  }

  async issue(input: { name: string; email: string; rateLimit?: number }) {
    const token = randomToken();
    const hash = await sha256(token);
    const record: ApiKeyRecord = {
      id: `key_${crypto.randomUUID()}`,
      prefix: token.slice(0, 12),
      name: input.name,
      email: input.email,
      rateLimit: input.rateLimit ?? 60,
      createdAt: new Date().toISOString(),
    };
    await this.db
      .prepare(
        "INSERT INTO api_keys (id, key_hash, key_prefix, name, email, rate_limit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(record.id, hash, record.prefix, record.name, record.email, record.rateLimit, record.createdAt)
      .run();
    return { record, token };
  }

  async authenticate(token: string) {
    const row = await this.db
      .prepare("SELECT id, key_prefix as prefix, name, email, rate_limit as rateLimit, created_at as createdAt FROM api_keys WHERE key_hash = ? AND revoked = 0")
      .bind(await sha256(token))
      .first<ApiKeyRecord>();
    return row;
  }

  async consume(keyId: string, limit: number, nowMs: number) {
    const start = Math.floor(nowMs / 1000 / WINDOW_SEC) * WINDOW_SEC;
    const row = await this.db
      .prepare(
        `INSERT INTO rate_windows (key_id, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(key_id, window_start) DO UPDATE SET count = count + 1
         RETURNING count`,
      )
      .bind(keyId, start)
      .first<{ count: number }>();
    const count = row?.count ?? 1;
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfter: start + WINDOW_SEC - Math.floor(nowMs / 1000),
    };
  }
}
