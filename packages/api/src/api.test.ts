import { describe, expect, it } from "vitest";

async function bodyOf<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
import { createApp } from "./app.js";
import { DEV_TOKEN, MemoryKeyStore } from "./store.js";

async function testApp(rateLimit = 60) {
  const store = new MemoryKeyStore();
  await store.seedDevKey();
  if (rateLimit !== 600) {
    const issued = await store.issue({ name: "Tight", email: "tight@example.com", rateLimit });
    return { app: createApp({ store, environment: "test", fetchImpl: fetch }), store, token: issued.token, dev: DEV_TOKEN };
  }
  return { app: createApp({ store, environment: "test", fetchImpl: fetch }), store, token: DEV_TOKEN, dev: DEV_TOKEN };
}

function auth(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...(init.headers ?? {}), "x-api-key": token, "content-type": "application/json" } };
}

describe("Vinmeen API", () => {
  it("serves health, docs, and the OpenAPI document without a key", async () => {
    const { app } = await testApp();
    expect((await app.request("/api/v1/health")).status).toBe(200);
    const spec = await app.request("/api/v1/openapi.json");
    const body = await bodyOf<{ info: { title: string }; paths: Record<string, unknown> }>(spec);
    expect(body.info.title).toBe("Vinmeen API");
    expect(body.paths["/api/v1/match"]).toBeTruthy();
    expect((await app.request("/api/v1/docs")).status).toBe(200);
    expect(await (await app.request("/api/v1/nakshatras")).json()).toMatchObject({
      error: { code: "unauthorized" },
    });
  });

  it("issues a key once and then accepts it", async () => {
    const { app } = await testApp();
    const created = await app.request("/api/v1/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Amma's app", email: "amma@example.com" }),
    });
    expect(created.status).toBe(201);
    const payload = await bodyOf<{ token: string }>(created);
    expect(payload.token).toMatch(/^vnm_/);
    const traditions = await app.request("/api/v1/traditions?lang=ta", auth(payload.token));
    const list = await bodyOf<{ traditions: { id: string; name: string }[] }>(traditions);
    expect(list.traditions[0].name).toBe("தமிழ்நாடு");
    expect(list.traditions.find((t: { id: string; name: string }) => t.id === "ashtakoota")?.name).toContain("அஷ்டகூடம்");
  });

  it("rejects a bad key request and an unknown tradition", async () => {
    const { app, dev } = await testApp();
    const bad = await app.request("/api/v1/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "A", email: "nope" }),
    });
    expect(bad.status).toBe(400);
    const match = await app.request("/api/v1/match", auth(dev, {
      method: "POST",
      body: JSON.stringify({
        tradition: "not-a-tradition",
        bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
        groom: { nakshatraId: "pushya", pada: 1, rasiId: "kataka" },
      }),
    }));
    expect(match.status).toBe(400);
  });

  it("computes a nakshatra and a bilingual match", async () => {
    const { app, dev } = await testApp();
    const placed = await app.request("/api/v1/nakshatra?lang=ta", auth(dev, {
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

    const matched = await app.request("/api/v1/match", auth(dev, {
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

  it("rate limits a key", async () => {
    const { app, token } = await testApp(2);
    const body = JSON.stringify({ lang: "en" });
    const first = await app.request("/api/v1/nakshatras", auth(token, { method: "GET" }));
    const second = await app.request("/api/v1/nakshatras", auth(token));
    const third = await app.request("/api/v1/nakshatras", auth(token));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect((await bodyOf<{ error: { code: string } }>(third)).error.code).toBe("rate_limited");
    void body;
  });

  it("allows the same-origin site without a key and rejects other sites", async () => {
    const store = new MemoryKeyStore();
    const app = createApp({ store, environment: "production", firstPartyLimit: 2 });
    const url = "https://vinmeen.rvigneshwaran1103.workers.dev/api/v1/nakshatras";
    const same = {
      origin: "https://vinmeen.rvigneshwaran1103.workers.dev",
      "sec-fetch-site": "same-origin",
    };
    expect((await app.request(url, { headers: same })).status).toBe(200);
    expect((await app.request(url, { headers: same })).status).toBe(200);
    expect((await app.request(url, { headers: same })).status).toBe(429);
    const cross = await app.request(url, {
      headers: { origin: "https://other.example", "sec-fetch-site": "cross-site" },
    });
    expect(cross.status).toBe(401);
    const dev = createApp({ store, environment: "development" });
    const proxied = await dev.request("http://127.0.0.1:8787/api/v1/nakshatras", {
      headers: { origin: "http://127.0.0.1:4321", "sec-fetch-site": "same-origin" },
    });
    expect(proxied.status).toBe(200);
  });

  it("treats FIRST_PARTY_ORIGINS like the site on this host", async () => {
    const store = new MemoryKeyStore();
    const app = createApp({
      store,
      environment: "production",
      firstPartyLimit: 2,
      firstPartyOrigins: "https://vgnshlvnz.github.io, https://preview.example/ , not a url,",
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

    const otherIp = await app.request(url, {
      headers: { ...pages, "cf-connecting-ip": "203.0.113.11" },
    });
    expect(otherIp.status).toBe(200);

    const preview = await app.request(url, {
      headers: { origin: "https://preview.example", "sec-fetch-site": "cross-site", "cf-connecting-ip": "203.0.113.12" },
    });
    expect(preview.status).toBe(200);
    expect(preview.headers.get("access-control-allow-origin")).toBe("https://preview.example");

    const lookalike = await app.request(url, {
      headers: { origin: "https://vgnshlvnz.github.io.evil.example", "sec-fetch-site": "cross-site" },
    });
    expect(lookalike.status).toBe(401);
    expect(lookalike.headers.get("access-control-allow-origin")).toBe("*");

    const preflight = await app.request(url, {
      method: "OPTIONS",
      headers: {
        origin: "https://vgnshlvnz.github.io",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://vgnshlvnz.github.io");
    expect(preflight.headers.get("access-control-allow-methods")).toMatch(/POST/);
    expect(preflight.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("content-type");

    const foreignPreflight = await app.request(url, {
      method: "OPTIONS",
      headers: {
        origin: "https://apps.example",
        "access-control-request-method": "GET",
        "access-control-request-headers": "x-api-key, content-type",
      },
    });
    expect(foreignPreflight.status).toBe(204);
    expect(foreignPreflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(foreignPreflight.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("x-api-key");
  });

  it("still requires a key for a third-party caller", async () => {
    const { app, dev } = await testApp();
    const url = "https://vinmeen.example/api/v1/nakshatras";
    const denied = await app.request(url, { headers: { origin: "https://apps.example", "sec-fetch-site": "cross-site" } });
    expect(denied.status).toBe(401);
    const allowed = await app.request(url, auth(dev, { headers: { origin: "https://apps.example", "sec-fetch-site": "cross-site" } }));
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("falls back to the city list when geocoding fails", async () => {
    const store = new MemoryKeyStore();
    await store.seedDevKey();
    const app = createApp({
      store,
      fetchImpl: (async () => {
        throw new Error("offline");
      }) as typeof fetch,
    });
    const response = await app.request("/api/v1/places?q=jaffna", auth(DEV_TOKEN));
    const body = await bodyOf<{ places: { name: string; timezone: string }[] }>(response);
    expect(body.places[0].name).toBe("Jaffna");
    expect(body.places[0].timezone).toBe("Asia/Colombo");
  });
});
