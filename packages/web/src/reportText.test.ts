import { describe, expect, it } from "vitest";
import { matchHoroscopes } from "../../engine/src/index.js";
import { CARD_CONTENT_WIDTH, planCard, wrapLines } from "./card";
import { reportText } from "./reportText";

function measure(text: string, font: string): number {
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 16);
  return Array.from(text).length * size * 0.62;
}

const starPage = "https://vinmeen.test/result?tradition=tamil-nadu&lang=en&bMode=star&bName=Meena&bNak=rohini&bPada=2&bRasi=rishabha&gMode=star&gName=Arun&gNak=pushya&gPada=1&gRasi=kataka";

const birthPage = "https://vinmeen.test/result?tradition=tamil-nadu&lang=en&bMode=birth&bName=Meena&bDate=1990-08-15&bTime=10%3A30&bLat=13.0827&bLon=80.2707&bTz=Asia%2FKolkata&bPlace=Chennai&gMode=birth&gName=Arun&gDate=1992-01-02&gTime=08%3A15&gLat=9.9252&gLon=78.1198&gTz=Asia%2FKolkata&gPlace=Madurai";

const groomBirthPage = "https://vinmeen.test/result?bMode=star&bNak=rohini&bPada=1&bRasi=rishabha&gMode=birth&gDate=1992-01-02&gTime=08%3A15&gLat=9.9252&gLon=78.1198";

const oneTime = "https://vinmeen.test/s/abcdefghijklmnopqrstuvwxyzABCDEFGHIJK12";

const birthMarkers = ["1990-08-15", "10:30", "10%3A30", "13.0827", "80.2707", "1992-01-02", "08:15", "9.9252", "78.1198", "bDate", "bTime", "bLat", "bLon", "gDate", "gTime", "gLat", "gLon", "vinmeen.test"];

function expectNoBirthLeak(text: string) {
  for (const marker of birthMarkers) expect(text).not.toContain(marker);
}

describe("reportText", () => {
  function reading() {
    return matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha", gothra: "Bharadwaja" },
      groom: { nakshatraId: "bharani", pada: 1, rasiId: "mithuna", gothra: "bharadwaja" },
      traditionId: "brahmin",
      lang: "en",
    });
  }

  it("includes a critical dosha and the rasi warning", () => {
    const report = reading();
    const text = reportText(report, "en", "https://example.test/result");
    expect(text).toContain("Gothra: Does not match · Critical");
    expect(text).toContain("same gothra");
    expect(text).toContain("Groom:");
    expect(text).toContain("Mithunam");
    expect(text).toContain("https://example.test/result");
    expect(text.endsWith("https://example.test/result")).toBe(true);
    expect(report.verdict).toBe("not-recommended");
  });

  it("includes a star-only page URL, which has no birth date, time, or coordinates", () => {
    const text = reportText(reading(), "en", starPage);
    expect(text.endsWith(starPage)).toBe(true);
    expectNoBirthLeak(text.replace(starPage, ""));
  });

  it("omits a page URL that carries birth date, time, and coordinates", () => {
    const text = reportText(reading(), "en", birthPage);
    expect(text).toContain("Gothra: Does not match · Critical");
    expect(text).not.toContain("http");
    expectNoBirthLeak(text);
  });

  it("omits the URL when only the groom side has birth details", () => {
    const text = reportText(reading(), "ta", groomBirthPage);
    expect(text).toContain("விண்மீன்");
    expect(text).not.toContain("http");
    expectNoBirthLeak(text);
  });

  it("points copied text at the one-time share link instead of the birth-details page", () => {
    const text = reportText(reading(), "en", birthPage, oneTime);
    expect(text.endsWith(oneTime)).toBe(true);
    expect(text).not.toContain("bDate");
    expect(text).not.toContain("1990-08-15");
    expect(text).not.toContain("13.0827");
    expect(text).not.toContain("gLat");
    expect(text).not.toContain("/result?");
  });

  it("drops a one-time link that itself carries birth details", () => {
    const leakedOnce = `${oneTime}?bDate=1990-08-15&bTime=10:30&bLat=13.0827&bLon=80.2707`;
    const text = reportText(reading(), "en", birthPage, leakedOnce);
    expect(text).not.toContain("http");
    expectNoBirthLeak(text);
  });

  it("keeps a star-only page URL when the one-time link is unsafe", () => {
    const leakedOnce = "https://vinmeen.test/s/token?gDate=1992-01-02&gLat=9.9252&gLon=78.1198";
    const text = reportText(reading(), "en", starPage, leakedOnce);
    expect(text.endsWith(starPage)).toBe(true);
    expect(text).not.toContain("gDate");
    expect(text).not.toContain("1992-01-02");
  });

  it("omits birth details hidden in the fragment or written with mixed-case keys", () => {
    const fragment = "https://vinmeen.test/result#bDate=1990-08-15&bTime=10:30&bLat=13.0827&bLon=80.2707";
    const mixed = "https://vinmeen.test/result?BDate=1990-08-15&gTIME=08:15&BLat=13.0827&GLon=78.1198";
    for (const pageUrl of [fragment, mixed]) {
      const text = reportText(reading(), "en", pageUrl);
      expect(text).not.toContain("http");
      expect(text).not.toContain("1990-08-15");
      expect(text).not.toContain("13.0827");
    }
  });

  it("includes a consumed one-time page and leaves an unparseable address off", () => {
    const consumed = reportText(reading(), "en", oneTime);
    expect(consumed.endsWith(oneTime)).toBe(true);
    const broken = reportText(reading(), "ta", "http://[");
    expect(broken).not.toContain("http");
    expect(broken).toContain(reading().disclaimer);
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
    expect(plan.height).toBeGreaterThan(1350);
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
    expect(checks[0].y).toBe(620);
    expect(plan.height).toBe(1350);
    expect(plan.runs.find((run) => run.kind === "footer")!.y).toBe(1300);
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
