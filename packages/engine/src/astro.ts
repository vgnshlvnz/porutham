import {
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoVector,
  SiderealTime,
} from "astronomy-engine";
import { DateTime } from "luxon";

const DEG = Math.PI / 180;

export class InputError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface LocalInstant {
  utc: Date;
  /** ISO-8601 UTC instant. */
  instant: string;
  /** Offset actually used, such as +05:30 or -04:00. */
  offset: string;
  timezone: string;
  ambiguous: boolean;
}

/** Convert a civil date and clock time in an IANA zone to UTC, including historical DST. */
export function localToUtc(date: string, time: string, timezone: string): LocalInstant {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new InputError("invalid_date", "Date must be YYYY-MM-DD.");
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new InputError("invalid_time", "Time must be HH:mm in 24-hour form.");
  }
  if (!isIanaZone(timezone)) {
    throw new InputError("invalid_timezone", "Timezone must be an IANA name such as Asia/Kolkata or America/New_York.");
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split("-").join(":").split(":").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new InputError("invalid_date", "That date or time is not a real clock reading.");
  }
  if (year < 1800 || year > 2100) {
    throw new InputError("year_out_of_range", "Birth years in this version must be between 1800 and 2100.");
  }

  const matches: DateTime[] = [];
  for (let offsetMin = -14 * 60; offsetMin <= 14 * 60; offsetMin += 15) {
    const utc = DateTime.fromObject(
      { year, month, day, hour, minute, second: 0 },
      { zone: "utc" },
    ).minus({ minutes: offsetMin });
    if (!utc.isValid) continue;
    const local = utc.setZone(timezone);
    if (
      local.year === year &&
      local.month === month &&
      local.day === day &&
      local.hour === hour &&
      local.minute === minute
    ) {
      matches.push(local);
    }
  }
  const unique = new Map<number, DateTime>();
  for (const local of matches) unique.set(local.offset, local);
  const options = [...unique.values()].sort((a, b) => a.toMillis() - b.toMillis());
  if (options.length === 0) {
    throw new InputError(
      "time_gap",
      "That clock time did not occur in this time zone (a daylight-saving gap, or an impossible date).",
    );
  }
  const chosen = options[0];
  return {
    utc: chosen.toUTC().toJSDate(),
    instant: chosen.toUTC().toISO() ?? chosen.toUTC().toString(),
    offset: chosen.toFormat("ZZ"),
    timezone,
    ambiguous: options.length > 1,
  };
}

export function isIanaZone(zone: string): boolean {
  if (zone === "UTC" || zone === "Etc/UTC") return true;
  if (!zone.includes("/")) return false;
  return DateTime.now().setZone(zone).isValid;
}

export function julianDayUt(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Lahiri (Chitrapaksha) ayanamsa in degrees.
 * Mean value is anchored at 23°51′25.53″ at J2000 and advanced with the IAU 2006
 * precession in longitude, plus the leading IAU 1980 nutation terms.
 * Checked against Swiss Ephemeris SE_SIDM_LAHIRI within about 20 arcseconds
 * on the fixture dates in the engine tests (1900–2100).
 */
export function lahiriAyanamsa(date: Date): number {
  const jd = julianDayUt(date);
  const T = (jd - 2451545.0) / 36525;
  const ayan0 = 23 + 51 / 60 + 25.53 / 3600;
  const pArcsec =
    5028.796195 * T +
    1.1054348 * T * T +
    0.00007964 * T ** 3 -
    0.000023857 * T ** 4;
  return norm(ayan0 + pArcsec / 3600 + nutationLongitude(T));
}

function nutationLongitude(T: number): number {
  const rad = (deg: number) => deg * DEG;
  const D = rad(norm(297.85036 + 445267.11148 * T - 0.0019142 * T * T + (T ** 3) / 189474));
  const M = rad(norm(357.52772 + 35999.05034 * T - 0.0001603 * T * T - (T ** 3) / 300000));
  const Mp = rad(norm(134.96298 + 477198.867398 * T + 0.0086972 * T * T + (T ** 3) / 56250));
  const F = rad(norm(93.27191 + 483202.017538 * T - 0.0036825 * T * T + (T ** 3) / 327270));
  const Om = rad(norm(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T ** 3) / 450000));
  const terms: [number, number, number, number, number, number][] = [
    [-171996 - 174.2 * T, 0, 0, 0, 0, 1],
    [-13187 - 1.6 * T, -2, 0, 0, 2, 2],
    [-2274 - 0.2 * T, 0, 0, 0, 2, 2],
    [2062 + 0.2 * T, 0, 0, 0, 0, 2],
    [1426 - 3.4 * T, 0, 1, 0, 0, 0],
    [712 + 0.1 * T, 0, 0, 1, 0, 0],
    [-517 + 1.2 * T, -2, 1, 0, 2, 2],
    [-386 - 0.4 * T, 0, 0, 0, 2, 1],
    [-301, 0, 0, 1, 2, 2],
    [217 - 0.5 * T, -2, -1, 0, 2, 2],
    [-158, -2, 0, 1, 0, 0],
    [129 + 0.1 * T, -2, 0, 0, 2, 1],
    [123, 0, 0, -1, 2, 2],
    [63, 2, 0, 0, 0, 0],
    [63 + 0.1 * T, 0, 0, 1, 0, 1],
    [-59, 2, 0, -1, 2, 2],
    [-58 - 0.1 * T, 0, 0, -1, 0, 1],
    [-51, 0, 0, 1, 2, 1],
    [48, -2, 0, 2, 0, 0],
    [46, 0, 0, -2, 2, 1],
    [-38, 2, 0, 0, 2, 2],
    [-31, 0, 0, 2, 2, 2],
    [29, 0, 0, 2, 0, 0],
    [29, -2, 0, 1, 2, 2],
    [26, 0, 0, 0, 2, 0],
    [-22, -2, 0, 0, 2, 0],
    [21, 0, 0, -1, 2, 1],
    [17 - 0.1 * T, 0, 2, 0, 0, 0],
    [16, 2, 0, -1, 0, 1],
    [-15, 0, 1, 0, 0, 1],
  ];
  let dpsi = 0;
  for (const [coeff, aD, aM, aMp, aF, aOm] of terms) {
    dpsi += coeff * Math.sin(aD * D + aM * M + aMp * Mp + aF * F + aOm * Om);
  }
  return dpsi / 10000 / 3600;
}

function tropicalBody(body: Body, date: Date): number {
  if (body === Body.Moon) return norm(EclipticGeoMoon(date).lon);
  const ecl = Ecliptic(GeoVector(body, date, true));
  return norm(ecl.elon);
}

/** Mean lunar node, tropical longitude of date, Meeus. */
export function meanNodeTropical(date: Date): number {
  const T = (julianDayUt(date) - 2451545.0) / 36525;
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T ** 3) / 467441);
}

function meanObliquity(date: Date): number {
  const T = (julianDayUt(date) - 2451545.0) / 36525;
  const arcsec = 84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.0020034 * T ** 3;
  return arcsec / 3600;
}

/** Tropical ascendant, degrees, apparent sidereal time and mean obliquity. */
export function tropicalAscendant(date: Date, latitude: number, longitude: number): number {
  const gast = SiderealTime(date);
  const lst = norm((gast + longitude / 15) * 15);
  const ramc = lst * DEG;
  const eps = meanObliquity(date) * DEG;
  const lat = latitude * DEG;
  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps));
  return norm(Math.atan2(y, x) / DEG);
}

export interface SiderealChart {
  ayanamsa: number;
  moon: number;
  sun: number;
  mars: number;
  mercury: number;
  jupiter: number;
  venus: number;
  saturn: number;
  rahu: number;
  ketu: number;
  lagna: number;
}

export function siderealChart(date: Date, latitude: number, longitude: number): SiderealChart {
  const ayan = lahiriAyanamsa(date);
  const sid = (tropical: number) => norm(tropical - ayan);
  const rahu = sid(meanNodeTropical(date));
  return {
    ayanamsa: ayan,
    moon: sid(tropicalBody(Body.Moon, date)),
    sun: sid(tropicalBody(Body.Sun, date)),
    mars: sid(tropicalBody(Body.Mars, date)),
    mercury: sid(tropicalBody(Body.Mercury, date)),
    jupiter: sid(tropicalBody(Body.Jupiter, date)),
    venus: sid(tropicalBody(Body.Venus, date)),
    saturn: sid(tropicalBody(Body.Saturn, date)),
    rahu,
    ketu: norm(rahu + 180),
    lagna: sid(tropicalAscendant(date, latitude, longitude)),
  };
}
