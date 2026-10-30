import { describe, expect, it } from "vitest";
import { blank, personFormFromQuery, readPerson, seedFromSearch, writePerson, type PersonForm } from "./App";
import type { Place } from "./api";

const chennai: Place = {
  name: "Chennai",
  admin: "Tamil Nadu",
  country: "India",
  latitude: 13.0827,
  longitude: 80.2707,
  timezone: "Asia/Kolkata",
  source: "city-list",
};

function birthParams(lat: string | null): URLSearchParams {
  const params = new URLSearchParams({
    bMode: "birth",
    bName: "Meena",
    bDate: "1990-08-15",
    bTime: "10:30",
    bLon: "80.2707",
    bTz: "Asia/Kolkata",
    bPlace: "Chennai",
  });
  if (lat != null) params.set("bLat", lat);
  return params;
}

describe("readPerson", () => {
  it("keeps an explicit zero latitude", () => {
    const person = readPerson(birthParams("0"), "b");
    if (!("birth" in person) || !person.birth) throw new Error("expected birth details");
    expect(person.birth.latitude).toBe(0);
    expect(person.birth.longitude).toBe(80.2707);
  });

  it("rejects a missing latitude instead of using 0", () => {
    expect(() => readPerson(birthParams(null), "b")).toThrow(/finite/);
  });

  it("rejects blank, whitespace, and non-finite coordinates", () => {
    for (const lat of ["", "  ", "nope", "NaN", "Infinity"]) {
      expect(() => readPerson(birthParams(lat), "b")).toThrow(/finite/);
    }
    const missingLon = birthParams("13.08");
    missingLon.delete("bLon");
    expect(() => readPerson(missingLon, "b")).toThrow(/finite/);
  });
});

describe("seedFromSearch", () => {
  it("restores tradition, language, and both people from a result query", () => {
    const bride: PersonForm = {
      ...blank(),
      name: "Meena",
      nakshatraId: "rohini",
      pada: 2,
      rasiId: "rishabha",
      gothra: "Kaushika",
    };
    const groom: PersonForm = {
      ...blank(),
      mode: "birth",
      name: "Arun",
      date: "1992-01-02",
      time: "08:15",
      query: "Chennai",
      place: chennai,
      kovil: "illayathangudi",
    };
    const params = new URLSearchParams({ tradition: "kerala", lang: "ta" });
    writePerson(params, "b", bride);
    writePerson(params, "g", groom);

    const seed = seedFromSearch(`?${params.toString()}`);
    expect(seed.tradition).toBe("kerala");
    expect(seed.lang).toBe("ta");
    expect(seed.bride).toMatchObject({
      mode: "star",
      name: "Meena",
      nakshatraId: "rohini",
      pada: 2,
      rasiId: "rishabha",
      gothra: "Kaushika",
    });
    expect(seed.groom).toMatchObject({
      mode: "birth",
      name: "Arun",
      date: "1992-01-02",
      time: "08:15",
      query: "Chennai",
      kovil: "illayathangudi",
    });
    expect(seed.groom.place).toMatchObject({
      name: "Chennai",
      latitude: 13.0827,
      longitude: 80.2707,
      timezone: "Asia/Kolkata",
    });
    expect(personFormFromQuery(params, "b").nakshatraId).toBe("rohini");
  });

  it("leaves only the person with bad coordinates blank", () => {
    const params = birthParams(null);
    params.set("gMode", "star");
    params.set("gName", "Arun");
    params.set("gNak", "pushya");
    params.set("gPada", "4");
    params.set("gRasi", "kataka");
    params.set("tradition", "brahmin");

    const seed = seedFromSearch(params.toString());
    expect(seed.tradition).toBe("brahmin");
    expect(seed.bride).toEqual(blank());
    expect(seed.groom).toMatchObject({ name: "Arun", nakshatraId: "pushya", pada: 4, rasiId: "kataka" });
  });

  it("starts from the usual defaults when the query is empty", () => {
    const seed = seedFromSearch("");
    expect(seed).toEqual({ tradition: "tamil-nadu", lang: undefined, bride: blank(), groom: blank() });
  });
});
