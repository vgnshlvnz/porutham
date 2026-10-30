import { copy, levelLabel, type Lang } from "./i18n";
import { isWarningNote } from "./reportText";

export interface CardInput {
  tradition: { en: string; ta: string };
  score: number;
  maxScore: number;
  verdictText: string;
  checks: { name: string; level: string }[];
  doshas: { name: string; level: string; critical: boolean; explanation: string }[];
  notes: string[];
}

export type CardKind = "title" | "brand" | "tradition" | "score" | "verdict" | "section" | "check" | "dosha" | "detail" | "note" | "footer";

export interface CardRun {
  kind: CardKind;
  text: string;
  x: number;
  y: number;
  font: string;
  color: string;
}

export interface CardRect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface CardPlan {
  width: number;
  height: number;
  background: string;
  runs: CardRun[];
  rects: CardRect[];
}

export const CARD_WIDTH = 1080;
export const CARD_PAD = 72;
export const CARD_CONTENT_WIDTH = CARD_WIDTH - CARD_PAD * 2;

const FONT = {
  title: "600 72px Fraunces, 'Noto Serif Tamil', serif",
  brand: "600 36px 'Noto Serif Tamil', serif",
  tradition: "600 42px 'Source Sans 3', 'Noto Sans Tamil', sans-serif",
  score: "600 92px Fraunces, 'Noto Serif Tamil', serif",
  verdict: "400 32px 'Source Sans 3', 'Noto Sans Tamil', sans-serif",
  section: "600 32px 'Source Sans 3', 'Noto Sans Tamil', sans-serif",
  row: "600 28px 'Source Sans 3', 'Noto Sans Tamil', sans-serif",
  detail: "400 26px 'Source Sans 3', 'Noto Sans Tamil', sans-serif",
  footer: "400 24px 'Source Sans 3', 'Noto Sans Tamil', sans-serif",
} as const;

const COLOR = {
  maroon: "#6E1F2C",
  gold: "#C8962E",
  ink: "#2A1614",
  cream: "#FBF6EE",
  sage: "#1E6B45",
  partial: "#8A5A12",
  none: "#8C3A3A",
  muted: "#6B534C",
};

type Measure = (text: string, font: string) => number;

function levelColor(level: string): string {
  if (level === "match") return COLOR.sage;
  if (level === "partial") return COLOR.partial;
  if (level === "unavailable") return COLOR.muted;
  return COLOR.none;
}

/** Break text into lines that measure within `width`, including tokens wider than the column. */
export function wrapLines(measure: Measure, text: string, font: string, width: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const lines: string[] = [];
  let row = "";
  const commit = () => {
    if (row) lines.push(row);
    row = "";
  };
  for (const token of normalized.split(" ")) {
    for (const piece of splitWide(measure, token, font, width)) {
      const trial = row ? `${row} ${piece}` : piece;
      if (row && measure(trial, font) > width) {
        commit();
        row = piece;
      } else {
        row = trial;
      }
    }
  }
  commit();
  return lines;
}

function splitWide(measure: Measure, token: string, font: string, width: number): string[] {
  if (measure(token, font) <= width) return [token];
  const parts: string[] = [];
  let buf = "";
  for (const ch of Array.from(token)) {
    const trial = buf + ch;
    if (buf && measure(trial, font) > width) {
      parts.push(buf);
      buf = ch;
    } else {
      buf = trial;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

export function planCard(report: CardInput, lang: Lang, measure: Measure): CardPlan {
  const runs: CardRun[] = [];
  const rects: CardRect[] = [];
  const add = (kind: CardKind, text: string, y: number, font: string, color: string) => {
    runs.push({ kind, text, x: CARD_PAD, y, font, color });
  };
  const block = (kind: CardKind, text: string, y: number, font: string, color: string, line: number) => {
    const lines = wrapLines(measure, text, font, CARD_CONTENT_WIDTH);
    for (const row of lines) {
      add(kind, row, y, font, color);
      y += line;
    }
    return y;
  };

  add("title", "Vinmeen", 120, FONT.title, COLOR.maroon);
  add("brand", "விண்மீன்", 170, FONT.brand, COLOR.maroon);
  rects.push({ x: CARD_PAD, y: 196, w: 160, h: 6, color: COLOR.gold });

  let y = 270;
  y = block("tradition", lang === "ta" ? report.tradition.ta : report.tradition.en, y, FONT.tradition, COLOR.ink, 52);
  const scoreY = Math.max(390, y + 24);
  add("score", `${report.score}/${report.maxScore}`, scoreY, FONT.score, COLOR.maroon);

  y = scoreY + 60;
  y = block("verdict", report.verdictText, y, FONT.verdict, COLOR.ink, 40);
  // Short verdicts keep the original check band. A longer verdict pushes that band down.
  y = Math.max(y + 28, 620);

  for (const check of report.checks) {
    y = block("check", `${check.name}  ${levelLabel(lang, check.level)}`, y, FONT.row, levelColor(check.level), 44);
  }
  if (report.checks.length > 0) y += 12;

  if (report.doshas.length > 0) {
    y = block("section", copy[lang].dosha, y, FONT.section, COLOR.maroon, 42);
    y += 4;
    for (const dosha of report.doshas) {
      const critical = dosha.critical && dosha.level === "none" ? ` · ${copy[lang].critical}` : "";
      y = block("dosha", `${dosha.name}  ${levelLabel(lang, dosha.level)}${critical}`, y, FONT.row, levelColor(dosha.level), 40);
      y = block("detail", dosha.explanation, y, FONT.detail, COLOR.ink, 34);
      y += 14;
    }
  }

  const warnings = report.notes.filter(isWarningNote);
  if (warnings.length > 0) {
    y = block("section", copy[lang].notes, y, FONT.section, COLOR.maroon, 42);
    y += 4;
    for (const note of warnings) {
      y = block("note", note, y, FONT.detail, COLOR.partial, 34);
      y += 10;
    }
  }

  const footerY = Math.max(1300, y + 16);
  add("footer", lang === "ta" ? "பொருத்தம் · Vinmeen" : "Porutham · Vinmeen", footerY, FONT.footer, COLOR.maroon);
  return {
    width: CARD_WIDTH,
    height: Math.max(1350, footerY + 50),
    background: COLOR.cream,
    runs,
    rects,
  };
}
