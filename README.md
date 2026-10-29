# Vinmeen · விண்மீன்

Vinmeen is a thirumana porutham app for Tamil families everywhere: India, Sri Lanka, Malaysia, Singapore, the Gulf, Europe, the UK, Canada, the United States, Australia, and anywhere else. **Porutham / பொருத்தம்** is the match itself. Nothing is stored on a server except hashed API keys.

The browser app calls a versioned API (`/api/v1`). Both ship as one Cloudflare Worker: the API is [Hono](https://hono.dev), and the pages are static assets from Vite.

## Run it locally

```bash
npm install
npm test
npm run build
npm run dev
```

- Web: [http://127.0.0.1:4321](http://127.0.0.1:4321)
- API and docs: [http://127.0.0.1:8787/api/v1/docs](http://127.0.0.1:8787/api/v1/docs)
- OpenAPI: [http://127.0.0.1:8787/api/v1/openapi.json](http://127.0.0.1:8787/api/v1/openapi.json)

The site calls `/api/v1` on the same host with no API key. Third-party apps still send `X-Api-Key`. Local wrangler dev also seeds `vnm_dev_local_key` until `ENVIRONMENT` is `production`.

On first API start, apply the local D1 migration once:

```bash
npm run migrate:local -w vinmeen-api
```

`wrangler dev` keeps a local SQLite database. The in-memory key store is what `npm test` uses, so tests do not need D1.

## How a family uses it

1. Leave **Tamil Nadu** selected, or pick another tradition. Approximate traditions are labelled in both languages.
2. For each person, either pick nakshatra, pada, and rasi, or enter date, time, and place.
3. Place search uses the Open-Meteo geocoder (any town worldwide) and falls back to a built-in city list. The IANA timezone on the place is applied with historical daylight-saving rules, including India's 1942–1945 wartime offset.
4. The result is a link you can send. It is also a text summary and a PNG card.

Birth details are turned into a **Lahiri** sidereal Moon. The ascendant, Mars, Venus, Jupiter, and the mean lunar node are used only for the dosha lines that need a chart (Chevvai, Mangal, Rahu).

## Traditions

| Id | What it is | Confidence |
| --- | --- | --- |
| `tamil-nadu` | Ten poruthams. Default. | Documented |
| `tamil-aroha` | Tamil Nadu, plus the aroha/avaroha Rajju exception | Documented exception |
| `kongu` | Same ten checks. Verdict wants 7/10 and a hard Rajju stop. The “seven porutham” subset is **not** published, so none are dropped. | Approximate |
| `sri-lankan-tamil` | Tamil Nadu ten plus Nadi (11). No nadi cancellation. Kiraga pavam is not calculated. | Documented addition |
| `brahmin` | Tamil Nadu ten, Nadi as essential, graded Chevvai, six-month dasa sandhi, Rahu in 7 or 8, optional gothra warning. Iyer and Iyengar practice is not one book. | Approximate |
| `chettiar` | Tamil Nadu ten, plus the nine Nagarathar kovils. No separate Chettiar porutham table was found. | Approximate for stars; kovil rule documented |
| `kerala` | Stree Deergha from count 7, neutral lords pass, Raman vedha (no Chitra triangle), and Rajju means the three nadis. Madhya–Madhya is the grave fault. Body rajju is shown beside the score. | Documented deltas |
| `ashtakoota` | North Indian Guna Milan out of 36, for mixed families. | Documented |

A full match scores 1 and a partial match scores ½, except Ashtakoota, which uses the classical 1–8 weights. Rajju and Vedhai (and Nadi, where that tradition says so) can set a reading aside even when the number looks fine. Tamil Nadu also treats a complete miss on Dinam, Ganam, Yoni, or Rasi as essential, following the Namma Calendar grade rule.

### Tamil Nadu rules used

Counts run from the bride to the groom, including both ends.

- **Dinam.** Favourable counts: 2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26. Same star: Rohini, Thiruvathirai, Magam, Hastham, Visakam, Thiruvonam, Uthirattathi, and Revathi may be shared (full). Bharani, Ayilyam, Swathi, Kettai, Moolam, Avittam, Sadayam, and Poorattathi may not. The other eleven stars are partial.
- **Ganam.** Same gana is full. Deva groom with Manushya bride is full; the reverse is partial. Rakshasa on one side only does not match.
- **Mahendram.** Counts 4, 7, 10, 13, 16, 19, 22, 25.
- **Stree Deergham.** Above 13 full, 8–13 partial, 7 or less none. Kerala lowers the partial line to 7 (VSKP: six and under is the low band; a count of 8 is madhyamam).
- **Yoni.** Only the seven enemy pairs fail: cow/tiger, elephant/lion, horse/buffalo, dog/deer, rat/cat, sheep/monkey, serpent/mongoose. Ashtakoota scores same animal 4, enemy 0, anything else 2. The finer 14×14 grades (3 and 1) are not used.
- **Rasi.** 7th is best, except Kadagam–Magaram and Simmam–Kumbam. 9, 10, 11 match. 3 and 5 are partial. 2, 4, 12 do not. 6 and 8 are shashtashtaka unless listed below. Same rasi matches when the groom's star (or pada) comes first.
- **6th exemptions.** Mesham→Kanni, Mithunam→Viruchigam, Thulam→Meenam, Dhanusu→Rishabam, Kumbam→Kadagam (Neerkondar’s anuhoola list), plus Rishabam→Thulam and Viruchigam→Mesham because those signs share a lord. The 8th matches only when the lord is the same (Mesham→Viruchigam, Thulam→Rishabam).
- **Rasi Adhipathi.** Same lord, mutual friends, or friend+neutral: full. Two neutrals, or friend+enemy: partial. Enemy+neutral, or two enemies: none. Kerala treats two neutrals as a full match.
- **Vasiyam.** Groom’s rasi on the bride’s list: full. Only the reverse: partial. A sign is not vasya to itself.
- **Rajju.** Five body groups. Same group fails. The aroha ruleset waives it when one star ascends and the other descends. Head stars are not waived. Kerala’s Rajju row is the three nadis instead.
- **Vedhai.** Twelve pairs, plus Mirugasirisham, Chithirai, and Avittam with one another in Tamil readings. Kerala / Raman omits that triangle, so Chithirai has no vedha partner.
- **Chevvai.** Whole-sign Mars in 1, 2, 4, 7, 8, or 12 from lagna, Moon, or Venus. Own sign (Mesham, Viruchigam), exaltation (Magaram), Guru’s signs, or conjunction with Guru cancels it. Both charts showing it is read as balanced. Kerala omits the 1st house. North Indian Mangal uses 1, 4, 7, 8, 12 from lagna and Moon only. The Brahmin note grades 7 or 8 from lagna or Moon as strong, and other hits as mild; Guru’s conjunction or 5/7/9 aspect reduces it. These lines are **not** added into the 10 or the 36.

Varna in Ashtakoota is a classical sign class (water signs highest, then fire, earth, air). It is not anyone’s community, and the app never asks for caste.

## Astronomy

- Moon and planets: [astronomy-engine](https://github.com/cosinekitty/astronomy) (pure JavaScript, no native ephemeris files).
- Ayanamsa: Lahiri, anchored at 23°51′25.53″ at J2000, IAU 2006 precession in longitude, plus the leading nutation terms. Against Swiss Ephemeris `SE_SIDM_LAHIRI` the fixture dates stay inside 30 arcseconds. A pada is 3°20′, so this does not move a nakshatra except within half an arcminute of a boundary.
- Time: Luxon and the IANA database through `Intl`. A spring-forward gap is rejected. A fall-back hour that happens twice uses the earlier offset and says so.
- Reference: 15 Aug 1990, 10:30, Asia/Kolkata, Chennai → Rohini, pada 3, Rishabam (sidereal Moon ≈ 48.93°).

Years outside 1800–2100 are rejected.

## API

Calculation routes accept either an issued `X-Api-Key` / `Authorization: Bearer`, or no key when the browser is calling this same host (`Sec-Fetch-Site: same-origin` and a matching `Origin`). Same-origin calls are limited to 60 a minute per IP. A copied `Origin` header is not a secret; the IP limit is what contains scripted use. Other websites cannot call without a key, because the browser sets `Sec-Fetch-Site: cross-site` and script cannot change it.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | no | Liveness |
| GET | `/api/v1/openapi.json` | no | OpenAPI 3 |
| GET | `/api/v1/docs` | no | Scalar docs plus a curl example |
| POST | `/api/v1/keys` | no | Issue a key. The token is returned once. |
| GET | `/api/v1/traditions?lang=en\|ta` | yes | Traditions |
| GET | `/api/v1/nakshatras?lang=` | yes | 27 stars |
| GET | `/api/v1/rasis?lang=` | yes | 12 rasis |
| GET | `/api/v1/kovils?lang=` | yes | Nine Nagarathar kovils |
| GET | `/api/v1/poruthams?tradition=&lang=` | yes | Check names for a tradition |
| GET | `/api/v1/places?q=` | yes | Place search |
| POST | `/api/v1/nakshatra?lang=` | yes | Moon nakshatra from birth details |
| POST | `/api/v1/match` | yes | Porutham for a pair |

Errors look like `{ "error": { "code", "message", "fields" } }`. Issued keys are limited to 60 requests a minute (600 for the local dev key). The same-origin site is limited to 60 a minute per IP. Counts live in memory or in D1. If the Worker has a rate-limiting binding, that limit is applied as well.

### curl

```bash
curl -s -H "X-Api-Key: vnm_dev_local_key" \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-08-15","time":"10:30","latitude":13.0827,"longitude":80.2707,"timezone":"Asia/Kolkata"}' \
  http://127.0.0.1:8787/api/v1/nakshatra
```

```bash
curl -s -H "Content-Type: application/json" \
  -d '{"name":"Family app","email":"dev@example.com"}' \
  http://127.0.0.1:8787/api/v1/keys
```

### JavaScript

```js
const key = "vnm_dev_local_key";
const report = await fetch("http://127.0.0.1:8787/api/v1/match", {
  method: "POST",
  headers: { "content-type": "application/json", "x-api-key": key },
  body: JSON.stringify({
    tradition: "tamil-nadu",
    lang: "ta",
    bride: { nakshatraId: "rohini", pada: 1, rasiId: "rishabha" },
    groom: { nakshatraId: "pushya", pada: 1, rasiId: "kataka" },
  }),
}).then((res) => res.json());
```

Keys are stored as SHA-256 hashes. `POST /api/v1/keys` is limited to 20 an hour per IP address.

## Deploy on Cloudflare Workers

This repo does not deploy itself. You need a Cloudflare account.

```bash
npx wrangler login
npx wrangler d1 create vinmeen
```

Paste the printed database id over `database_id` in `packages/api/wrangler.jsonc` (top level and `env.production`).

```bash
npm run migrate:remote -w vinmeen-api
npm run build
npm run deploy -w vinmeen-api
```

`npm run deploy` from the repo root builds the site and runs `wrangler deploy`. Use `--env production` when you want `ENVIRONMENT=production` (no seeded dev key). The Worker is named **vinmeen**. It serves `/api/*` and the Vite assets for everything else, at `https://vinmeen.rvigneshwaran1103.workers.dev`. `npm run dev` is the split local setup (Vite on 4321, Wrangler on 8787). The dev proxy is treated as first-party because both sides are loopback and `ENVIRONMENT` is not `production`.

Create these resources:

1. A Workers script named `vinmeen`, created by `wrangler deploy --env production`. The workers.dev URL is `https://vinmeen.rvigneshwaran1103.workers.dev`.
2. A D1 database named `vinmeen`, binding `DB`.
3. A rate limiting binding `RATE_LIMITER`, namespace id `1001`, 60 requests / 60 seconds. Wrangler creates it from `wrangler.jsonc`. The app still counts in D1 if the binding is absent.
4. Outbound fetch allowed to `geocoding-api.open-meteo.com` if your account restricts egress.

`env.production` sets `ENVIRONMENT` to `production`, so the dev key is not seeded. The public site does not embed an API key. Third-party apps issue their own with `POST /api/v1/keys`.

GitHub Actions: `.github/workflows/ci.yml` runs tests on push. `.github/workflows/deploy.yml` is manual (`workflow_dispatch`) and needs `CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID`. It does not run unless you start it.

## Project layout

- `packages/engine` — stars, rulesets, Lahiri Moon, time zones. No Cloudflare or DOM types.
- `packages/api` — Hono Worker, OpenAPI, key store (`MemoryKeyStore` and `D1KeyStore`).
- `packages/web` — Vite + React. Talks only to the API.

## Tests

```bash
npm test
```

Engine tests cover all ten Tamil poruthams, each ruleset’s documented difference, historical offsets (Kolkata 1943 vs 1950, New York 1965 summer and winter, London, Sydney, Singapore 1975, Dubai), and the Chennai Moon fixture. API tests cover auth, key issuance, validation, Tamil explanations, rate limiting, and place search when the geocoder is down.

## Sources

Star names follow common Tamil panchangam spelling (அஸ்வினி, பரணி, கார்த்திகை, மேஷம், ரிஷபம், …). English names are the usual Sanskrit-English forms, with the Tamil-English alias (Karthigai, Poosam, Avittam) on the star list.

- Udaya, “How the calculations work” and the Ashta Koota weights.
- Namma Calendar’s three rule sets (Tamil Nadu, Kongu, Sri Lankan Tamil) and the five essential poruthams.
- Neerkondar, Sashtashtaga Dosham (2015), for the directional 6th exemptions.
- AstroVed’s Tamil vasya list. B.V. Raman, *Muhurtha*, for bhakoot cancellation, stree deergha’s older “seven” line, and the twelve vedha pairs.
- Astroshastra / Muhurta notes for the same-nakshatra list and same-rasi order.
- Doosri Rai, “Kerala vs Tamil”, for VSKP stree deergha, neutral lords, Raman vedha, and Kerala’s use of “rajju” for nadi.
- Sahita’s vashya grid (whole-sign groups, checked against AstroSage).
- TRS Iyengar, “Star Matching”, for the Srivaishnava Chevvai severity note and nadi. The yoni table in that page disagrees with itself and is not used.
- Nagarathar Sangam of North America, for the nine kovils.
- Kongu community guides (itsmy.wedding, Matrimony Trust) for the 7-of-10 and hard Rajju practice. They are not a shastra edition.
- Swiss Ephemeris Lahiri values, used only as test fixtures, not as a runtime dependency.

## What this is not

Papa samyam, dasa sandhi outside the Brahmin (6 months) and Kerala (12 months) screens, kiraga pavam, and the Kongu seven-name subset are not invented to fill a gap. Sevvai remedies beyond the cancellations named above are left to the astrologer. The disclaimer on every result says the same thing.
