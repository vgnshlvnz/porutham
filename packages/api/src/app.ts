import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  CITIES,
  InputError,
  KOVILS,
  NAKSHATRAS,
  RASIS,
  checkCatalogue,
  listTraditions,
  matchHoroscopes,
  resolvePerson,
  searchCities,
  type Lang,
  type PersonInput,
} from "vinmeen-engine";
import { openApiDocument } from "./openapi.js";
import { DEV_TOKEN, type KeyStore } from "./store.js";

export interface AppOptions {
  store: KeyStore;
  environment?: string;
  rateLimiter?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Requests per minute for the same-origin web app, which does not send an API key. */
  firstPartyLimit?: number;
}

const FIRST_PARTY_LIMIT = 60;

const issueHits = new Map<string, { start: number; count: number }>();

export function createApp(options: AppOptions) {
  const app = new Hono();
  const now = options.now ?? (() => Date.now());
  const fetchImpl = options.fetchImpl ?? fetch;

  app.use(
    "/api/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Api-Key", "Authorization"],
      maxAge: 86400,
    }),
  );

  app.get("/api/v1/health", (c) => c.json({ ok: true, name: "Vinmeen API", version: "1.0.0" }));
  app.get("/api/v1/openapi.json", (c) => c.json(openApiDocument()));
  app.get("/api/v1/docs", (c) => c.html(docsHtml()));

  app.post("/api/v1/keys", async (c) => {
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "local";
    if (!allowIssue(ip, now())) {
      return problem(c, 429, "rate_limited", "Too many keys requested from this address. Try again in an hour.");
    }
    const body = await readJson(c.req.raw);
    if (!body.ok) return problem(c, 400, "validation_error", "Request body must be JSON.");
    const name = stringField(body.value, "name");
    const email = stringField(body.value, "email");
    const fields: Record<string, string> = {};
    if (!name || name.length < 2) fields.name = "Give a name for this key.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Give a valid email address.";
    if (Object.keys(fields).length) return problem(c, 400, "validation_error", "Check the highlighted fields.", fields);
    const issued = await options.store.issue({ name: name!, email: email! });
    return c.json(
      {
        token: issued.token,
        key: issued.record,
        warning: "Copy this token now. It is stored only as a hash and will not be shown again.",
      },
      201,
    );
  });

  app.use("/api/v1/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next();
    const path = new URL(c.req.url).pathname;
    if (path === "/api/v1/health" || path === "/api/v1/openapi.json" || path === "/api/v1/docs" || path === "/api/v1/keys") {
      return next();
    }
    const token = bearer(c.req.header("x-api-key") ?? c.req.header("authorization"));
    if (token) {
      const key = await options.store.authenticate(token);
      if (!key) return problem(c, 401, "unauthorized", "That API key was not recognised.");
      const allowed = await enforceLimit(c, options, key.id, key.rateLimit, now());
      if (!allowed) return allowedResponse(c);
      return next();
    }
    if (isFirstParty(c.req.raw, options.environment)) {
      const limit = options.firstPartyLimit ?? FIRST_PARTY_LIMIT;
      const allowed = await enforceLimit(c, options, `web:${clientIp(c.req.raw)}`, limit, now());
      if (!allowed) return allowedResponse(c);
      return next();
    }
    return problem(
      c,
      401,
      "unauthorized",
      "Send X-Api-Key or Authorization: Bearer. The Vinmeen site on this host can call the API without a key. Issue a key with POST /api/v1/keys for any other app.",
    );
  });

  app.get("/api/v1/traditions", (c) => {
    const lang = langOf(c.req.query("lang"));
    return c.json({
      traditions: listTraditions().map((t) => ({
        id: t.id,
        name: lang === "ta" ? t.ta : t.en,
        nameEn: t.en,
        nameTa: t.ta,
        confidence: t.confidence,
        summary: lang === "ta" ? t.summary.ta : t.summary.en,
        scoreUnit: t.scoreUnit,
        maxScore: t.maxScore,
        sources: t.sources,
      })),
    });
  });

  app.get("/api/v1/nakshatras", (c) => {
    const lang = langOf(c.req.query("lang"));
    return c.json({
      nakshatras: NAKSHATRAS.map((n) => ({
        id: n.id,
        index: n.index + 1,
        name: lang === "ta" ? n.ta : n.en,
        nameEn: n.en,
        nameLocalEn: n.localEn,
        nameTa: n.ta,
        gana: n.gana,
        yoni: n.yoni,
        yoniSex: n.sex,
        rajju: n.rajju,
        rajjuFlow: n.flow,
        nadi: n.nadi,
      })),
    });
  });

  app.get("/api/v1/rasis", (c) => {
    const lang = langOf(c.req.query("lang"));
    return c.json({
      rasis: RASIS.map((r) => ({
        id: r.id,
        index: r.index + 1,
        name: lang === "ta" ? r.ta : r.en,
        nameEn: r.en,
        nameTa: r.ta,
        western: r.western,
        lord: r.lord,
      })),
    });
  });

  app.get("/api/v1/kovils", (c) => {
    const lang = langOf(c.req.query("lang"));
    return c.json({
      kovils: KOVILS.map((k) => ({
        id: k.id,
        name: lang === "ta" ? k.ta : k.en,
        nameEn: k.en,
        nameTa: k.ta,
        pirivuNote: k.pirivuNote,
      })),
    });
  });

  app.get("/api/v1/poruthams", (c) => {
    const lang = langOf(c.req.query("lang"));
    try {
      return c.json({ poruthams: checkCatalogue(lang, c.req.query("tradition") || undefined) });
    } catch (error) {
      return fromEngine(c, error);
    }
  });

  app.get("/api/v1/places", async (c) => {
    const q = c.req.query("q")?.trim() ?? "";
    if (q.length < 2) return problem(c, 400, "validation_error", "Type at least two letters.", { q: "Too short." });
    const local = searchCities(q, 6).map(placeFromCity);
    let remote: { name: string; admin: string; country: string; latitude: number; longitude: number; timezone: string; source: "geocoder" | "city-list" }[] = [];
    try {
      const response = await fetchImpl(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
        { signal: AbortSignal.timeout(4000) },
      );
      if (response.ok) {
        const data = (await response.json()) as { results?: OpenMeteoPlace[] };
        remote = (data.results ?? [])
          .filter((row) => row.timezone && Number.isFinite(row.latitude) && Number.isFinite(row.longitude))
          .map((row) => ({
            name: row.name,
            admin: row.admin1 ?? "",
            country: row.country ?? "",
            latitude: row.latitude,
            longitude: row.longitude,
            timezone: row.timezone,
            source: "geocoder" as const,
          }));
      }
    } catch {
      remote = [];
    }
    const seen = new Set<string>();
    const places = [...remote, ...local].filter((place) => {
      const key = `${place.name.toLowerCase()}|${place.country.toLowerCase()}|${place.latitude.toFixed(1)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return c.json({ query: q, places: places.slice(0, 8), offlineCities: CITIES.length });
  });

  app.post("/api/v1/nakshatra", async (c) => {
    const lang = langOf(c.req.query("lang"));
    const body = await readJson(c.req.raw);
    if (!body.ok) return problem(c, 400, "validation_error", "Request body must be JSON.");
    const birth = readBirth(body.value);
    if ("error" in birth) return problem(c, 400, "validation_error", birth.error, birth.fields);
    try {
      const person = resolvePerson({ birth: birth.value });
      const nak = NAKSHATRAS.find((n) => n.id === person.nakshatraId)!;
      const rasi = RASIS.find((r) => r.id === person.rasiId)!;
      return c.json({
        nakshatra: { id: nak.id, name: lang === "ta" ? nak.ta : nak.en, nameEn: nak.en, nameTa: nak.ta, localEn: nak.localEn },
        pada: person.pada,
        rasi: { id: rasi.id, name: lang === "ta" ? rasi.ta : rasi.en, nameEn: rasi.en, nameTa: rasi.ta, western: rasi.western },
        siderealMoon: round6(person.moonLongitude ?? 0),
        ayanamsa: round6(person.chart?.ayanamsa ?? 0),
        instant: person.birth?.instant,
        offset: person.birth?.offset,
        timezone: person.birth?.timezone,
        ambiguous: person.birth?.ambiguous ?? false,
        placeName: person.birth?.placeName,
        warnings: person.warnings.map((w) => ({ code: w.code, message: lang === "ta" ? w.ta : w.en })),
      });
    } catch (error) {
      return fromEngine(c, error);
    }
  });

  app.post("/api/v1/match", async (c) => {
    const body = await readJson(c.req.raw);
    if (!body.ok) return problem(c, 400, "validation_error", "Request body must be JSON.");
    const value = body.value;
    const fields: Record<string, string> = {};
    const tradition = stringField(value, "tradition");
    if (!tradition) fields.tradition = "Choose a tradition id.";
    const lang = langOf(typeof value === "object" && value && "lang" in value ? String((value as { lang?: string }).lang) : undefined);
    const bride = readPerson(value, "bride");
    const groom = readPerson(value, "groom");
    if ("error" in bride) Object.assign(fields, bride.fields);
    if ("error" in groom) Object.assign(fields, groom.fields);
    if (Object.keys(fields).length || "error" in bride || "error" in groom) {
      return problem(c, 400, "validation_error", "Bride, groom, and tradition are required.", fields);
    }
    const asOf = typeof value === "object" && value && "asOf" in value ? String((value as { asOf?: string }).asOf ?? "") : "";
    try {
      const report = matchHoroscopes({
        traditionId: tradition!,
        lang,
        bride: bride.value,
        groom: groom.value,
        asOf: asOf || undefined,
      });
      return c.json(report);
    } catch (error) {
      return fromEngine(c, error);
    }
  });

  app.notFound((c) => {
    if (new URL(c.req.url).pathname.startsWith("/api/")) return problem(c, 404, "not_found", "No such API path.");
    return c.text("Vinmeen", 404);
  });

  return app;
}

function placeFromCity(city: (typeof CITIES)[number]) {
  return {
    name: city.name,
    admin: city.admin,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
    source: "city-list" as const,
  };
}

interface OpenMeteoPlace {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
}

function langOf(value: string | undefined): Lang {
  return value === "ta" ? "ta" : "en";
}

async function enforceLimit(
  c: { header: (name: string, value: string) => void },
  options: AppOptions,
  bucketId: string,
  limit: number,
  nowMs: number,
): Promise<boolean> {
  if (options.rateLimiter) {
    try {
      const limited = await options.rateLimiter.limit({ key: bucketId });
      if (!limited.success) return false;
    } catch {
      // The platform limiter is optional. D1 or memory still counts.
    }
  }
  const bucket = await options.store.consume(bucketId, limit, nowMs);
  c.header("X-RateLimit-Limit", String(limit));
  c.header("X-RateLimit-Remaining", String(bucket.remaining));
  if (!bucket.ok) {
    c.header("Retry-After", String(bucket.retryAfter));
    return false;
  }
  return true;
}

function allowedResponse(c: { json: (body: unknown, status?: number) => Response; header: (name: string, value: string) => void }) {
  return problem(c, 429, "rate_limited", "Too many requests. Wait a minute and try again.");
}

function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "local";
}

function isFirstParty(request: Request, environment: string | undefined): boolean {
  const url = new URL(request.url);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return fetchSite === "same-origin";
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  const sameHost = originUrl.host === url.host;
  const localDev =
    environment !== "production" && isLoopback(originUrl.hostname) && isLoopback(url.hostname);
  if (!sameHost && !localDev) return false;
  if (fetchSite && fetchSite !== "same-origin") return false;
  return true;
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function bearer(header: string | undefined): string {
  if (!header) return "";
  const trimmed = header.trim();
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed.slice(7).trim() : trimmed;
}

function allowIssue(ip: string, nowMs: number): boolean {
  const start = Math.floor(nowMs / 3600000);
  const row = issueHits.get(ip);
  if (!row || row.start !== start) {
    issueHits.set(ip, { start, count: 1 });
    return true;
  }
  row.count += 1;
  return row.count <= 20;
}

async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

function stringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || !(key in value)) return undefined;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw.trim() : undefined;
}

function readBirth(value: unknown): { value: NonNullable<PersonInput["birth"]> } | { error: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const date = stringField(value, "date");
  const time = stringField(value, "time");
  const timezone = stringField(value, "timezone");
  const latitude = numberField(value, "latitude");
  const longitude = numberField(value, "longitude");
  if (!date) fields.date = "Date is required (YYYY-MM-DD).";
  if (!time) fields.time = "Time is required (HH:mm).";
  if (!timezone) fields.timezone = "Timezone is required (IANA name).";
  if (latitude == null) fields.latitude = "Latitude is required.";
  if (longitude == null) fields.longitude = "Longitude is required.";
  if (Object.keys(fields).length) return { error: "Birth details are incomplete.", fields };
  return {
    value: {
      date: date!,
      time: time!,
      timezone: timezone!,
      latitude: latitude!,
      longitude: longitude!,
      placeName: stringField(value, "placeName"),
    },
  };
}

function readPerson(root: unknown, label: string): { value: PersonInput } | { error: string; fields: Record<string, string> } {
  if (!root || typeof root !== "object" || !(label in root) || typeof (root as Record<string, unknown>)[label] !== "object") {
    return { error: "missing", fields: { [label]: "This person is required." } };
  }
  const value = (root as Record<string, unknown>)[label] as Record<string, unknown>;
  const birthRaw = value.birth;
  if (birthRaw && typeof birthRaw === "object") {
    const birth = readBirth(birthRaw);
    if ("error" in birth) {
      const fields: Record<string, string> = {};
      for (const [key, message] of Object.entries(birth.fields)) fields[`${label}.${key}`] = message;
      return { error: birth.error, fields };
    }
    return {
      value: {
        name: stringField(value, "name"),
        birth: birth.value,
        gothra: stringField(value, "gothra"),
        kovil: stringField(value, "kovil"),
      },
    };
  }
  const nakshatraId = stringField(value, "nakshatraId");
  const rasiId = stringField(value, "rasiId");
  const pada = numberField(value, "pada");
  const fields: Record<string, string> = {};
  if (!nakshatraId) fields[`${label}.nakshatraId`] = "Choose a nakshatra or send birth details.";
  if (pada == null) fields[`${label}.pada`] = "Pada must be 1, 2, 3, or 4.";
  if (!rasiId) fields[`${label}.rasiId`] = "Choose a rasi or send birth details.";
  if (Object.keys(fields).length) return { error: "incomplete", fields };
  return {
    value: {
      name: stringField(value, "name"),
      nakshatraId,
      pada,
      rasiId,
      gothra: stringField(value, "gothra"),
      kovil: stringField(value, "kovil"),
    },
  };
}

function numberField(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== "object" || !(key in value)) return undefined;
  const raw = (value as Record<string, unknown>)[key];
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function problem(
  c: { json: (body: unknown, status?: number) => Response; header?: (name: string, value: string) => void },
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
  retryAfter?: number,
) {
  if (retryAfter) c.header?.("Retry-After", String(retryAfter));
  return c.json({ error: { code, message, fields } }, status as 400);
}

function fromEngine(c: { json: (body: unknown, status?: number) => Response }, error: unknown) {
  if (error instanceof InputError) return problem(c, 400, error.code, error.message);
  console.error(error);
  return problem(c, 500, "internal_error", "The calculation failed.");
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function docsHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vinmeen API</title>
  <style>
    body { margin: 0; font-family: Georgia, "Noto Serif Tamil", serif; background: #FBF6EE; color: #2A1614; }
    header { padding: 28px 24px 8px; max-width: 880px; margin: 0 auto; }
    h1 { font-weight: 560; font-size: 42px; margin: 0; color: #6E1F2C; }
    p { max-width: 720px; line-height: 1.5; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    pre { background: #2A1614; color: #FBF6EE; padding: 16px; border-radius: 12px; overflow: auto; }
    a { color: #6E1F2C; }
  </style>
</head>
<body>
  <header>
    <h1>Vinmeen API</h1>
    <p>விண்மீன் · Porutham for Tamil families. The site on this host calls the API with no key. Any other app sends <code>X-Api-Key</code>. Issue one with <code>POST /api/v1/keys</code>. Local wrangler dev also accepts <code>${DEV_TOKEN}</code> until you run in production.</p>
    <pre>curl -s -H "X-Api-Key: ${DEV_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{"date":"1990-08-15","time":"10:30","latitude":13.0827,"longitude":80.2707,"timezone":"Asia/Kolkata"}' \\
  http://127.0.0.1:8787/api/v1/nakshatra</pre>
    <p>Machine-readable spec: <a href="/api/v1/openapi.json">/api/v1/openapi.json</a></p>
  </header>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    Scalar.createApiReference("#app", { url: "/api/v1/openapi.json", theme: "default" });
  </script>
</body>
</html>`;
}

export { DEV_TOKEN };
