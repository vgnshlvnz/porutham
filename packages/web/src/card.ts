import { copy, levelLabel, type Lang } from "./i18n";
import { isWarningNote } from "./reportText";

export interface CardPerson {
  name?: string;
  nakshatra: { en: string; ta: string };
  pada: number;
  rasi: { en: string; ta: string };
}

export interface CardInput {
  tradition: { en: string; ta: string };
  score: number;
  maxScore: number;
  verdictText: string;
  checks: { name: string; level: string; critical?: boolean }[];
  doshas: { name: string; level: string; critical: boolean; explanation: string }[];
  notes: string[];
  bride?: CardPerson;
  groom?: CardPerson;
}

export type CardKind = "title" | "brand" | "tradition" | "score" | "verdict" | "section" | "check" | "dosha" | "detail" | "note" | "person" | "footer";

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
/** A short reading stays square. Longer copy grows the canvas past this. */
export const CARD_MIN_HEIGHT = 1080;
export const CARD_PAD = 72;
export const CARD_CONTENT_WIDTH = CARD_WIDTH - CARD_PAD * 2;
export const CARD_COLUMN_GAP = 48;
export const CARD_COLUMN_WIDTH = (CARD_CONTENT_WIDTH - CARD_COLUMN_GAP) / 2;

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
  role: "600 26px 'Source Sans 3', 'Noto Sans Tamil', sans-serif",
  name: "600 36px Fraunces, 'Noto Serif Tamil', serif",
  meta: "400 26px 'Source Sans 3', 'Noto Sans Tamil', sans-serif",
} as const;

const COLOR = {
  maroon: "#6E1F2C",
  gold: "#C8962E",
  ink: "#2A1614",
  cream: "#FBF6EE",
  sage: "#1E6B45",
  partial: "#8A5A12",
  /** A line that vetoed the reading. */
  veto: "#8C3A3A",
  /** A miss that does not set the reading aside, such as Mahendram. */
  miss: "#3E4C5A",
  muted: "#6B534C",
};

const VETO_MARK = 16;

type Measure = (text: string, font: string) => number;

function outcomeColor(level: string, veto: boolean): string {
  if (level === "match") return COLOR.sage;
  if (level === "partial") return COLOR.partial;
  if (level === "unavailable") return COLOR.muted;
  if (level === "none" && veto) return COLOR.veto;
  if (level === "none") return COLOR.miss;
  return COLOR.miss;
}

function isVeto(level: string, critical: boolean | undefined): boolean {
  return Boolean(critical) && level === "none";
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
  const add = (kind: CardKind, text: string, x: number, y: number, font: string, color: string) => {
    runs.push({ kind, text, x, y, font, color });
  };
  const block = (kind: CardKind, text: string, y: number, font: string, color: string, line: number, width = CARD_CONTENT_WIDTH, x = CARD_PAD) => {
    const lines = wrapLines(measure, text, font, width);
    for (const row of lines) {
      add(kind, row, x, y, font, color);
      y += line;
    }
    return y;
  };
  const vetoMark = (y: number) => {
    rects.push({ x: CARD_PAD - 28, y: y - 18, w: VETO_MARK, h: VETO_MARK, color: COLOR.veto });
  };
  const outcome = (kind: "check" | "dosha", name: string, level: string, critical: boolean | undefined, y: number, line: number) => {
    const veto = isVeto(level, critical);
    const suffix = veto ? ` · ${copy[lang].critical}` : "";
    const lines = wrapLines(measure, `${name}  ${levelLabel(lang, level)}${suffix}`, FONT.row, CARD_CONTENT_WIDTH);
    lines.forEach((row, index) => {
      if (veto && index === 0) vetoMark(y);
      add(kind, row, CARD_PAD, y, FONT.row, outcomeColor(level, veto));
      y += line;
    });
    return y;
  };

  add("title", "Vinmeen", CARD_PAD, 120, FONT.title, COLOR.maroon);
  add("brand", "விண்மீன்", CARD_PAD, 170, FONT.brand, COLOR.maroon);
  rects.push({ x: CARD_PAD, y: 196, w: 160, h: 6, color: COLOR.gold });

  let y = 270;
  if (report.bride || report.groom) {
    y = drawPeople(report, lang, 252, block, rects);
  }
  y = block("tradition", lang === "ta" ? report.tradition.ta : report.tradition.en, y, FONT.tradition, COLOR.ink, 52);
  const scoreY = Math.max(390, y + 24);
  add("score", `${report.score}/${report.maxScore}`, CARD_PAD, scoreY, FONT.score, COLOR.maroon);

  y = scoreY + 60;
  y = block("verdict", report.verdictText, y, FONT.verdict, COLOR.ink, 40);
  // Short verdicts keep the original check band. A longer verdict pushes that band down.
  y = Math.max(y + 28, 620);

  for (const check of report.checks) {
    y = outcome("check", check.name, check.level, check.critical, y, 44);
  }
  if (report.checks.length > 0) y += 12;

  if (report.doshas.length > 0) {
    y = block("section", copy[lang].dosha, y, FONT.section, COLOR.maroon, 42);
    y += 4;
    for (const dosha of report.doshas) {
      y = outcome("dosha", dosha.name, dosha.level, dosha.critical, y, 40);
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

  const footerY = y + 20;
  add("footer", lang === "ta" ? "பொருத்தம் · Vinmeen" : "Porutham · Vinmeen", CARD_PAD, footerY, FONT.footer, COLOR.maroon);
  return {
    width: CARD_WIDTH,
    height: Math.max(CARD_MIN_HEIGHT, footerY + 50),
    background: COLOR.cream,
    runs,
    rects,
  };
}

function drawPeople(
  report: CardInput,
  lang: Lang,
  top: number,
  block: (kind: CardKind, text: string, y: number, font: string, color: string, line: number, width?: number, x?: number) => number,
  rects: CardRect[],
): number {
  const column = (person: CardPerson, role: string, x: number, width: number) => {
    let y = block("person", role, top, FONT.role, COLOR.maroon, 40, width, x);
    const name = person.name?.replace(/\s+/g, " ").trim();
    if (name) y = block("person", name, y, FONT.name, COLOR.ink, 48, width, x);
    const star = lang === "ta" ? person.nakshatra.ta : person.nakshatra.en;
    const rasi = lang === "ta" ? person.rasi.ta : person.rasi.en;
    return block("person", `${star} · ${person.pada} · ${rasi}`, y, FONT.meta, COLOR.muted, 40, width, x);
  };

  if (report.bride && report.groom) {
    const left = column(report.bride, copy[lang].bride, CARD_PAD, CARD_COLUMN_WIDTH);
    const rightX = CARD_PAD + CARD_COLUMN_WIDTH + CARD_COLUMN_GAP;
    const right = column(report.groom, copy[lang].groom, rightX, CARD_COLUMN_WIDTH);
    const bottom = Math.max(left, right);
    rects.push({
      x: CARD_PAD + CARD_COLUMN_WIDTH + CARD_COLUMN_GAP / 2 - 1,
      y: top - 6,
      w: 2,
      h: Math.max(36, bottom - top),
      color: COLOR.gold,
    });
    return bottom + 28;
  }

  const person = report.bride ?? report.groom;
  if (!person) return top;
  const role = report.bride ? copy[lang].bride : copy[lang].groom;
  return column(person, role, CARD_PAD, CARD_CONTENT_WIDTH) + 28;
}
