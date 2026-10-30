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

export function reportText(report: Report, lang: Lang, pageUrl?: string): string {
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
  if (pageUrl) lines.push(pageUrl);
  return lines.join("\n");
}
