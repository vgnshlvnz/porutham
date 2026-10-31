import { describe, expect, it } from "vitest";
import { matchHoroscopes } from "../../engine/src/index.js";
import { CARD_CONTENT_WIDTH, CARD_MIN_HEIGHT, planCard, wrapLines } from "./card";
import { reportText } from "./reportText";

function measure(text: string, font: string): number {
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 16);
  return Array.from(text).length * size * 0.62;
}

describe("reportText", () => {
  it("includes a critical dosha and the rasi warning", () => {
    const report = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha", gothra: "Bharadwaja" },
      groom: { nakshatraId: "bharani", pada: 1, rasiId: "mithuna", gothra: "bharadwaja" },
      traditionId: "brahmin",
      lang: "en",
    });
    const text = reportText(report, "en", "https://example.test/result");
    expect(text).toContain("Gothra: Does not match · Critical");
    expect(text).toContain("same gothra");
    expect(text).toContain("Groom:");
    expect(text).toContain("Mithunam");
    expect(text).toContain("https://example.test/result");
    expect(report.verdict).toBe("not-recommended");
  });
});

describe("save card layout", () => {
  it("wraps a long Tamil verdict and stacks doshas and warnings without overlap", () => {
    const verdict = "அஸ்வினி மகத்துடன் பொருத்தம் ".repeat(8).trim();
    expect(verdict.length).toBeGreaterThan(200);
    const checks = Array.from({ length: 11 }, (_, index) => ({
      name: `பொருத்தம் ${index + 1}`,
      level: index % 3 === 0 ? "none" : "match",
    }));
    const plan = planCard(
      {
        tradition: { en: "Tamil Nadu", ta: "தமிழ்நாடு — ரஜ்ஜு ஆரோகண விதிவிலக்கு" },
        score: 5.5,
        maxScore: 10,
        verdictText: verdict,
        checks,
        doshas: [
          {
            name: "கோத்திரம்",
            level: "none",
            critical: true,
            explanation: "இருவருக்கும் ஒரே கோத்திரம். தமிழ் பிராமண மரபு அதைத் தவிர்க்கும். இது நட்சத்திரக் கணக்கு அல்ல.",
          },
        ],
        notes: [
          "தோராயக் கூட்டு.",
          "மணமகன்: பரணி பாதம் 1 வழக்கமாக மேஷம். நீங்கள் தேர்ந்தெடுத்த மிதுனம் ராசிப் பொருத்தத்துக்குப் பயன்படும்.",
        ],
      },
      "ta",
      measure,
    );

    const verdictRuns = plan.runs.filter((run) => run.kind === "verdict");
    const checkRuns = plan.runs.filter((run) => run.kind === "check");
    expect(verdictRuns.length).toBeGreaterThan(1);
    expect(checkRuns[0].y).toBeGreaterThan(verdictRuns[verdictRuns.length - 1].y + 40);
    expect(plan.runs.some((run) => run.kind === "dosha" && run.text.includes("கோத்திரம்"))).toBe(true);
    expect(plan.runs.some((run) => run.kind === "note" && run.text.includes("மணமகன்:"))).toBe(true);
    expect(plan.runs.some((run) => run.text === "தோராயக் கூட்டு.")).toBe(false);
    const footer = plan.runs.find((run) => run.kind === "footer")!;
    expect(plan.height).toBeGreaterThan(1350);
    expect(plan.height).toBe(footer.y + 50);
    expect(plan.runs[plan.runs.length - 1].kind).toBe("footer");

    for (let i = 1; i < plan.runs.length; i++) {
      expect(plan.runs[i].y - plan.runs[i - 1].y).toBeGreaterThanOrEqual(34);
    }
    for (const run of plan.runs) {
      expect(measure(run.text, run.font)).toBeLessThanOrEqual(CARD_CONTENT_WIDTH);
    }
  });

  it("keeps a short card on the original canvas and check band", () => {
    const plan = planCard(
      {
        tradition: { en: "Tamil Nadu", ta: "தமிழ்நாடு" },
        score: 8,
        maxScore: 10,
        verdictText: "A good match on this scale.",
        checks: [
          { name: "Dinam", level: "match" },
          { name: "Ganam", level: "partial" },
        ],
        doshas: [],
        notes: ["The ten poruthams most Tamil Nadu families ask for."],
      },
      "en",
      measure,
    );
    const checks = plan.runs.filter((run) => run.kind === "check");
    const footer = plan.runs.find((run) => run.kind === "footer")!;
    expect(checks[0].y).toBe(620);
    expect(footer.y).toBeLessThan(900);
    expect(plan.height).toBe(CARD_MIN_HEIGHT);
    expect(footer.y + 50).toBeLessThan(plan.height);
    expect(plan.runs.some((run) => run.kind === "note")).toBe(false);
  });

  it("splits a token that is wider than the card", () => {
    const wide = (text: string) => text.length * 100;
    const lines = wrapLines(wide, "ABCDEFGHIJ", "400 32px sans-serif", 250);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe("ABCDEFGHIJ");
    for (const line of lines) expect(wide(line)).toBeLessThanOrEqual(250);
  });
});
