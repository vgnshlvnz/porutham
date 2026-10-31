import type { Report } from "./api";
import { copy, levelLabel, type Lang } from "./i18n";

/** Star-mode pair the home screen opens. Tamil Nadu reads this as recommended. */
export const EXAMPLE_PAIR = {
  tradition: "tamil-nadu",
  bride: { nakshatraId: "hasta", pada: 1, rasiId: "kanya" },
  groom: { nakshatraId: "mrigashira", pada: 1, rasiId: "rishabha" },
} as const;

export type StatusTone = "match" | "partial" | "unavailable" | "veto" | "neutral";

export function statusTone(level: string, critical: boolean): StatusTone {
  if (level === "match") return "match";
  if (level === "partial") return "partial";
  if (level === "unavailable") return "unavailable";
  if (level === "none" && critical) return "veto";
  if (level === "none") return "neutral";
  return "neutral";
}

export function lineStatus(level: string, critical: boolean, lang: Lang): {
  label: string;
  tone: StatusTone;
  criticalLabel: string | null;
  asideNote: string | null;
} {
  const tone = statusTone(level, critical);
  return {
    label: levelLabel(lang, level),
    tone,
    criticalLabel: critical ? copy[lang].critical : null,
    asideNote: tone === "neutral" && level === "none" ? copy[lang].doesNotSetAside : null,
  };
}

function joinNames(names: string[], lang: Lang): string {
  if (names.length <= 1) return names[0] ?? "";
  if (lang === "ta") return names.join(", ");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function decisionLabel(lang: Lang, verdict: string): string {
  const t = copy[lang];
  if (verdict === "excellent") return t.decisionExcellent;
  if (verdict === "good") return t.decisionGood;
  if (verdict === "borderline") return t.decisionBorderline;
  if (verdict === "poor") return t.decisionPoor;
  return t.decisionAside;
}

export interface ReadingPerson {
  role: string;
  name: string;
  star: string;
  rasi: string;
}

export interface ReadingSummary {
  decision: string;
  reason: string;
  scoreLabel: string;
  outsideScore: string | null;
  people: ReadingPerson[];
  settingAside: Report["doshas"];
  otherDoshas: Report["doshas"];
}

export function readingSummary(report: Pick<Report, "verdict" | "checks" | "doshas" | "bride" | "groom">, lang: Lang): ReadingSummary {
  const t = copy[lang];
  const vetoChecks = report.checks.filter((check) => check.critical);
  const settingAside = report.doshas.filter((dosha) => dosha.critical);
  const names = [...vetoChecks.map((check) => check.name), ...settingAside.map((dosha) => dosha.name)];
  let reason: string;
  if (report.verdict === "not-recommended") {
    if (names.length === 1) reason = t.reasonAsideOne.replaceAll("{name}", names[0]);
    else if (names.length > 1) reason = t.reasonAsideMany.replaceAll("{names}", joinNames(names, lang));
    else reason = t.decisionAside;
  } else if (report.verdict === "excellent") reason = t.reasonExcellent;
  else if (report.verdict === "good") reason = t.reasonGood;
  else if (report.verdict === "borderline") reason = t.reasonBorderline;
  else reason = t.reasonPoor;

  const doshaNames = settingAside.map((dosha) => dosha.name);
  const outsideScore = doshaNames.length === 0
    ? null
    : doshaNames.length === 1
      ? t.doshaOutsideOne.replaceAll("{name}", doshaNames[0])
      : t.doshaOutsideMany.replaceAll("{names}", joinNames(doshaNames, lang));

  const person = (side: Report["bride"], role: string): ReadingPerson => ({
    role,
    name: side.name?.trim() || role,
    star: lang === "ta" ? side.nakshatra.ta : side.nakshatra.en,
    rasi: lang === "ta" ? side.rasi.ta : side.rasi.en,
  });

  return {
    decision: decisionLabel(lang, report.verdict),
    reason,
    scoreLabel: t.starScore,
    outsideScore,
    people: [person(report.bride, t.bride), person(report.groom, t.groom)],
    settingAside,
    otherDoshas: report.doshas.filter((dosha) => !dosha.critical),
  };
}
