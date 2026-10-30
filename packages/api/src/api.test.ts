import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import worker, { type Env } from "./index.js";
import { D1KeyStore, MemoryKeyStore, SHARE_TOKEN_RE, SHARE_TTL_MS } from "./store.js";

async function bodyOf<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function testApp(firstPartyLimit = 60) {
  const store = new MemoryKeyStore();
  const app = createApp({ store, environment: "test", fetchImpl: fetch, firstPartyLimit });
  return { app, store };
}

/** Browser call from the Worker host. Hono's relative request URL is http://localhost. */
function site(init: RequestInit = {}): RequestInit {
  const headers = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : { ...(init.headers ?? {}) };
  return {
    ...init,
    headers: {
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      ...headers,
    },
  };
}

describe("Vinmeen API", () => {
  it("serves health to anyone and does not open CORS for other origins", async () => {
    const { app } = testApp();
    const health = await app.request("/api/v1/health");
    expect(health.status).toBe(200);
    expect(await bodyOf<{ ok: boolean; name: string }>(health)).toMatchObject({ ok: true, name: "Vinmeen API" });

    const outside = await app.request("https://vinmeen.example/api/v1/health", {
      headers: { origin: "https://apps.example", "sec-fetch-site": "cross-site" },
    });
    expect(outside.status).toBe(200);
    expect(outside.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("removes key signup, docs, and the OpenAPI document", async () => {
    const { app } = testApp();
    for (const path of ["/api/v1/docs", "/api/v1/openapi.json"]) {
      const response = await app.request(path, site());
      expect(response.status).toBe(404);
      expect((await bodyOf<{ error: { code: string } }>(response)).error.code).toBe("not_found");
    }
    const keys = await app.request("/api/v1/keys", site({
      method: "POST",
      body: JSON.stringify({ name: "Amma's app", email: "amma@example.com" }),
    }));
    expect(keys.status).toBe(404);
    expect((await bodyOf<{ error: { code: string } }>(keys)).error.code).toBe("not_found");
  });

  it("allows the same-origin site without a key", async () => {
    const store = new MemoryKeyStore();
    const app = createApp({ store, environment: "production", firstPartyLimit: 2 });
    const url = "https://vinmeen.rvigneshwaran1103.workers.dev/api/v1/nakshatras";
    const same = {
      origin: "https://vinmeen.rvigneshwaran1103.workers.dev",
      "sec-fetch-site": "same-origin",
    };
    const first = await app.request(url, { headers: same });
    expect(first.status).toBe(200);
    expect(first.headers.get("access-control-allow-origin")).toBe("https://vinmeen.rvigneshwaran1103.workers.dev");
    expect(first.headers.get("access-control-allow-origin")).not.toBe("*");
    expect((await app.request(url, { headers: { ...same, "x-api-key": "vnm_ignored" } })).status).toBe(200);
    const limited = await app.request(url, { headers: same });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("access-control-allow-origin")).toBe("https://vinmeen.rvigneshwaran1103.workers.dev");

    const dev = createApp({ store: new MemoryKeyStore(), environment: "development" });
    const proxied = await dev.request("http://127.0.0.1:8787/api/v1/nakshatras", {
      headers: { origin: "http://127.0.0.1:4321", "sec-fetch-site": "same-origin" },
    });
    expect(proxied.status).toBe(200);
    expect(proxied.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:4321");
  });

  it("treats FIRST_PARTY_ORIGINS like the site on this host", async () => {
    const store = new MemoryKeyStore();
    const app = createApp({
      store,
      environment: "production",
      firstPartyLimit: 2,
      firstPartyOrigins: "https://vgnshlv.nz,https://vgnshlvnz.github.io, https://preview.example/ , not a url,",
    });
    const url = "https://vinmeen.rvigneshwaran1103.workers.dev/api/v1/nakshatras";
    const pages = {
      origin: "https://vgnshlvnz.github.io",
      "sec-fetch-site": "cross-site",
      "cf-connecting-ip": "203.0.113.10",
    };
    const first = await app.request(url, { headers: pages });
    const second = await app.request(url, { headers: pages });
    const third = await app.request(url, { headers: pages });
    expect(first.status).toBe(200);
    expect(first.headers.get("access-control-allow-origin")).toBe("https://vgnshlvnz.github.io");
    expect(first.headers.get("vary")).toMatch(/Origin/);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.headers.get("access-control-allow-origin")).toBe("https://vgnshlvnz.github.io");

    const otherIp = await app.request(url, {
      headers: { ...pages, "cf-connecting-ip": "203.0.113.11" },
    });
    expect(otherIp.status).toBe(200);

    const customDomain = await app.request(url, {
      headers: { origin: "https://vgnshlv.nz", "sec-fetch-site": "cross-site", "cf-connecting-ip": "203.0.113.20" },
    });
    expect(customDomain.status).toBe(200);
    expect(customDomain.headers.get("access-control-allow-origin")).toBe("https://vgnshlv.nz");

    const preview = await app.request(url, {
      headers: { origin: "https://preview.example", "sec-fetch-site": "cross-site", "cf-connecting-ip": "203.0.113.12" },
    });
    expect(preview.status).toBe(200);
    expect(preview.headers.get("access-control-allow-origin")).toBe("https://preview.example");

    const lookalike = await app.request(url, {
      headers: { origin: "https://vgnshlvnz.github.io.evil.example", "sec-fetch-site": "cross-site" },
    });
    expect(lookalike.status).toBe(403);
    expect(lookalike.headers.get("access-control-allow-origin")).toBeNull();

    const preflight = await app.request(url, {
      method: "OPTIONS",
      headers: {
        origin: "https://vgnshlvnz.github.io",
        "sec-fetch-site": "cross-site",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type, x-api-key, authorization",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://vgnshlvnz.github.io");
    expect(preflight.headers.get("access-control-allow-methods")).toMatch(/POST/);
    const allowedHeaders = preflight.headers.get("access-control-allow-headers")?.toLowerCase() ?? "";
    expect(allowedHeaders).toContain("content-type");
    expect(allowedHeaders).not.toContain("x-api-key");
    expect(allowedHeaders).not.toContain("authorization");
  });

  it("rejects an outside origin even when it sends an API key", async () => {
    const { app } = testApp();
    const url = "https://vinmeen.example/api/v1/nakshatras";
    const outside = { origin: "https://apps.example", "sec-fetch-site": "cross-site" };
    const denied = await app.request(url, { headers: outside });
    expect(denied.status).toBe(403);
    expect((await bodyOf<{ error: { code: string } }>(denied)).error.code).toBe("forbidden");
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();

    const keyed = await app.request(url, {
      headers: {
        ...outside,
        "x-api-key": "vnm_dev_local_key",
        authorization: "Bearer vnm_dev_local_key",
      },
    });
    expect(keyed.status).toBe(403);
    expect((await bodyOf<{ error: { code: string; message: string } }>(keyed)).error).toMatchObject({
      code: "forbidden",
      message: "This API is private to the Vinmeen website.",
    });
    expect(keyed.headers.get("access-control-allow-origin")).toBeNull();

    const lookalike = await app.request(url, {
      headers: { origin: "https://vgnshlvnz.github.io.evil.example", "sec-fetch-site": "cross-site" },
    });
    expect(lookalike.status).toBe(403);
    expect(lookalike.headers.get("access-control-allow-origin")).toBeNull();

    const foreignPreflight = await app.request(url, {
      method: "OPTIONS",
      headers: {
        origin: "https://apps.example",
        "sec-fetch-site": "cross-site",
        "access-control-request-method": "GET",
        "access-control-request-headers": "x-api-key, authorization, content-type",
      },
    });
    expect(foreignPreflight.status).toBe(403);
    expect((await bodyOf<{ error: { code: string } }>(foreignPreflight)).error.code).toBe("forbidden");
    expect(foreignPreflight.headers.get("access-control-allow-origin")).toBeNull();
    expect(foreignPreflight.headers.get("access-control-allow-headers")).toBeNull();
  });

  it("rejects an unknown tradition from the site", async () => {
    const { app } = testApp();
    const match = await app.request("/api/v1/match", site({
      method: "POST",
      body: JSON.stringify({
        tradition: "not-a-tradition",
        bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
        groom: { nakshatraId: "pushya", pada: 1, rasiId: "kataka" },
      }),
    }));
    expect(match.status).toBe(400);
    expect(match.headers.get("access-control-allow-origin")).toBe("http://localhost");
  });

  it("computes a nakshatra and a bilingual match for the site", async () => {
    const { app } = testApp();
    const placed = await app.request("/api/v1/nakshatra?lang=ta", site({
      method: "POST",
      body: JSON.stringify({
        date: "1990-08-15",
        time: "10:30",
        latitude: 13.0827,
        longitude: 80.2707,
        timezone: "Asia/Kolkata",
        placeName: "Chennai",
      }),
    }));
    expect(placed.status).toBe(200);
    const placement = await bodyOf<{ nakshatra: { id: string }; pada: number; rasi: { name: string }; offset: string }>(placed);
    expect(placement.nakshatra.id).toBe("rohini");
    expect(placement.pada).toBe(3);
    expect(placement.rasi.name).toBe("ரிஷபம்");
    expect(placement.offset).toBe("+05:30");

    const traditions = await app.request("/api/v1/traditions?lang=ta", site());
    const list = await bodyOf<{ traditions: { id: string; name: string }[] }>(traditions);
    expect(list.traditions[0].name).toBe("தமிழ்நாடு");
    expect(list.traditions.find((t) => t.id === "ashtakoota")?.name).toContain("அஷ்டகூடம்");

    const matched = await app.request("/api/v1/match", site({
      method: "POST",
      body: JSON.stringify({
        tradition: "tamil-nadu",
        lang: "en",
        bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
        groom: {
          birth: {
            date: "1990-08-15",
            time: "10:30",
            latitude: 13.0827,
            longitude: 80.2707,
            timezone: "Asia/Kolkata",
          },
        },
      }),
    }));
    expect(matched.status).toBe(200);
    const report = await bodyOf<{
      tradition: { id: string };
      groom: { nakshatra: { id: string } };
      checks: { explanation: string }[];
      doshas: { id: string; level: string }[];
    }>(matched);
    expect(report.tradition.id).toBe("tamil-nadu");
    expect(report.groom.nakshatra.id).toBe("rohini");
    expect(report.checks).toHaveLength(10);
    expect(report.checks[0].explanation.length).toBeGreaterThan(20);
    expect(report.doshas.find((d) => d.id === "chevvai")?.level).toBe("unavailable");
  });

  it("rate limits the site per IP", async () => {
    const { app } = testApp(2);
    const first = await app.request("/api/v1/nakshatras", site());
    const second = await app.request("/api/v1/nakshatras", site());
    const third = await app.request("/api/v1/nakshatras", site());
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect((await bodyOf<{ error: { code: string } }>(third)).error.code).toBe("rate_limited");
    expect(third.headers.get("access-control-allow-origin")).toBe("http://localhost");
  });

  it("falls back to the city list when geocoding fails", async () => {
    const store = new MemoryKeyStore();
    const app = createApp({
      store,
      fetchImpl: (async () => {
        throw new Error("offline");
      }) as typeof fetch,
    });
    const response = await app.request("/api/v1/places?q=jaffna", site());
    const body = await bodyOf<{ places: { name: string; timezone: string }[] }>(response);
    expect(body.places[0].name).toBe("Jaffna");
    expect(body.places[0].timezone).toBe("Asia/Colombo");
  });

  it("creates a one-time share, reads it once, and then returns 410", async () => {
    const { app } = shareApp();
    const report = await sampleReport(app);
    report.bride = {
      ...report.bride,
      moonLongitude: 12.345678,
      birth: {
        instant: "1888-01-02T03:04:05.000Z",
        latitude: 1.234567,
        longitude: 2.345678,
        timezone: "Asia/Kolkata",
        offset: "+05:30",
        ambiguous: false,
        placeName: "Secret Place",
      },
    };

    const created = await app.request(`${API}/api/v1/shares`, pages({
      method: "POST",
      body: JSON.stringify({ report }),
    }));
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toContain("no-store");
    expect(created.headers.get("access-control-allow-origin")).toBe(PAGES);
    const payload = await bodyOf<{ token: string; expiresAt: string }>(created);
    expect(payload.token).toMatch(SHARE_TOKEN_RE);
    expect(Date.parse(payload.expiresAt) - Date.parse("2026-06-01T00:00:00.000Z")).toBe(SHARE_TTL_MS);

    const first = await app.request(`${API}/api/v1/shares/${payload.token}`, pages());
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toContain("no-store");
    const opened = await bodyOf<{
      report: {
        bride: { birth?: unknown; moonLongitude?: unknown };
        groom: { birth?: unknown };
        checks: { explanation: string }[];
        doshas: { id: string; name: string; explanation: string }[];
        notes: string[];
      };
      expiresAt: string;
    }>(first);
    expect(opened.expiresAt).toBe(payload.expiresAt);
    expect(opened.report.checks.length).toBe(report.checks.length);
    expect(opened.report.doshas.map((dosha) => dosha.explanation)).toEqual(report.doshas.map((dosha) => dosha.explanation));
    expect(opened.report.notes).toEqual(report.notes);
    expect(opened.report.bride.birth).toBeUndefined();
    expect(opened.report.groom.birth).toBeUndefined();
    expect(opened.report.bride.moonLongitude).toBeUndefined();
    const stored = JSON.stringify(opened.report);
    expect(stored).not.toContain("Secret Place");
    expect(stored).not.toContain("Sentinel Harbour");
    expect(stored).not.toContain("80.2707");
    expect(stored).not.toContain("1.234567");
    expect(stored).not.toContain("latitude");

    const second = await app.request(`${API}/api/v1/shares/${payload.token}`, pages());
    expect(second.status).toBe(410);
    const gone = await bodyOf<{ error: { code: string }; report?: unknown }>(second);
    expect(gone.error.code).toBe("share_gone");
    expect(gone.report).toBeUndefined();
    expect(second.headers.get("access-control-allow-origin")).toBe(PAGES);
  });

  it("returns 410 for an expired share and 404 once the row is gone", async () => {
    let now = Date.parse("2026-06-01T00:00:00.000Z");
    const { app } = shareApp(() => now);
    const report = await sampleReport(app);
    const created = await app.request(`${API}/api/v1/shares`, pages({
      method: "POST",
      body: JSON.stringify({ report }),
    }));
    const { token } = await bodyOf<{ token: string }>(created);
    now += SHARE_TTL_MS + 1;
    const expired = await app.request(`${API}/api/v1/shares/${token}`, pages());
    expect(expired.status).toBe(410);
    expect((await bodyOf<{ error: { code: string } }>(expired)).error.code).toBe("share_gone");
    const afterCleanup = await app.request(`${API}/api/v1/shares/${token}`, pages());
    expect(afterCleanup.status).toBe(404);
  });

  it("rejects share create and read from outside the site with 403", async () => {
    const { app } = shareApp();
    const report = await sampleReport(app);
    const foreign = {
      origin: "https://apps.example",
      "sec-fetch-site": "cross-site",
      "content-type": "application/json",
      "x-api-key": "vnm_ignored",
    };
    const denied = await app.request(`${API}/api/v1/shares`, {
      method: "POST",
      headers: foreign,
      body: JSON.stringify({ report }),
    });
    expect(denied.status).toBe(403);
    expect((await bodyOf<{ error: { code: string } }>(denied)).error.code).toBe("forbidden");

    const created = await app.request(`${API}/api/v1/shares`, pages({
      method: "POST",
      body: JSON.stringify({ report }),
    }));
    const { token } = await bodyOf<{ token: string }>(created);
    const peek = await app.request(`${API}/api/v1/shares/${token}`, { headers: foreign });
    expect(peek.status).toBe(403);
    const stillThere = await app.request(`${API}/api/v1/shares/${token}`, pages());
    expect(stillThere.status).toBe(200);
  });

  it("serves the share page as HTML and does not treat it as the consume API", async () => {
    const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
    expect(token).toMatch(SHARE_TOKEN_RE);
    let assetPath = "";
    const env: Env = {
      ENVIRONMENT: "production",
      ASSETS: {
        fetch: async (request: Request) => {
          assetPath = new URL(request.url).pathname;
          return new Response("<!doctype html><div id=\"root\"></div>", {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        },
      },
    };
    const page = await worker.fetch(new Request(`${API}/s/${token}`), env);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(assetPath).toBe(`/s/${token}`);
    const api = await worker.fetch(new Request(`${API}/api/v1/shares/${token}`), env);
    expect(api.status).toBe(403);
    expect(api.headers.get("content-type")).toContain("application/json");
  });
});

const PAGES = "https://vgnshlv.nz";
const API = "https://vinmeen.example";

function pages(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("origin", PAGES);
  headers.set("sec-fetch-site", "cross-site");
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  return { ...init, headers };
}

function shareApp(now: () => number = () => Date.parse("2026-06-01T00:00:00.000Z")) {
  const store = new MemoryKeyStore();
  const app = createApp({
    store,
    environment: "production",
    firstPartyOrigins: "https://vgnshlv.nz,https://vgnshlvnz.github.io",
    now,
  });
  return { app, store };
}

async function sampleReport(app: ReturnType<typeof createApp>) {
  const matched = await app.request(`${API}/api/v1/match`, pages({
    method: "POST",
    body: JSON.stringify({
      tradition: "tamil-nadu",
      lang: "en",
      bride: { name: "Bride", nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
      groom: {
        name: "Groom",
        birth: {
          date: "1990-08-15",
          time: "10:30",
          latitude: 13.0827,
          longitude: 80.2707,
          timezone: "Asia/Kolkata",
          placeName: "Sentinel Harbour",
        },
      },
    }),
  }));
  expect(matched.status).toBe(200);
  return bodyOf<{
    bride: { birth?: unknown; moonLongitude?: number };
    groom: { birth?: { latitude?: number } };
    checks: { explanation: string }[];
    doshas: { id: string; explanation: string }[];
    notes: string[];
  }>(matched);
}

describe("D1 share consume", () => {
  it("claims a row only when the conditional update changes one row", async () => {
    const db = new FakeD1();
    const store = new D1KeyStore(db);
    const created = await store.createShare({ verdictText: "reading", doshas: [], notes: ["a note"] }, 0, 1_000);
    const first = await store.consumeShare(created.token, 10);
    expect(first.status).toBe("ok");
    if (first.status === "ok") expect(first.report).toEqual({ verdictText: "reading", doshas: [], notes: ["a note"] });
    const second = await store.consumeShare(created.token, 20);
    expect(second.status).toBe("gone");
    const later = await store.createShare({ verdictText: "later" }, 0, 1_000);
    const expired = await store.consumeShare(later.token, 5_000);
    expect(expired.status).toBe("gone");
    expect(db.sql.some((sql) => sql.includes("consumed_at IS NULL"))).toBe(true);
    expect(db.sql.some((sql) => sql.includes("DELETE FROM shares"))).toBe(true);
  });
});

interface FakeShare {
  token: string;
  snapshot: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

class FakeD1 {
  rows = new Map<string, FakeShare>();
  sql: string[] = [];

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => this.first(sql, values) as T | null,
        run: async <T>() => this.run(sql, values) as { results?: T[]; meta?: { changes?: number } },
      }),
    };
  }

  private first(sql: string, values: unknown[]) {
    this.sql.push(sql);
    if (sql.includes("SELECT snapshot")) {
      const row = this.rows.get(String(values[0]));
      return row ? { snapshot: row.snapshot, expires_at: row.expires_at } : null;
    }
    if (sql.includes("SELECT token")) {
      const row = this.rows.get(String(values[0]));
      return row ? { token: row.token } : null;
    }
    throw new Error(`unexpected first(): ${sql}`);
  }

  private run(sql: string, values: unknown[]) {
    this.sql.push(sql);
    if (sql.includes("INSERT INTO shares")) {
      const [token, snapshot, created_at, expires_at] = values.map(String);
      this.rows.set(token, { token, snapshot, created_at, expires_at, consumed_at: null });
      return { meta: { changes: 1 }, results: [] };
    }
    if (sql.includes("UPDATE shares SET consumed_at")) {
      const [consumedAt, token, nowIso] = values.map(String);
      const row = this.rows.get(token);
      const live = !!row && row.consumed_at == null && row.expires_at > nowIso;
      if (live && row) {
        row.consumed_at = consumedAt;
        return { meta: { changes: 1 }, results: [{ snapshot: row.snapshot, expires_at: row.expires_at }] };
      }
      return {
        meta: { changes: 0 },
        results: row ? [{ snapshot: row.snapshot, expires_at: row.expires_at }] : [],
      };
    }
    if (sql.includes("DELETE FROM shares")) {
      const nowIso = String(values[0]);
      let changes = 0;
      for (const [token, row] of this.rows) {
        if (row.expires_at <= nowIso) {
          this.rows.delete(token);
          changes += 1;
        }
      }
      return { meta: { changes }, results: [] };
    }
    throw new Error(`unexpected run(): ${sql}`);
  }
}
