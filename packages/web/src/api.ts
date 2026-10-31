/** Worker origin for the Pages build. Empty means same-origin `/api/v1` (the Worker-hosted site). */
export function apiBase(): string {
  const configured = import.meta.env.VITE_API_BASE;
  if (configured == null) return "";
  return configured.trim().replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase()}${suffix}`;
}

/** Vite base without a trailing slash. Empty when the site is served at the host root. */
export function siteBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") return "";
  return base.replace(/\/$/, "");
}

/** In-app path such as `/` or `/result?x=1`, prefixed for GitHub Pages. */
export function appHref(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteBase()}${suffix}`;
}

export function isResultHref(href: string): boolean {
  const path = href.split("?")[0] || "/";
  const rest = stripBase(path, siteBase());
  return rest === "/result" || rest.startsWith("/result/");
}

/** 32-byte base64url tokens from POST /api/v1/shares. */
const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export type ShareHref = { kind: "token"; token: string } | { kind: "invalid" };

/**
 * `/s/<token>` and `?share=<token>` (on `/` or `/result`).
 * `base` is the Vite base without a trailing slash, e.g. `/porutham`.
 */
export function parseShareHref(href: string, base = siteBase()): ShareHref | null {
  const qIndex = href.indexOf("?");
  const path = qIndex === -1 ? href : href.slice(0, qIndex);
  const search = qIndex === -1 ? "" : href.slice(qIndex + 1);
  const params = new URLSearchParams(search);
  if (params.has("share")) {
    const share = params.get("share") ?? "";
    return SHARE_TOKEN_RE.test(share) ? { kind: "token", token: share } : { kind: "invalid" };
  }
  const match = stripBase(path, base).match(/^\/s\/([^/]+)\/?$/);
  if (!match) return null;
  let token = match[1];
  try {
    token = decodeURIComponent(token);
  } catch {
    return { kind: "invalid" };
  }
  return SHARE_TOKEN_RE.test(token) ? { kind: "token", token } : { kind: "invalid" };
}

function stripBase(path: string, base: string): string {
  if (!base) return path || "/";
  if (path === base) return "/";
  if (path.startsWith(`${base}/`)) return path.slice(base.length) || "/";
  return path || "/";
}

const shareReads = new Map<string, Promise<{ report: Report; expiresAt: string }>>();

/** Drop a cached share read so a retry reaches the network. An in-flight read stays shared until it settles. */
export function releaseShareRead(token: string) {
  shareReads.delete(token);
}

/** One network read per page load. StrictMode remounts share this promise, so dev does not burn the link. */
export function readShare(token: string): Promise<{ report: Report; expiresAt: string }> {
  const existing = shareReads.get(token);
  if (existing) return existing;
  const pending = api<{ report: Report; expiresAt: string }>(`/api/v1/shares/${encodeURIComponent(token)}`, {
    cache: "no-store",
  }).catch((error: unknown) => {
    if (!(error instanceof ApiError)) shareReads.delete(token);
    throw error;
  });
  shareReads.set(token, pending);
  return pending;
}

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = body.error ?? {};
    throw new ApiError(response.status, error.message || "The request failed.", error.fields);
  }
  return body as T;
}

export interface Tradition {
  id: string;
  name: string;
  confidence: "documented" | "approximate";
  summary: string;
  maxScore: number;
  scoreUnit: string;
}

export interface Named {
  id: string;
  name: string;
  index?: number;
  western?: string;
  localEn?: string;
  nameLocalEn?: string;
}

export interface Place {
  name: string;
  admin: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: string;
}

export interface Placement {
  nakshatra: { id: string; name: string; nameEn: string; nameTa: string };
  pada: number;
  rasi: { id: string; name: string; western: string };
  offset: string;
  timezone: string;
  ambiguous: boolean;
  siderealMoon: number;
}

export interface Report {
  tradition: { id: string; en: string; ta: string; confidence: string; summary: { en: string; ta: string } };
  lang?: "en" | "ta";
  score: number;
  maxScore: number;
  verdict: string;
  verdictText: string;
  checks: { id: string; name: string; meaning: string; level: string; points: number; maxPoints: number; critical: boolean; explanation: string }[];
  doshas: { id: string; name: string; level: string; critical: boolean; explanation: string }[];
  notes: string[];
  disclaimer: string;
  bride: PersonSide;
  groom: PersonSide;
}

export interface PersonSide {
  name?: string;
  nakshatra: { id: string; en: string; ta: string };
  pada: number;
  rasi: { id: string; en: string; ta: string; western: string };
  source: string;
  birth?: { offset: string; timezone: string; placeName?: string; ambiguous: boolean };
}
