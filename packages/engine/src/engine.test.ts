import { describe, expect, it } from "vitest";
import {
  InputError,
  KOVILS,
  NAKSHATRAS,
  RASIS,
  lahiriAyanamsa,
  listTraditions,
  localToUtc,
  matchHoroscopes,
  placementFromLongitude,
  rasiIndexForPada,
  resolvePerson,
  siderealChart,
} from "./index.js";

const rohiniPushya = {
  bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
  groom: { nakshatraId: "pushya", pada: 1, rasiId: "kataka" },
};

function check(traditionId: string, id: string, extra: Partial<typeof rohiniPushya> = {}) {
  const report = matchHoroscopes({
    ...rohiniPushya,
    ...extra,
    bride: extra.bride ?? rohiniPushya.bride,
    groom: extra.groom ?? rohiniPushya.groom,
    traditionId,
    lang: "en",
  });
  const row = report.checks.find((c) => c.id === id);
  if (!row) throw new Error(`missing ${id} on ${traditionId}`);
  return { report, row };
}

describe("catalog", () => {
  it("has 27 stars, 12 rasis, and balanced gana and nadi groups", () => {
    expect(NAKSHATRAS).toHaveLength(27);
    expect(RASIS).toHaveLength(12);
    expect(new Set(NAKSHATRAS.map((n) => n.id)).size).toBe(27);
    for (const gana of ["deva", "manushya", "rakshasa"]) {
      expect(NAKSHATRAS.filter((n) => n.gana === gana)).toHaveLength(9);
    }
    for (const nadi of ["adi", "madhya", "antya"]) {
      expect(NAKSHATRAS.filter((n) => n.nadi === nadi)).toHaveLength(9);
    }
    expect(KOVILS).toHaveLength(9);
  });

  it("puts junction padas in the right rasi", () => {
    const cases: [string, number, string, string][] = [
      ["krittika", 1, "mesha", "rishabha"],
      ["mrigashira", 2, "rishabha", "mithuna"],
      ["punarvasu", 3, "mithuna", "kataka"],
      ["uttara-phalguni", 1, "simha", "kanya"],
      ["chitra", 2, "kanya", "tula"],
      ["vishakha", 3, "tula", "vrischika"],
      ["uttara-ashadha", 1, "dhanus", "makara"],
      ["dhanishta", 2, "makara", "kumbha"],
      ["purva-bhadrapada", 3, "kumbha", "meena"],
    ];
    for (const [id, split, before, after] of cases) {
      const index = NAKSHATRAS.find((n) => n.id === id)!.index;
      expect(RASIS[rasiIndexForPada(index, split as 1)].id).toBe(before);
      expect(RASIS[rasiIndexForPada(index, (split + 1) as 2)].id).toBe(after);
    }
  });
});

describe("Tamil Nadu poruthams", () => {
  it("scores the Rohini bride and Pushya groom example line by line", () => {
    const { report } = check("tamil-nadu", "dina");
    const level = Object.fromEntries(report.checks.map((c) => [c.id, c.level]));
    expect(level).toMatchObject({
      dina: "none",
      gana: "match",
      mahendra: "none",
      "stree-deergha": "none",
      yoni: "match",
      rasi: "partial",
      "rasi-adhipathi": "none",
      vasya: "match",
      rajju: "match",
      vedha: "match",
    });
    expect(report.score).toBe(5.5);
    expect(report.maxScore).toBe(10);
    expect(report.verdict).toBe("not-recommended");
    expect(report.checks.every((c) => c.explanation.length > 20)).toBe(true);
  });

  it("covers each of the ten with a known pair", () => {
    expect(check("tamil-nadu", "dina", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "bharani", pada: 1, rasiId: "mesha" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "dina", { bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" }, groom: { nakshatraId: "rohini", pada: 2, rasiId: "rishabha" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "dina", { bride: { nakshatraId: "bharani", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "bharani", pada: 2, rasiId: "mesha" } }).row.level).toBe("none");
    expect(check("tamil-nadu", "dina", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "ashwini", pada: 2, rasiId: "mesha" } }).row.level).toBe("partial");
    expect(check("tamil-nadu", "gana", { bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" }, groom: { nakshatraId: "bharani", pada: 1, rasiId: "mesha" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "gana", { bride: { nakshatraId: "pushya", pada: 1, rasiId: "kataka" }, groom: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" } }).row.level).toBe("partial");
    expect(check("tamil-nadu", "gana", { bride: { nakshatraId: "krittika", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" } }).row.level).toBe("none");
    expect(check("tamil-nadu", "mahendra", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "stree-deergha", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "magha", pada: 1, rasiId: "simha" } }).row.level).toBe("partial");
    expect(check("tamil-nadu", "stree-deergha", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "chitra", pada: 1, rasiId: "kanya" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "yoni", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "hasta", pada: 1, rasiId: "kanya" } }).row.level).toBe("none");
    expect(check("tamil-nadu", "rasi", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "chitra", pada: 3, rasiId: "tula" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "rasi", { bride: { nakshatraId: "punarvasu", pada: 4, rasiId: "kataka" }, groom: { nakshatraId: "shravana", pada: 1, rasiId: "makara" } }).row.level).toBe("none");
    expect(check("tamil-nadu", "rasi", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "hasta", pada: 1, rasiId: "kanya" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "rasi", { bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" }, groom: { nakshatraId: "chitra", pada: 3, rasiId: "tula" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "rasi", { bride: { nakshatraId: "ashwini", pada: 2, rasiId: "mesha" }, groom: { nakshatraId: "bharani", pada: 1, rasiId: "mesha" } }).row.level).toBe("none");
    expect(check("tamil-nadu", "rasi-adhipathi", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "anuradha", pada: 1, rasiId: "vrischika" } }).row.level).toBe("match");
    expect(check("tamil-nadu", "vasya", { bride: { nakshatraId: "pushya", pada: 1, rasiId: "kataka" }, groom: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" } }).row.level).toBe("partial");
    expect(check("tamil-nadu", "rajju", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "magha", pada: 1, rasiId: "simha" } }).row.level).toBe("none");
    expect(check("tamil-nadu", "vedha", { bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" }, groom: { nakshatraId: "jyeshtha", pada: 1, rasiId: "vrischika" } }).row.level).toBe("none");
    expect(check("tamil-nadu", "vedha", { bride: { nakshatraId: "mrigashira", pada: 1, rasiId: "rishabha" }, groom: { nakshatraId: "chitra", pada: 1, rasiId: "kanya" } }).row.level).toBe("none");
  });

  it("writes Tamil explanations", () => {
    const report = matchHoroscopes({ ...rohiniPushya, traditionId: "tamil-nadu", lang: "ta" });
    expect(report.checks[0].name).toBe("தினம்");
    expect(report.bride.nakshatra.ta).toBe("ரோகிணி");
    expect(report.groom.nakshatra.ta).toBe("பூசம்");
    expect(report.checks[0].explanation).toContain("எண்ணியது 5");
    expect(report.verdictText).toContain("தமிழ்நாடு");
  });
});

describe("tradition differences", () => {
  it("lists eight traditions and marks the approximate ones", () => {
    const ids = listTraditions().map((t) => t.id);
    expect(ids).toEqual([
      "tamil-nadu",
      "tamil-aroha",
      "kongu",
      "sri-lankan-tamil",
      "brahmin",
      "chettiar",
      "kerala",
      "ashtakoota",
    ]);
    expect(listTraditions().filter((t) => t.confidence === "approximate").map((t) => t.id)).toEqual([
      "kongu",
      "brahmin",
      "chettiar",
    ]);
  });

  it("cancels opposite-flow rajju only in the aroha ruleset", () => {
    const pair = {
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "ashlesha", pada: 1, rasiId: "kataka" },
    };
    expect(matchHoroscopes({ ...pair, traditionId: "tamil-nadu", lang: "en" }).checks.find((c) => c.id === "rajju")!.level).toBe("none");
    expect(matchHoroscopes({ ...pair, traditionId: "tamil-aroha", lang: "en" }).checks.find((c) => c.id === "rajju")!.level).toBe("match");
  });

  it("does not give Kongu the five-key veto", () => {
    const tamil = matchHoroscopes({ ...rohiniPushya, traditionId: "tamil-nadu", lang: "en" });
    const kongu = matchHoroscopes({ ...rohiniPushya, traditionId: "kongu", lang: "en" });
    expect(tamil.verdict).toBe("not-recommended");
    expect(kongu.verdict).not.toBe("not-recommended");
    expect(kongu.notes[0].toLowerCase()).toContain("approximate");
  });

  it("adds nadi for Sri Lankan Tamil and for the brahmin composite", () => {
    const sl = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "ardra", pada: 1, rasiId: "mithuna" },
      traditionId: "sri-lankan-tamil",
      lang: "en",
    });
    expect(sl.maxScore).toBe(11);
    expect(sl.checks.find((c) => c.id === "nadi")!.level).toBe("none");
    const brahmin = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha", gothra: "Bharadwaja" },
      groom: { nakshatraId: "bharani", pada: 1, rasiId: "mesha", gothra: "bharadwaja" },
      traditionId: "brahmin",
      lang: "en",
    });
    expect(brahmin.doshas.find((d) => d.id === "gothra")!.level).toBe("none");
    expect(brahmin.doshas.find((d) => d.id === "dasa-sandhi")!.level).toBe("unavailable");
  });

  it("warns on the same Nagarathar kovil and allows the pirivu note", () => {
    const same = matchHoroscopes({
      bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha", kovil: "pillaiyarpatti" },
      groom: { nakshatraId: "pushya", pada: 1, rasiId: "kataka", kovil: "pillaiyarpatti" },
      traditionId: "chettiar",
      lang: "en",
    });
    expect(same.doshas.find((d) => d.id === "kovil")!.level).toBe("none");
    const pirivu = matchHoroscopes({
      bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha", kovil: "mathur" },
      groom: { nakshatraId: "pushya", pada: 1, rasiId: "kataka", kovil: "mathur" },
      traditionId: "chettiar",
      lang: "ta",
    });
    expect(pirivu.doshas.find((d) => d.id === "kovil")!.level).toBe("partial");
    expect(pirivu.doshas.find((d) => d.id === "kovil")!.explanation).toContain("பிரிவு");
  });

  it("uses Kerala thresholds, neutral lords, nadi-rajju, and Raman vedha", () => {
    const stree = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "punarvasu", pada: 1, rasiId: "mithuna" },
      traditionId: "kerala",
      lang: "en",
    });
    const tamil = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "punarvasu", pada: 1, rasiId: "mithuna" },
      traditionId: "tamil-nadu",
      lang: "en",
    });
    expect(tamil.checks.find((c) => c.id === "stree-deergha")!.level).toBe("none");
    expect(stree.checks.find((c) => c.id === "stree-deergha")!.level).toBe("partial");

    const lords = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
      traditionId: "kerala",
      lang: "en",
    });
    const tamilLords = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
      traditionId: "tamil-nadu",
      lang: "en",
    });
    expect(tamilLords.checks.find((c) => c.id === "rasi-adhipathi")!.level).toBe("partial");
    expect(lords.checks.find((c) => c.id === "rasi-adhipathi")!.level).toBe("match");

    const vedha = matchHoroscopes({
      bride: { nakshatraId: "mrigashira", pada: 1, rasiId: "rishabha" },
      groom: { nakshatraId: "chitra", pada: 1, rasiId: "kanya" },
      traditionId: "kerala",
      lang: "en",
    });
    expect(vedha.checks.find((c) => c.id === "vedha")!.level).toBe("match");
    expect(vedha.checks.find((c) => c.id === "rajju")!.explanation.toLowerCase()).toContain("nadi");
    expect(vedha.doshas.find((d) => d.id === "body-rajju")).toBeTruthy();
  });

  it("scores Ashtakoota out of 36 and cancels same-lord bhakoot", () => {
    const report = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "anuradha", pada: 1, rasiId: "vrischika" },
      traditionId: "ashtakoota",
      lang: "en",
    });
    expect(report.maxScore).toBe(36);
    expect(report.checks.map((c) => c.id)).toEqual([
      "varna", "vashya", "tara", "yoni", "graha-maitri", "gana", "bhakoot", "nadi",
    ]);
    expect(report.checks.find((c) => c.id === "bhakoot")!.points).toBe(7);
    expect(report.checks.find((c) => c.id === "graha-maitri")!.points).toBe(5);
    const plain = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "hasta", pada: 1, rasiId: "kanya" },
      traditionId: "ashtakoota",
      lang: "en",
    });
    expect(plain.checks.find((c) => c.id === "bhakoot")!.points).toBe(0);
    expect(report.checks.every((c) => c.explanation.length > 15)).toBe(true);
  });
});

describe("time and astronomy", () => {
  it("applies historical offsets, including India's wartime clock and DST", () => {
    expect(localToUtc("1943-01-15", "10:30", "Asia/Kolkata").offset).toBe("+06:30");
    expect(localToUtc("1950-01-15", "10:30", "Asia/Kolkata").offset).toBe("+05:30");
    expect(localToUtc("1990-08-15", "10:30", "Asia/Kolkata").instant).toBe("1990-08-15T05:00:00.000Z");
    expect(localToUtc("1965-06-15", "12:00", "America/New_York").instant).toBe("1965-06-15T16:00:00.000Z");
    expect(localToUtc("1965-12-15", "12:00", "America/New_York").instant).toBe("1965-12-15T17:00:00.000Z");
    expect(localToUtc("2024-06-15", "12:00", "Europe/London").offset).toBe("+01:00");
    expect(localToUtc("2024-01-15", "12:00", "Europe/London").offset).toBe("+00:00");
    expect(localToUtc("2010-01-15", "21:00", "Australia/Sydney").offset).toBe("+11:00");
    expect(localToUtc("2010-07-15", "21:00", "Australia/Sydney").offset).toBe("+10:00");
    expect(localToUtc("1975-08-15", "09:00", "Asia/Singapore").offset).toBe("+07:30");
    expect(localToUtc("1988-06-01", "20:00", "Asia/Dubai").offset).toBe("+04:00");
  });

  it("rejects a daylight-saving gap and an unknown zone", () => {
    expect(() => localToUtc("2024-03-10", "02:30", "America/New_York")).toThrow(InputError);
    expect(() => localToUtc("1990-08-15", "10:30", "Madras")).toThrow(InputError);
  });

  it("matches Swiss Ephemeris Lahiri fixtures closely enough to keep the nakshatra", () => {
    const fixtures: [string, number][] = [
      ["2000-01-01T12:00:00Z", 23.857092],
      ["1990-08-15T05:00:00Z", 23.726058],
      ["1985-04-14T01:45:00Z", 23.651517],
      ["2015-01-15T02:30:00Z", 24.067162],
      ["1960-11-05T16:45:00Z", 23.310209],
    ];
    for (const [iso, expected] of fixtures) {
      const got = lahiriAyanamsa(new Date(iso));
      expect(Math.abs(got - expected) * 3600).toBeLessThan(30);
    }
  });

  it("computes the Chennai reference Moon as Rohini pada 3, Rishabam", () => {
    const when = localToUtc("1990-08-15", "10:30", "Asia/Kolkata");
    const chart = siderealChart(when.utc, 13.0827, 80.2707);
    expect(Math.abs(chart.moon - 48.929996)).toBeLessThan(0.05);
    expect(Math.abs(chart.mars - 27.486919)).toBeLessThan(0.05);
    expect(Math.abs(chart.venus - 97.842563)).toBeLessThan(0.08);
    expect(Math.abs(chart.lagna - 184.350266)).toBeLessThan(0.2);
    const place = placementFromLongitude(chart.moon);
    expect(place.nakshatra.id).toBe("rohini");
    expect(place.pada).toBe(3);
    expect(place.rasi.id).toBe("rishabha");
    const person = resolvePerson({
      birth: { date: "1990-08-15", time: "10:30", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata", placeName: "Chennai" },
    });
    expect(person.nakshatraId).toBe("rohini");
    expect(person.pada).toBe(3);
    expect(person.chart).toBeTruthy();
  });
});

const neutralLords = {
  bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
  groom: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
};

describe("scored explanations", () => {
  it("calls two neutral lords a full point in Kerala and partial in Tamil Nadu", () => {
    const kerala = matchHoroscopes({ ...neutralLords, traditionId: "kerala", lang: "en" });
    const lords = kerala.checks.find((c) => c.id === "rasi-adhipathi")!;
    expect(lords.level).toBe("match");
    expect(lords.points).toBe(1);
    expect(lords.explanation).toContain("full match (1)");
    expect(lords.explanation.toLowerCase()).not.toContain("partial");

    const tamil = matchHoroscopes({ ...neutralLords, traditionId: "tamil-nadu", lang: "en" });
    const tamilLords = tamil.checks.find((c) => c.id === "rasi-adhipathi")!;
    expect(tamilLords.level).toBe("partial");
    expect(tamilLords.points).toBe(0.5);
    expect(tamilLords.explanation).toContain("partial (0.5)");

    const keralaTa = matchHoroscopes({ ...neutralLords, traditionId: "kerala", lang: "ta" });
    const taLords = keralaTa.checks.find((c) => c.id === "rasi-adhipathi")!.explanation;
    expect(taLords).toContain("முழுப் பொருத்தம்");
    expect(taLords).not.toContain("பாதி");

    const tamilTa = matchHoroscopes({ ...neutralLords, traditionId: "tamil-nadu", lang: "ta" });
    expect(tamilTa.checks.find((c) => c.id === "rasi-adhipathi")!.explanation).toContain("பாதி");
  });

  it("states the graha maitri scale for the relation that scored", () => {
    const report = matchHoroscopes({ ...neutralLords, traditionId: "ashtakoota", lang: "en" });
    const row = report.checks.find((c) => c.id === "graha-maitri")!;
    expect(row.points).toBe(3);
    expect(row.maxPoints).toBe(5);
    expect(row.explanation).toContain("3 / 5");
    expect(row.explanation).toContain("3 for two neutrals");
    expect(row.explanation).toContain("0.5");
    expect(row.explanation.toLowerCase()).not.toContain("are partial");

    const ta = matchHoroscopes({ ...neutralLords, traditionId: "ashtakoota", lang: "ta" });
    const text = ta.checks.find((c) => c.id === "graha-maitri")!.explanation;
    expect(text).toContain("3 / 5");
    expect(text).toContain("இரு நடுநிலை 3");
  });

  it("describes Ashtakoota Deva with Rakshasa as 1/6, and Tamil porutham as a miss", () => {
    const pair = {
      bride: { nakshatraId: "krittika", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
    };
    const guna = matchHoroscopes({ ...pair, traditionId: "ashtakoota", lang: "en" });
    const gana = guna.checks.find((c) => c.id === "gana")!;
    expect(gana.points).toBe(1);
    expect(gana.maxPoints).toBe(6);
    expect(gana.level).toBe("partial");
    expect(gana.explanation).toContain("Deva with Rakshasa scores 1");
    expect(gana.explanation).toContain("1 / 6");
    expect(gana.explanation.toLowerCase()).not.toContain("does not match");

    const ta = matchHoroscopes({ ...pair, traditionId: "ashtakoota", lang: "ta" });
    const taText = ta.checks.find((c) => c.id === "gana")!.explanation;
    expect(taText).toContain("தேவமும் ராட்சசமும் 1");
    expect(taText).toContain("1 / 6");
    expect(taText).not.toContain("பொருந்தாது");

    const tamil = matchHoroscopes({ ...pair, traditionId: "tamil-nadu", lang: "en" });
    const tamilGana = tamil.checks.find((c) => c.id === "gana")!;
    expect(tamilGana.level).toBe("none");
    expect(tamilGana.explanation.toLowerCase()).toContain("this pair does not match");
  });
});

describe("critical badge and verdict names", () => {
  it("marks only the checks that vetoed, including a five-key miss", () => {
    const tamil = matchHoroscopes({ ...rohiniPushya, traditionId: "tamil-nadu", lang: "en" });
    const flag = Object.fromEntries(tamil.checks.map((c) => [c.id, c.critical]));
    expect(tamil.checks.find((c) => c.id === "rajju")!.level).toBe("match");
    expect(tamil.checks.find((c) => c.id === "dina")!.level).toBe("none");
    expect(flag.rajju).toBe(false);
    expect(flag.vedha).toBe(false);
    expect(flag.dina).toBe(true);
    expect(flag.gana).toBe(false);
    expect(flag.yoni).toBe(false);
    expect(flag.rasi).toBe(false);
    expect(flag["rasi-adhipathi"]).toBe(false);

    const kongu = matchHoroscopes({ ...rohiniPushya, traditionId: "kongu", lang: "en" });
    expect(kongu.checks.find((c) => c.id === "dina")!.critical).toBe(false);
    expect(kongu.checks.find((c) => c.id === "rajju")!.critical).toBe(false);

    const yoni = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "hasta", pada: 1, rasiId: "kanya" },
      traditionId: "tamil-nadu",
      lang: "en",
    });
    expect(yoni.verdict).toBe("not-recommended");
    expect(yoni.checks.find((c) => c.id === "yoni")!.level).toBe("none");
    expect(yoni.checks.find((c) => c.id === "yoni")!.critical).toBe(true);
    expect(yoni.checks.find((c) => c.id === "rajju")!.level).toBe("match");
    expect(yoni.checks.find((c) => c.id === "rajju")!.critical).toBe(false);

    const keralaPass = matchHoroscopes({ ...neutralLords, traditionId: "kerala", lang: "en" });
    expect(keralaPass.checks.find((c) => c.id === "rajju")!.level).toBe("match");
    expect(keralaPass.checks.find((c) => c.id === "rajju")!.critical).toBe(false);
    expect(keralaPass.checks.find((c) => c.id === "vedha")!.critical).toBe(false);

    const madhya = matchHoroscopes({
      bride: { nakshatraId: "bharani", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "pushya", pada: 1, rasiId: "kataka" },
      traditionId: "kerala",
      lang: "en",
    });
    expect(madhya.checks.find((c) => c.id === "rajju")!.level).toBe("none");
    expect(madhya.checks.find((c) => c.id === "rajju")!.critical).toBe(true);

    const partialNadi = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "ardra", pada: 1, rasiId: "mithuna" },
      traditionId: "kerala",
      lang: "en",
    });
    expect(partialNadi.checks.find((c) => c.id === "rajju")!.level).toBe("partial");
    expect(partialNadi.checks.find((c) => c.id === "rajju")!.critical).toBe(false);

    const nadiMiss = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "ardra", pada: 1, rasiId: "mithuna" },
      traditionId: "ashtakoota",
      lang: "en",
    });
    expect(nadiMiss.checks.find((c) => c.id === "nadi")!.level).toBe("none");
    expect(nadiMiss.checks.find((c) => c.id === "nadi")!.critical).toBe(true);
    const nadiOk = matchHoroscopes({
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "bharani", pada: 1, rasiId: "mesha" },
      traditionId: "ashtakoota",
      lang: "en",
    });
    expect(nadiOk.checks.find((c) => c.id === "nadi")!.level).toBe("match");
    expect(nadiOk.checks.find((c) => c.id === "nadi")!.critical).toBe(false);
  });

  it("names Rajju once when Tamil Nadu Ashwini and Magha fail Rajju and the five keys", () => {
    const pair = {
      bride: { nakshatraId: "ashwini", pada: 1, rasiId: "mesha" },
      groom: { nakshatraId: "magha", pada: 1, rasiId: "simha" },
    };
    const en = matchHoroscopes({ ...pair, traditionId: "tamil-nadu", lang: "en" });
    expect(en.verdict).toBe("not-recommended");
    expect(en.checks.find((c) => c.id === "rajju")!.level).toBe("none");
    expect(en.checks.find((c) => c.id === "rajju")!.critical).toBe(true);
    expect(en.checks.find((c) => c.id === "dina")!.critical).toBe(true);
    expect(en.checks.find((c) => c.id === "gana")!.critical).toBe(true);
    expect(en.checks.find((c) => c.id === "vedha")!.critical).toBe(false);
    expect(en.verdictText.match(/Rajju/g)).toEqual(["Rajju"]);
    expect(en.verdictText).toContain("Dinam, Ganam, Rajju failed");
    expect(en.verdictText).not.toContain("Rajju did not clear");

    const ta = matchHoroscopes({ ...pair, traditionId: "tamil-nadu", lang: "ta" });
    expect(ta.verdictText.match(/ரஜ்ஜு/g)).toEqual(["ரஜ்ஜு"]);
    expect(ta.verdictText).toContain("தினம், கணம், ரஜ்ஜு இல்லாததால்");
    expect(ta.verdictText).not.toContain("ரஜ்ஜு தவறியுள்ளது");
  });
});
