import type { Report } from "./api";
import { copy, levelLabel, type Lang } from "./i18n";

export function isWarningNote(note: string): boolean {
  return /^(Bride:|Groom:|மணமகள்:|மணமகன்:)/.test(note);
}

export function pairLine(report: Pick<Report, "bride" | "groom">, lang: Lang): string {
  const side = (person: Report["bride"]) => {
    const star = lang === "ta" ? person.nakshatra.ta : person.nakshatra.en;
    const rasi = lang === "ta" ? person.rasi.ta : person.rasi.en;
    return `${person.name ? `${person.name} · ` : ""}${star}, ${person.pada}, ${rasi}`;
  };
  return `${side(report.bride)}  ·  ${side(report.groom)}`;
}

/** Bride (`b`) and groom (`g`) query keys that put a birth date, clock time, or coordinates on a link. */
const BIRTH_DETAIL_KEY = /^[bg](?:date|time|lat|lon)$/i;

/**
 * True when a link's query string or fragment names a birth date, time, or coordinate.
 * Unparseable strings are treated as unsafe so they are never copied out.
 */
export function urlHasBirthDetails(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url, "https://vinmeen.invalid");
  } catch {
    return true;
  }
  const keys = [...parsed.searchParams.keys()];
  const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  if (hash.includes("=")) keys.push(...new URLSearchParams(hash).keys());
  return keys.some((key) => BIRTH_DETAIL_KEY.test(key));
}

/**
 * Link safe to append to copied text.
 * Prefer a one-time share link when one exists. Otherwise keep the page URL only
 * when it has no birth date, time, or coordinates (star-only results, and `/s/<token>`).
 */
export function reportCopyUrl(pageUrl?: string, oneTimeUrl?: string): string | undefined {
  if (oneTimeUrl && !urlHasBirthDetails(oneTimeUrl)) return oneTimeUrl;
  if (pageUrl && !urlHasBirthDetails(pageUrl)) return pageUrl;
  return undefined;
}

export function reportText(report: Report, lang: Lang, pageUrl?: string, oneTimeUrl?: string): string {
  const lines = [
    `Vinmeen · விண்மீன்`,
    lang === "ta" ? report.tradition.ta : report.tradition.en,
    `${report.score}/${report.maxScore}`,
    report.verdictText,
    pairLine(report, lang),
    ...report.checks.map((check) => `${check.name}: ${levelLabel(lang, check.level)}`),
  ];
  if (report.doshas.length > 0) {
    lines.push(copy[lang].dosha);
    for (const dosha of report.doshas) {
      const critical = dosha.critical ? ` · ${copy[lang].critical}` : "";
      lines.push(`${dosha.name}: ${levelLabel(lang, dosha.level)}${critical} — ${dosha.explanation}`);
    }
  }
  if (report.notes.length > 0) {
    lines.push(copy[lang].notes);
    lines.push(...report.notes);
  }
  lines.push(report.disclaimer);
  const link = reportCopyUrl(pageUrl, oneTimeUrl);
  if (link) lines.push(link);
  return lines.join("\n");
}
