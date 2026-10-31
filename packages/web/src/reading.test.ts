import { describe, expect, it } from "vitest";
import { matchHoroscopes } from "../../engine/src/index.js";
import type { Report } from "./api";
import { lineStatus, readingSummary, EXAMPLE_PAIR } from "./reading";

const chennai = {
  latitude: 13.0827,
  longitude: 80.2707,
  timezone: "Asia/Kolkata",
  placeName: "Chennai",
};

function chevvaiPair(lang: "en" | "ta") {
  return matchHoroscopes({
    traditionId: "tamil-nadu",
    lang,
    bride: { name: "Meena", birth: { date: "1986-01-03", time: "06:20", ...chennai } },
    groom: { name: "Arun", birth: { date: "1986-02-18", time: "06:20", ...chennai } },
  });
}

describe("example pair", () => {
  it("opens a recommended Tamil Nadu reading", () => {
    const report = matchHoroscopes({
      traditionId: EXAMPLE_PAIR.tradition,
      lang: "en",
      bride: { name: "Bride", ...EXAMPLE_PAIR.bride },
      groom: { name: "Groom", ...EXAMPLE_PAIR.groom },
    });
    expect(report.verdict === "excellent" || report.verdict === "good").toBe(true);
    const summary = readingSummary(report, "en");
    expect(summary.decision).toBe("Recommended");
    expect(summary.outsideScore).toBeNull();
    expect(summary.settingAside).toEqual([]);
    const mahendra = report.checks.find((check) => check.id === "mahendra");
    expect(mahendra?.level).toBe("none");
    expect(mahendra?.critical).toBe(false);
    expect(lineStatus(mahendra!.level, mahendra!.critical, "en")).toMatchObject({
      tone: "neutral",
      label: "Does not match",
      asideNote: "Does not set this aside",
      criticalLabel: null,
    });
  });
});

describe("reading summary", () => {
  it("leads with the veto and says a critical dosha is outside the score", () => {
    const report = chevvaiPair("en");
    expect(report.score).toBe(9);
    expect(report.verdict).toBe("not-recommended");
    const summary = readingSummary(report, "en");
    expect(summary.decision).toBe("Not recommended");
    expect(summary.reason).toBe("Chevvai dosham sets this reading aside.");
    expect(summary.outsideScore).toBe("Chevvai dosham is outside this score.");
    expect(summary.settingAside.map((dosha) => dosha.id)).toEqual(["chevvai"]);
    expect(summary.otherDoshas).toEqual([]);
    expect(summary.people).toEqual([
      { role: "Bride", name: "Meena", star: "Uttara Phalguni", rasi: "Kanni" },
      { role: "Groom", name: "Arun", star: "Rohini", rasi: "Rishabam" },
    ]);
    const mahendra = report.checks.find((check) => check.id === "mahendra")!;
    expect(lineStatus(mahendra.level, mahendra.critical, "en").tone).toBe("neutral");
    expect(lineStatus("none", true, "en")).toMatchObject({
      tone: "veto",
      label: "Does not match",
      criticalLabel: "Critical",
      asideNote: null,
    });
  });

  it("names the same dosha in Tamil and keeps the score secondary", () => {
    const summary = readingSummary(chevvaiPair("ta"), "ta");
    expect(summary.decision).toBe("பரிந்துரைப்பதில்லை");
    expect(summary.reason).toBe("செவ்வாய் தோஷம் இந்த வாசிப்பை ஒதுக்குகிறது.");
    expect(summary.outsideScore).toBe("செவ்வாய் தோஷம் இந்த மதிப்பெண்ணுக்கு வெளியே.");
    expect(summary.scoreLabel).toBe("நட்சத்திர மதிப்பெண்");
    expect(summary.people[0]).toMatchObject({ name: "Meena", star: "உத்திரம்", rasi: "கன்னி" });
    expect(summary.people[1]).toMatchObject({ name: "Arun", star: "ரோகிணி", rasi: "ரிஷபம்" });
    expect(lineStatus("none", false, "ta")).toMatchObject({
      tone: "neutral",
      asideNote: "இந்த வாசிப்பை ஒதுக்காது",
      criticalLabel: null,
    });
  });

  it("names every vetoing check and does not call a check miss a dosha", () => {
    const report = matchHoroscopes({
      traditionId: "tamil-nadu",
      lang: "en",
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha", name: "Meena" },
      groom: { nakshatraId: "magha", pada: 1, rasiId: "simha", name: "Arun" },
    });
    const summary = readingSummary(report, "en");
    expect(summary.decision).toBe("Not recommended");
    expect(summary.reason).toBe("Dinam, Ganam, and Rajju set this reading aside.");
    expect(summary.outsideScore).toBeNull();
    expect(summary.settingAside).toEqual([]);
  });

  it("gives each non-veto band a decision and a one-sentence reason", () => {
    for (const lang of ["en", "ta"] as const) {
      for (const verdict of ["excellent", "good", "borderline", "poor"]) {
        const summary = readingSummary(stub(verdict), lang);
        expect(summary.decision.length).toBeGreaterThan(0);
        expect(summary.reason.length).toBeGreaterThan(0);
        expect(summary.reason).not.toMatch(/\{name/);
        expect(summary.outsideScore).toBeNull();
      }
    }
    expect(readingSummary(stub("excellent"), "en").decision).toBe("Recommended");
    expect(readingSummary(stub("good"), "en").reason).toBe("The checks agree.");
    expect(readingSummary(stub("poor"), "ta").decision).toBe("பொருத்தம் குறைவு");
  });
});

function stub(verdict: string): Report {
  return {
    tradition: { id: "tamil-nadu", en: "Tamil Nadu", ta: "தமிழ்நாடு", confidence: "documented", summary: { en: "", ta: "" } },
    score: 8,
    maxScore: 10,
    verdict,
    verdictText: "",
    checks: [],
    doshas: [],
    notes: [],
    disclaimer: "",
    bride: {
      name: "Meena",
      nakshatra: { id: "rohini", en: "Rohini", ta: "ரோகிணி" },
      pada: 1,
      rasi: { id: "rishabha", en: "Rishabam", ta: "ரிஷபம்", western: "Taurus" },
      source: "star",
    },
    groom: {
      name: "Arun",
      nakshatra: { id: "pushya", en: "Pushya", ta: "பூசம்" },
      pada: 1,
      rasi: { id: "kataka", en: "Kadagam", ta: "கடகம்", western: "Cancer" },
      source: "star",
    },
  };
}
