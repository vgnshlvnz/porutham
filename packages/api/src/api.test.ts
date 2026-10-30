import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { MemoryKeyStore } from "./store.js";

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
});
