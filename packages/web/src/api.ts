const API_KEY = import.meta.env.VITE_API_KEY || "vnm_dev_local_key";

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
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
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
