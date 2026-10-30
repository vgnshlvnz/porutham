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
import { SHARE_TOKEN_RE, SHARE_TTL_MS, type KeyStore } from "./store.js";

export interface AppOptions {
  store: KeyStore;
  environment?: string;
  rateLimiter?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Requests per minute for the website, counted per IP. */
  firstPartyLimit?: number;
  /** Comma-separated browser origins allowed to call the API, besides this host. */
  firstPartyOrigins?: string;
  /** How long a one-time share can be opened. Defaults to 7 days. */
  shareTtlMs?: number;
}

const FIRST_PARTY_LIMIT = 60;

export function createApp(options: AppOptions) {
  const app = new Hono();
  const now = options.now ?? (() => Date.now());
  const fetchImpl = options.fetchImpl ?? fetch;
  const extraOrigins = parseOriginList(options.firstPartyOrigins);

  // Runs before CORS so a disallowed origin, including preflight, is a 403 with no echoed origin.
  // A presented API key does not grant access.
  app.use("/api/*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (path !== "/api/v1/health" && !isFirstParty(c.req.raw, options.environment, extraOrigins)) {
      return problem(c, 403, "forbidden", "This API is private to the Vinmeen website.");
    }
    return next();
  });

  app.use(
    "/api/*",
    cors({
      origin: (requestOrigin, c) => allowOriginHeader(requestOrigin, c.req.url, options.environment, extraOrigins),
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 86400,
    }),
  );

  app.use("/api/v1/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next();
    const path = new URL(c.req.url).pathname;
    if (path === "/api/v1/health") return next();
    const limit = options.firstPartyLimit ?? FIRST_PARTY_LIMIT;
    const allowed = await enforceLimit(c, options, `web:${clientIp(c.req.raw)}`, limit, now());
    if (!allowed) return allowedResponse(c);
    return next();
  });

  app.get("/api/v1/health", (c) => c.json({ ok: true, name: "Vinmeen API", version: "1.0.0" }));

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

  app.post("/api/v1/shares", async (c) => {
    const body = await readJson(c.req.raw);
    if (!body.ok) return problem(c, 400, "validation_error", "Request body must be JSON.");
    const redacted = redactShareReport(body.value);
    if (!redacted.ok) return problem(c, 400, "validation_error", redacted.message, redacted.fields);
    const created = await options.store.createShare(redacted.snapshot, now(), options.shareTtlMs ?? SHARE_TTL_MS);
    c.header("Cache-Control", "no-store");
    return c.json({ token: created.token, expiresAt: created.expiresAt }, 201);
  });

  app.get("/api/v1/shares/:token", async (c) => {
    const token = c.req.param("token");
    if (!SHARE_TOKEN_RE.test(token)) return problem(c, 404, "not_found", "No such share.");
    const claimed = await options.store.consumeShare(token, now());
    c.header("Cache-Control", "no-store");
    if (claimed.status === "ok") return c.json({ report: claimed.report, expiresAt: claimed.expiresAt });
    if (claimed.status === "gone") {
      return problem(c, 410, "share_gone", "This link has already been used or it has expired.");
    }
    return problem(c, 404, "not_found", "No such share.");
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

function parseOriginList(value: string | undefined): Set<string> {
  const origins = new Set<string>();
  if (!value) return origins;
  for (const part of value.split(",")) {
    const origin = canonicalOrigin(part);
    if (origin) origins.add(origin);
  }
  return origins;
}

function canonicalOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Reflect this host, FIRST_PARTY_ORIGINS, and local loopback dev. Never `*`. */
function allowOriginHeader(
  requestOrigin: string,
  requestUrl: string,
  environment: string | undefined,
  extraOrigins: ReadonlySet<string>,
): string | undefined {
  const origin = canonicalOrigin(requestOrigin);
  if (!origin) return undefined;
  if (extraOrigins.has(origin)) return origin;
  let request: URL;
  try {
    request = new URL(requestUrl);
  } catch {
    return undefined;
  }
  const originUrl = new URL(origin);
  if (originUrl.host === request.host) return origin;
  if (environment !== "production" && isLoopback(originUrl.hostname) && isLoopback(request.hostname)) return origin;
  return undefined;
}

function isFirstParty(request: Request, environment: string | undefined, extraOrigins: ReadonlySet<string>): boolean {
  const url = new URL(request.url);
  const origin = canonicalOrigin(request.headers.get("origin") ?? "");
  if (origin && extraOrigins.has(origin)) return true;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false;
  if (!origin) return fetchSite === "same-origin";
  const originUrl = new URL(origin);
  const sameHost = originUrl.host === url.host;
  const localDev = environment !== "production" && isLoopback(originUrl.hostname) && isLoopback(url.hostname);
  if (!sameHost && !localDev) return false;
  if (fetchSite && fetchSite !== "same-origin") return false;
  return true;
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
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

const SNAPSHOT_LIMIT = 80_000;

interface ShareSnapshot {
  tradition: { id: string; en: string; ta: string; confidence: string; summary: { en: string; ta: string } };
  lang: Lang;
  score: number;
  maxScore: number;
  verdict: string;
  verdictText: string;
  checks: ShareCheck[];
  doshas: ShareDosha[];
  notes: string[];
  disclaimer: string;
  bride: SharePerson;
  groom: SharePerson;
}

interface SharePerson {
  name?: string;
  nakshatra: { id: string; en: string; ta: string };
  pada: number;
  rasi: { id: string; en: string; ta: string; western: string };
  source: "birth" | "star";
}

interface ShareCheck {
  id: string;
  name: string;
  meaning: string;
  level: string;
  points: number;
  maxPoints: number;
  critical: boolean;
  explanation: string;
}

interface ShareDosha {
  id: string;
  name: string;
  level: string;
  critical: boolean;
  explanation: string;
}

function redactShareReport(value: unknown): { ok: true; snapshot: ShareSnapshot } | { ok: false; message: string; fields?: Record<string, string> } {
  if (!value || typeof value !== "object") return { ok: false, message: "Send the match report." };
  const report = (value as { report?: unknown }).report;
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return { ok: false, message: "Send the match report.", fields: { report: "Required." } };
  }
  const row = report as Record<string, unknown>;
  const tradition = redactTradition(row.tradition);
  const bride = redactPerson(row.bride);
  const groom = redactPerson(row.groom);
  const verdictText = clip(row.verdictText, 2000);
  if (!tradition || !bride || !groom || !verdictText || !Array.isArray(row.checks)) {
    return { ok: false, message: "The report is incomplete.", fields: { report: "tradition, bride, groom, checks, and verdict are required." } };
  }
  const snapshot: ShareSnapshot = {
    tradition,
    lang: row.lang === "ta" ? "ta" : "en",
    score: finite(row.score),
    maxScore: finite(row.maxScore),
    verdict: clip(row.verdict, 40) ?? "",
    verdictText,
    checks: row.checks.slice(0, 40).map(redactCheck).filter((check): check is ShareCheck => check !== null),
    doshas: Array.isArray(row.doshas) ? row.doshas.slice(0, 20).map(redactDosha).filter((dosha): dosha is ShareDosha => dosha !== null) : [],
    notes: Array.isArray(row.notes) ? row.notes.map((note) => clip(note, 500)).filter((note): note is string => !!note).slice(0, 20) : [],
    disclaimer: clip(row.disclaimer, 2000) ?? "",
    bride,
    groom,
  };
  if (JSON.stringify(snapshot).length > SNAPSHOT_LIMIT) return { ok: false, message: "That report is too large to share." };
  return { ok: true, snapshot };
}

function redactTradition(value: unknown): ShareSnapshot["tradition"] | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = clip(row.id, 80);
  const en = clip(row.en, 120);
  const ta = clip(row.ta, 120);
  if (!id || !en || !ta) return null;
  const summary = row.summary && typeof row.summary === "object" ? (row.summary as Record<string, unknown>) : {};
  return {
    id,
    en,
    ta,
    confidence: row.confidence === "approximate" ? "approximate" : "documented",
    summary: { en: clip(summary.en, 800) ?? "", ta: clip(summary.ta, 800) ?? "" },
  };
}

function redactPerson(value: unknown): SharePerson | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const nakshatra = redactNames(row.nakshatra, false);
  const rasi = redactNames(row.rasi, true);
  const pada = finite(row.pada);
  if (!nakshatra || !rasi || ![1, 2, 3, 4].includes(pada)) return null;
  const person: SharePerson = {
    nakshatra: { id: nakshatra.id, en: nakshatra.en, ta: nakshatra.ta },
    pada,
    rasi: { id: rasi.id, en: rasi.en, ta: rasi.ta, western: rasi.western ?? "" },
    source: row.source === "birth" ? "birth" : "star",
  };
  const name = clip(row.name, 80);
  if (name) person.name = name;
  return person;
}

function redactNames(value: unknown, western: boolean): SharePerson["nakshatra"] & { western?: string } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = clip(row.id, 80);
  const en = clip(row.en, 80);
  const ta = clip(row.ta, 80);
  if (!id || !en || !ta) return null;
  if (!western) return { id, en, ta };
  return { id, en, ta, western: clip(row.western, 40) ?? "" };
}

function redactCheck(value: unknown): ShareCheck | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = clip(row.id, 80);
  const name = clip(row.name, 120);
  const explanation = clip(row.explanation, 4000);
  if (!id || !name || !explanation) return null;
  return {
    id,
    name,
    meaning: clip(row.meaning, 400) ?? "",
    level: clip(row.level, 20) ?? "none",
    points: finite(row.points),
    maxPoints: finite(row.maxPoints),
    critical: row.critical === true,
    explanation,
  };
}

function redactDosha(value: unknown): ShareDosha | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = clip(row.id, 80);
  const name = clip(row.name, 120);
  const explanation = clip(row.explanation, 4000);
  if (!id || !name || !explanation) return null;
  return {
    id,
    name,
    level: clip(row.level, 20) ?? "none",
    critical: row.critical === true,
    explanation,
  };
}

function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function finite(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
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
