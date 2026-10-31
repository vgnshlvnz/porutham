import { describe, expect, it } from "vitest";
import { matchHoroscopes } from "../../engine/src/index.js";
import {
  CARD_COLUMN_GAP,
  CARD_COLUMN_WIDTH,
  CARD_CONTENT_WIDTH,
  CARD_MIN_HEIGHT,
  CARD_PAD,
  CARD_WIDTH,
  planCard,
  type CardInput,
  type CardPlan,
} from "./card";
import { copy } from "./i18n";

const VETO = "#8C3A3A";
const MISS = "#3E4C5A";
const SAGE = "#1E6B45";
const MUTED = "#6B534C";

function measure(text: string, font: string): number {
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 16);
  return Array.from(text).length * size * 0.62;
}

function base(over: Partial<CardInput> = {}): CardInput {
  return {
    tradition: { en: "Tamil Nadu", ta: "தமிழ்நாடு" },
    score: 8,
    maxScore: 10,
    verdictText: "A good match on this scale.",
    checks: [
      { name: "Dinam", level: "match" },
      { name: "Ganam", level: "partial" },
    ],
    doshas: [],
    notes: [],
    ...over,
  };
}

function person(en: string, ta: string, rasiEn: string, rasiTa: string, pada = 1, name?: string) {
  return {
    name,
    nakshatra: { en, ta },
    pada,
    rasi: { en: rasiEn, ta: rasiTa },
  };
}

function footer(plan: CardPlan) {
  const run = plan.runs.find((item) => item.kind === "footer");
  if (!run) throw new Error("missing footer");
  return run;
}

describe("planCard people", () => {
  it("draws both people under the wordmark when names are given", () => {
    const plan = planCard(
      base({
        bride: person("Rohini", "ரோகிணி", "Rishabam", "ரிஷபம்", 1, "Meenakshi"),
        groom: person("Pushya", "பூசம்", "Kadagam", "கடகம்", 2, "Karthik"),
      }),
      "en",
      measure,
    );
    const people = plan.runs.filter((run) => run.kind === "person");
    const score = plan.runs.find((run) => run.kind === "score")!;
    expect(people.map((run) => run.text)).toEqual([
      "Bride",
      "Meenakshi",
      "Rohini · 1 · Rishabam",
      "Groom",
      "Karthik",
      "Pushya · 2 · Kadagam",
    ]);
    for (const run of people) expect(run.y).toBeLessThan(score.y);
    const bride = people[0];
    const groom = people[3];
    expect(bride.y).toBe(groom.y);
    expect(bride.x).toBe(CARD_PAD);
    expect(groom.x).toBe(CARD_PAD + CARD_COLUMN_WIDTH + CARD_COLUMN_GAP);
    expect(plan.runs.some((run) => run.kind === "person" && run.y > score.y)).toBe(false);
  });

  it("draws star and rasi in Tamil and leaves a name off when it was not given", () => {
    const plan = planCard(
      base({
        tradition: { en: "Tamil Nadu", ta: "தமிழ்நாடு" },
        bride: person("Ashwini", "அஸ்வினி", "Mesham", "மேஷம்", 1, "   "),
        groom: person("Magha", "மகம்", "Simmam", "சிம்மம்", 1, "மகேந்திரன்"),
      }),
      "ta",
      measure,
    );
    const people = plan.runs.filter((run) => run.kind === "person");
    expect(people.map((run) => run.text)).toEqual([
      "மணமகள்",
      "அஸ்வினி · 1 · மேஷம்",
      "மணமகன்",
      "மகேந்திரன்",
      "மகம் · 1 · சிம்மம்",
    ]);
    expect(people.some((run) => run.font.includes("36px") && run.x === CARD_PAD)).toBe(false);
  });

  it("wraps a long name inside the column, including one word wider than the column", () => {
    const spaced = "Annapoorani Subbulakshmi Venkatalakshmi";
    const wide = "A".repeat(60);
    const plan = planCard(
      base({
        bride: person("Rohini", "ரோகிணி", "Rishabam", "ரிஷபம்", 1, spaced),
        groom: person("Pushya", "பூசம்", "Kadagam", "கடகம்", 1, wide),
      }),
      "en",
      measure,
    );
    const nameFont = (run: { font: string }) => run.font.includes("36px");
    const brideLines = plan.runs.filter((run) => run.kind === "person" && run.x === CARD_PAD && nameFont(run));
    const groomLines = plan.runs.filter((run) => run.kind === "person" && run.x !== CARD_PAD && nameFont(run));
    expect(brideLines.length).toBeGreaterThan(1);
    expect(brideLines.map((run) => run.text).join(" ")).toBe(spaced);
    expect(groomLines.length).toBeGreaterThan(1);
    expect(groomLines.map((run) => run.text).join("")).toBe(wide);
    for (const run of [...brideLines, ...groomLines]) {
      expect(measure(run.text, run.font)).toBeLessThanOrEqual(CARD_COLUMN_WIDTH);
    }
    const tradition = plan.runs.find((run) => run.kind === "tradition")!;
    const lowestName = Math.max(...brideLines.map((run) => run.y), ...groomLines.map((run) => run.y));
    expect(tradition.y).toBeGreaterThan(lowestName);
  });
});

describe("planCard height", () => {
  it("keeps a short reading at 1080 and lets a long one grow with the footer", () => {
    const short = planCard(base(), "en", measure);
    expect(short.width).toBe(CARD_WIDTH);
    expect(short.height).toBe(CARD_MIN_HEIGHT);
    expect(footer(short).y + 50).toBeLessThan(short.height);

    const longVerdict = "அஸ்வினி மகத்துடன் பொருத்தம் ".repeat(8).trim();
    const long = planCard(
      base({
        verdictText: longVerdict,
        checks: Array.from({ length: 11 }, (_, index) => ({ name: `பொருத்தம் ${index + 1}`, level: "match" })),
        doshas: [
          {
            name: "கோத்திரம்",
            level: "none",
            critical: true,
            explanation: "இருவருக்கும் ஒரே கோத்திரம். தமிழ் பிராமண மரபு அதைத் தவிர்க்கும். இது நட்சத்திரக் கணக்கு அல்ல.",
          },
        ],
        notes: ["மணமகன்: பரணி பாதம் 1 வழக்கமாக மேஷம். நீங்கள் தேர்ந்தெடுத்த மிதுனம் ராசிப் பொருத்தத்துக்குப் பயன்படும்."],
      }),
      "ta",
      measure,
    );
    expect(long.height).toBeGreaterThan(CARD_MIN_HEIGHT);
    expect(long.height).toBe(footer(long).y + 50);
    expect(long.height).toBeGreaterThan(short.height);
    const verdict = long.runs.filter((run) => run.kind === "verdict");
    const checks = long.runs.filter((run) => run.kind === "check");
    expect(verdict.length).toBeGreaterThan(1);
    expect(checks[0].y).toBeGreaterThan(verdict[verdict.length - 1].y + 40);
  });
});

describe("planCard veto marking", () => {
  it("marks a vetoed line and paints a non-veto miss in a neutral tone", () => {
    const plan = planCard(
      base({
        checks: [
          { name: "Mahendram", level: "none" },
          { name: "Rajju", level: "none", critical: true },
          { name: "Dinam", level: "match", critical: true },
          { name: "Nadi", level: "unavailable" },
        ],
        doshas: [
          { name: "Gothra", level: "none", critical: true, explanation: "Same gothra." },
          { name: "Body rajju", level: "none", critical: false, explanation: "Shown beside the score." },
        ],
      }),
      "en",
      measure,
    );
    const line = (name: string) => plan.runs.find((run) => run.text.startsWith(name));
    const mahendra = line("Mahendram")!;
    const rajju = line("Rajju")!;
    const dina = line("Dinam")!;
    const nadi = line("Nadi")!;
    const gothra = line("Gothra")!;
    const body = line("Body rajju")!;

    expect(rajju.text).toBe(`Rajju Does not match · ${copy.en.critical}`);
    expect(rajju.color).toBe(VETO);
    expect(gothra.text).toContain(copy.en.critical);
    expect(gothra.color).toBe(VETO);
    expect(mahendra.text).toBe("Mahendram Does not match");
    expect(mahendra.color).toBe(MISS);
    expect(mahendra.color).not.toBe(rajju.color);
    expect(body.color).toBe(MISS);
    expect(body.text).not.toContain(copy.en.critical);
    expect(dina.color).toBe(SAGE);
    expect(dina.text).not.toContain(copy.en.critical);
    expect(nadi.color).toBe(MUTED);

    const marked = (y: number) => plan.rects.some((rect) => rect.color === VETO && rect.y === y - 18 && rect.w === 16);
    expect(marked(rajju.y)).toBe(true);
    expect(marked(gothra.y)).toBe(true);
    expect(marked(mahendra.y)).toBe(false);
    expect(marked(body.y)).toBe(false);
  });

  it("uses the Tamil critical label on a real Ashwini and Magha veto", () => {
    const groomName = "திருவாளர் சீனிவாச இராகவன் நாகரத்தார்";
    const report = matchHoroscopes({
      bride: { name: "அன்னபூரணி", nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { name: groomName, nakshatraId: "magha", pada: 1, rasiId: "simha" },
      traditionId: "tamil-nadu",
      lang: "ta",
    });
    const plan = planCard(report, "ta", measure);
    expect(plan.runs.some((run) => run.kind === "person" && run.text === "அன்னபூரணி")).toBe(true);
    expect(plan.runs.some((run) => run.kind === "person" && run.text.includes("அஸ்வினி") && run.text.includes("மேஷம்"))).toBe(true);
    expect(plan.runs.some((run) => run.kind === "person" && run.text.includes("மகம்") && run.text.includes("சிம்மம்"))).toBe(true);

    const nameLines = plan.runs.filter((run) => run.kind === "person" && run.font.includes("36px") && run.x !== CARD_PAD);
    expect(nameLines.length).toBeGreaterThan(1);
    expect(nameLines.map((run) => run.text).join(" ")).toBe(groomName);
    for (const run of nameLines) expect(measure(run.text, run.font)).toBeLessThanOrEqual(CARD_COLUMN_WIDTH);

    for (const check of report.checks) {
      const run = plan.runs.find((item) => item.kind === "check" && item.text.startsWith(check.name));
      expect(run, check.name).toBeTruthy();
      if (check.critical && check.level === "none") {
        expect(run!.color).toBe(VETO);
        expect(run!.text).toContain(copy.ta.critical);
        expect(plan.rects.some((rect) => rect.color === VETO && rect.y === run!.y - 18)).toBe(true);
      } else if (check.level === "none") {
        expect(run!.color).toBe(MISS);
        expect(run!.text).not.toContain(copy.ta.critical);
      }
    }
    expect(report.checks.some((check) => check.critical && check.level === "none" && check.id === "rajju")).toBe(true);
    expect(plan.height).toBeGreaterThan(CARD_MIN_HEIGHT);
    expect(plan.height).toBe(footer(plan).y + 50);
    for (const run of plan.runs) expect(measure(run.text, run.font)).toBeLessThanOrEqual(CARD_CONTENT_WIDTH);
  });
});
