import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, appHref, isResultHref, parseShareHref, readShare, type Named, type Place, type Placement, type Report, type Tradition } from "./api";
import { planCard } from "./card";
import { copy, type Lang } from "./i18n";
import { EXAMPLE_PAIR, lineStatus, readingSummary, type StatusTone } from "./reading";
import { isWarningNote, reportText } from "./reportText";

const RASI_IDS = ["mesha", "rishabha", "mithuna", "kataka", "simha", "kanya", "tula", "vrischika", "dhanus", "makara", "kumbha", "meena"];

export interface PersonForm {
  mode: "star" | "birth";
  name: string;
  nakshatraId: string;
  pada: number;
  rasiId: string;
  date: string;
  time: string;
  query: string;
  place?: Place;
  gothra: string;
  kovil: string;
}

export const blank = (): PersonForm => ({
  mode: "star",
  name: "",
  nakshatraId: "",
  pada: 1,
  rasiId: "",
  date: "",
  time: "",
  query: "",
  gothra: "",
  kovil: "",
});

function initialLang(): Lang {
  const query = new URLSearchParams(window.location.search).get("lang");
  if (query === "en" || query === "ta") return query;
  return localStorage.getItem("vinmeen-lang") === "ta" ? "ta" : "en";
}

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [href, setHref] = useState(() => window.location.pathname + window.location.search);
  const t = copy[lang];

  useEffect(() => {
    localStorage.setItem("vinmeen-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const onPop = () => setHref(window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(url: string) {
    const next = appHref(url);
    window.history.pushState({}, "", next);
    setHref(next);
  }

  const share = parseShareHref(href);
  const result = !share && isResultHref(href);
  const search = window.location.search;
  const wide = Boolean(share || result);
  return (
    <div className={`mx-auto min-h-screen px-4 pb-10 pt-4 sm:px-6 ${wide ? "max-w-3xl lg:max-w-6xl" : "max-w-3xl"}`}>
      <Header lang={lang} setLang={setLang} t={t} go={go} />
      {share ? (
        <SharedResult token={share.kind === "token" ? share.token : ""} invalid={share.kind === "invalid"} lang={lang} setLang={setLang} t={t} go={go} />
      ) : result ? (
        <Result key={search} search={search} lang={lang} t={t} go={go} />
      ) : (
        <Home key={search} lang={lang} setLang={setLang} t={t} go={go} />
      )}
    </div>
  );
}

function Header({ lang, setLang, t, go }: { lang: Lang; setLang: (l: Lang) => void; t: (typeof copy)[Lang]; go: (url: string) => void }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <a href={appHref("/")} className="flex items-center gap-3 text-inherit no-underline" onClick={(e) => { e.preventDefault(); go("/"); }}>
        <Logo />
        <span>
          <span className="wordmark block text-3xl leading-none text-maroon">Vinmeen</span>
          <span className="wordmark mt-1 block text-sm text-maroon/80">விண்மீன்</span>
        </span>
      </a>
      <div className="flex rounded-full border border-line bg-white p-1 text-sm">
        {(["en", "ta"] as Lang[]).map((code) => (
          <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)} className={`rounded-full px-3 py-1.5 ${lang === code ? "bg-maroon text-cream" : "text-ink"}`}>
            {code === "en" ? "English" : "தமிழ்"}
          </button>
        ))}
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 512 512" className="h-14 w-14 shrink-0 drop-shadow-sm" aria-hidden="true">
      <rect width="512" height="512" rx="108" fill="#6E1F2C" />
      <circle cx="256" cy="256" r="176" fill="none" stroke="#E0B33A" strokeWidth="7" />
      <circle cx="256" cy="256" r="176" fill="none" stroke="#E0B33A" strokeWidth="8" strokeDasharray="3 38" strokeLinecap="round" />
      <circle cx="256" cy="256" r="118" fill="none" stroke="#E0B33A" strokeWidth="5" strokeDasharray="2 9" strokeLinecap="round" />
      <path d="M214 188 C250 230 292 214 330 176" fill="none" stroke="#E0B33A" strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round" />
      <polygon fill="#E8C04A" points="214.0,230.0 229.3,271.0 273.0,272.8 238.7,300.0 250.4,342.2 214.0,318.0 177.6,342.2 189.3,300.0 155.0,272.8 198.7,271.0" />
      <polygon fill="#E8C04A" points="318.0,176.0 327.4,201.1 354.1,202.3 333.2,218.9 340.3,244.7 318.0,230.0 295.7,244.7 302.8,218.9 281.9,202.3 308.6,201.1" />
    </svg>
  );
}

function Home({ lang, setLang, t, go }: { lang: Lang; setLang: (l: Lang) => void; t: (typeof copy)[Lang]; go: (url: string) => void }) {
  const [traditions, setTraditions] = useState<Tradition[]>([]);
  const [stars, setStars] = useState<Named[]>([]);
  const [rasis, setRasis] = useState<Named[]>([]);
  const [kovils, setKovils] = useState<Named[]>([]);
  const [seed] = useState(seedFromLocation);
  const [tradition, setTradition] = useState(seed.tradition);
  const [bride, setBride] = useState(seed.bride);
  const [groom, setGroom] = useState(seed.groom);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (seed.lang) setLang(seed.lang);
  }, [seed.lang, setLang]);

  useEffect(() => {
    let cancel = false;
    setBooting(true);
    Promise.all([
      api<{ traditions: Tradition[] }>(`/api/v1/traditions?lang=${lang}`),
      api<{ nakshatras: Named[] }>(`/api/v1/nakshatras?lang=${lang}`),
      api<{ rasis: Named[] }>(`/api/v1/rasis?lang=${lang}`),
      api<{ kovils: Named[] }>(`/api/v1/kovils?lang=${lang}`),
    ]).then(([tr, nk, rs, kv]) => {
      if (cancel) return;
      setTraditions(tr.traditions);
      setStars(nk.nakshatras);
      setRasis(rs.rasis);
      setKovils(kv.kovils);
      setError("");
    }).catch(() => {
      if (!cancel) setError(t.apiDown);
    }).finally(() => {
      if (!cancel) setBooting(false);
    });
    return () => { cancel = true; };
  }, [lang, t.apiDown]);

  const chosen = traditions.find((item) => item.id === tradition);
  const showGothra = tradition === "brahmin";
  const showKovil = tradition === "chettiar";

  function submit(nextBride = bride, nextGroom = groom, nextTradition = tradition) {
    const missing = [nextBride, nextGroom].some((person) => person.mode === "star" ? !person.nakshatraId || !person.rasiId : !person.date || !person.time || !person.place);
    if (missing) {
      setError(t.empty);
      return;
    }
    const params = new URLSearchParams({ tradition: nextTradition, lang });
    writePerson(params, "b", nextBride);
    writePerson(params, "g", nextGroom);
    go(`/result?${params.toString()}`);
  }

  function example() {
    const nextBride = { ...blank(), ...EXAMPLE_PAIR.bride, name: lang === "ta" ? "மணமகள்" : "Bride" };
    const nextGroom = { ...blank(), ...EXAMPLE_PAIR.groom, name: lang === "ta" ? "மணமகன்" : "Groom" };
    setTradition(EXAMPLE_PAIR.tradition);
    setBride(nextBride);
    setGroom(nextGroom);
    submit(nextBride, nextGroom, EXAMPLE_PAIR.tradition);
  }

  return (
    <main>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">{t.tagline}</p>
      <h1 className="wordmark mt-2 max-w-xl text-4xl leading-tight text-maroon sm:text-5xl">{t.hero}</h1>
      <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink/80">{t.lede}</p>

      <section className="mt-6 rounded-3xl border border-line bg-white/80 p-4 shadow-sm">
        <label className="text-sm font-semibold" htmlFor="tradition">{t.tradition}</label>
        <select id="tradition" className="mt-2 w-full rounded-2xl border border-line bg-cream px-3 py-3" value={tradition} onChange={(e) => setTradition(e.target.value)}>
          {traditions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.confidence === "approximate" ? (lang === "ta" ? " · தோராயம்" : " · approximate") : ""}</option>)}
        </select>
        {chosen && <p className="mt-3 text-sm leading-relaxed text-ink/80">{chosen.summary}</p>}
      </section>

      {booting && <p className="mt-6 text-sm">{t.loading}</p>}
      {error && <p className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay" role="alert">{error}</p>}

      <div className="mt-4 grid gap-4">
        <PersonCard title={t.bride} form={bride} setForm={setBride} stars={stars} rasis={rasis} kovils={kovils} t={t} lang={lang} showGothra={showGothra} showKovil={showKovil} />
        <PersonCard title={t.groom} form={groom} setForm={setGroom} stars={stars} rasis={rasis} kovils={kovils} t={t} lang={lang} showGothra={showGothra} showKovil={showKovil} />
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={example} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">{t.example}</button>
        <button type="button" onClick={() => submit()} className="flex-1 rounded-2xl bg-maroon px-4 py-3 font-semibold text-cream">{t.see}</button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink/60">{t.nothing}</p>
    </main>
  );
}

function PersonCard(props: {
  title: string;
  form: PersonForm;
  setForm: (f: PersonForm) => void;
  stars: Named[];
  rasis: Named[];
  kovils: Named[];
  t: (typeof copy)[Lang];
  lang: Lang;
  showGothra: boolean;
  showKovil: boolean;
}) {
  const { form, setForm, t, stars, rasis } = props;
  const [places, setPlaces] = useState<Place[]>([]);
  const [preview, setPreview] = useState<Placement | null>(null);
  const [previewError, setPreviewError] = useState("");

  function patch(partial: Partial<PersonForm>) {
    const next = { ...form, ...partial };
    if (partial.nakshatraId || partial.pada) {
      const star = stars.find((s) => s.id === (partial.nakshatraId ?? form.nakshatraId));
      if (star?.index) next.rasiId = RASI_IDS[Math.floor(((star.index - 1) * 800 + ((partial.pada ?? form.pada) - 1) * 200) / 1800) % 12];
    }
    setForm(next);
  }

  useEffect(() => {
    if (form.mode !== "birth" || form.query.trim().length < 2) {
      setPlaces([]);
      return;
    }
    const handle = setTimeout(() => {
      api<{ places: Place[] }>(`/api/v1/places?q=${encodeURIComponent(form.query)}`).then((res) => setPlaces(res.places)).catch(() => setPlaces([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [form.mode, form.query]);

  useEffect(() => {
    if (form.mode !== "birth" || !form.date || !form.time || !form.place) {
      setPreview(null);
      return;
    }
    const handle = setTimeout(() => {
      api<Placement>(`/api/v1/nakshatra?lang=${props.lang}`, {
        method: "POST",
        body: JSON.stringify({
          date: form.date,
          time: form.time,
          latitude: form.place!.latitude,
          longitude: form.place!.longitude,
          timezone: form.place!.timezone,
          placeName: form.place!.name,
        }),
      }).then((res) => {
        setPreview(res);
        setPreviewError("");
      }).catch((error: unknown) => {
        setPreview(null);
        setPreviewError(error instanceof ApiError ? error.message : "Could not compute the Moon.");
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [form.mode, form.date, form.time, form.place, props.lang]);

  async function pickChip(name: string) {
    const res = await api<{ places: Place[] }>(`/api/v1/places?q=${encodeURIComponent(name)}`);
    const place = res.places[0];
    if (place) setForm({ ...form, query: place.name, place });
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-4 shadow-sm">
      <h2 className="wordmark text-2xl text-maroon">{props.title}</h2>
      <label className="mt-3 block text-sm font-semibold">{t.name}
        <input className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <button type="button" className={`rounded-2xl px-3 py-3 ${form.mode === "star" ? "bg-maroon text-cream" : "bg-cream"}`} onClick={() => patch({ mode: "star" })}>{t.starMode}</button>
        <button type="button" className={`rounded-2xl px-3 py-3 ${form.mode === "birth" ? "bg-maroon text-cream" : "bg-cream"}`} onClick={() => patch({ mode: "birth" })}>{t.birthMode}</button>
      </div>
      {form.mode === "star" ? (
        <div className="mt-3 grid gap-3">
          <label className="text-sm font-semibold">{t.star}
            <select className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3" value={form.nakshatraId} onChange={(e) => patch({ nakshatraId: e.target.value })}>
              <option value="">—</option>
              {stars.map((star) => <option key={star.id} value={star.id}>{star.name}{star.nameLocalEn && props.lang === "en" ? ` · ${star.nameLocalEn}` : ""}</option>)}
            </select>
          </label>
          <div>
            <p className="text-sm font-semibold">{t.pada}</p>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((pada) => (
                <button key={pada} type="button" className={`rounded-2xl py-3 ${form.pada === pada ? "bg-gold text-maroon-deep" : "bg-cream"}`} onClick={() => patch({ pada })}>{pada}</button>
              ))}
            </div>
          </div>
          <label className="text-sm font-semibold">{t.rasi}
            <select className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3" value={form.rasiId} onChange={(e) => patch({ rasiId: e.target.value })}>
              <option value="">—</option>
              {rasis.map((rasi) => <option key={rasi.id} value={rasi.id}>{rasi.name}{rasi.western ? ` · ${rasi.western}` : ""}</option>)}
            </select>
            <span className="mt-1 block text-xs font-normal text-ink/60">{t.rasiHint}</span>
          </label>
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          <label className="text-sm font-semibold">{t.date}
            <input type="date" className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
          </label>
          <label className="text-sm font-semibold">{t.time}
            <input type="time" className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3" value={form.time} onChange={(e) => patch({ time: e.target.value })} />
          </label>
          <label className="text-sm font-semibold">{t.place}
            <input className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3" placeholder={t.placePh} value={form.query} onChange={(e) => patch({ query: e.target.value, place: undefined })} />
          </label>
          {places.length > 0 && !form.place && (
            <ul className="overflow-hidden rounded-2xl border border-line">
              {places.map((place) => (
                <li key={`${place.name}-${place.latitude}`}>
                  <button type="button" className="w-full px-3 py-3 text-left hover:bg-cream" onClick={() => setForm({ ...form, place, query: place.name })}>
                    <span className="block font-semibold">{place.name}</span>
                    <span className="text-xs text-ink/60">{[place.admin, place.country, place.timezone].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {t.chips.map((chip) => (
              <button key={chip} type="button" className="rounded-full bg-cream px-3 py-1.5 text-xs" onClick={() => pickChip(chip)}>{chip}</button>
            ))}
          </div>
          {form.place && <p className="text-xs text-ink/70">{form.place.timezone} · {form.place.latitude.toFixed(2)}, {form.place.longitude.toFixed(2)}</p>}
          {preview && <p className="rounded-2xl bg-gold/15 px-3 py-3 text-sm">{t.preview}: <strong>{preview.nakshatra.name}</strong>, {t.pada} {preview.pada}, {preview.rasi.name} · {preview.offset}</p>}
          {preview?.ambiguous && <p className="text-xs text-clay">{t.ambiguous}</p>}
          {previewError && <p className="text-sm text-clay">{previewError}</p>}
        </div>
      )}
      {props.showGothra && (
        <label className="mt-3 block text-sm font-semibold">{t.gothra}
          <input className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3" value={form.gothra} onChange={(e) => patch({ gothra: e.target.value })} />
        </label>
      )}
      {props.showKovil && (
        <label className="mt-3 block text-sm font-semibold">{t.kovil}
          <select className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3" value={form.kovil} onChange={(e) => patch({ kovil: e.target.value })}>
            <option value="">{t.kovilPh}</option>
            {props.kovils.map((kovil) => <option key={kovil.id} value={kovil.id}>{kovil.name}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}

export function writePerson(params: URLSearchParams, prefix: string, form: PersonForm) {
  params.set(`${prefix}Mode`, form.mode);
  if (form.name) params.set(`${prefix}Name`, form.name);
  if (form.gothra) params.set(`${prefix}Gothra`, form.gothra);
  if (form.kovil) params.set(`${prefix}Kovil`, form.kovil);
  if (form.mode === "birth" && form.place) {
    params.set(`${prefix}Date`, form.date);
    params.set(`${prefix}Time`, form.time);
    params.set(`${prefix}Lat`, String(form.place.latitude));
    params.set(`${prefix}Lon`, String(form.place.longitude));
    params.set(`${prefix}Tz`, form.place.timezone);
    params.set(`${prefix}Place`, form.place.name);
  } else {
    params.set(`${prefix}Nak`, form.nakshatraId);
    params.set(`${prefix}Pada`, String(form.pada));
    params.set(`${prefix}Rasi`, form.rasiId);
  }
}

function finiteCoord(raw: string | null): number {
  if (raw == null || raw.trim() === "") {
    throw new Error("Birth coordinates must be finite numbers.");
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error("Birth coordinates must be finite numbers.");
  }
  return value;
}

export function readPerson(params: URLSearchParams, prefix: string) {
  const mode = params.get(`${prefix}Mode`);
  const name = params.get(`${prefix}Name`) || undefined;
  const gothra = params.get(`${prefix}Gothra`) || undefined;
  const kovil = params.get(`${prefix}Kovil`) || undefined;
  if (mode === "birth" && params.get(`${prefix}Date`)) {
    return {
      name,
      gothra,
      kovil,
      birth: {
        date: params.get(`${prefix}Date`)!,
        time: params.get(`${prefix}Time`)!,
        latitude: finiteCoord(params.get(`${prefix}Lat`)),
        longitude: finiteCoord(params.get(`${prefix}Lon`)),
        timezone: params.get(`${prefix}Tz`)!,
        placeName: params.get(`${prefix}Place`) || undefined,
      },
    };
  }
  return {
    name,
    gothra,
    kovil,
    nakshatraId: params.get(`${prefix}Nak`) || undefined,
    pada: Number(params.get(`${prefix}Pada`) || 1),
    rasiId: params.get(`${prefix}Rasi`) || undefined,
  };
}

export function personFormFromQuery(params: URLSearchParams, prefix: string): PersonForm {
  const person = readPerson(params, prefix);
  if ("birth" in person && person.birth) {
    const placeName = person.birth.placeName ?? "";
    return {
      mode: "birth",
      name: person.name ?? "",
      nakshatraId: "",
      pada: 1,
      rasiId: "",
      date: person.birth.date,
      time: person.birth.time || "",
      query: placeName,
      place: {
        name: placeName,
        admin: "",
        country: "",
        latitude: person.birth.latitude,
        longitude: person.birth.longitude,
        timezone: person.birth.timezone,
        source: "link",
      },
      gothra: person.gothra ?? "",
      kovil: person.kovil ?? "",
    };
  }
  return {
    ...blank(),
    name: person.name ?? "",
    nakshatraId: person.nakshatraId ?? "",
    pada: person.pada,
    rasiId: person.rasiId ?? "",
    gothra: person.gothra ?? "",
    kovil: person.kovil ?? "",
  };
}

function formOrBlank(params: URLSearchParams, prefix: string): PersonForm {
  try {
    return personFormFromQuery(params, prefix);
  } catch {
    return blank();
  }
}

export function seedFromSearch(search: string): { tradition: string; lang?: Lang; bride: PersonForm; groom: PersonForm } {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const queryLang = params.get("lang");
  return {
    tradition: params.get("tradition") || "tamil-nadu",
    lang: queryLang === "en" || queryLang === "ta" ? queryLang : undefined,
    bride: formOrBlank(params, "b"),
    groom: formOrBlank(params, "g"),
  };
}

function seedFromLocation() {
  return seedFromSearch(window.location.search);
}

function Result({ search, lang, t, go }: { search: string; lang: Lang; t: (typeof copy)[Lang]; go: (url: string) => void }) {
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("lang", lang);
    const url = appHref(`/result?${next.toString()}`);
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState({}, "", url);
    }
    let bride: ReturnType<typeof readPerson>;
    let groom: ReturnType<typeof readPerson>;
    try {
      bride = readPerson(params, "b");
      groom = readPerson(params, "g");
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : t.apiDown);
      return;
    }
    setReport(null);
    setError("");
    setShareUrl("");
    setNote("");
    let cancel = false;
    api<Report>("/api/v1/match", {
      method: "POST",
      body: JSON.stringify({
        tradition: params.get("tradition") || "tamil-nadu",
        lang,
        bride,
        groom,
      }),
    }).then((report) => {
      if (!cancel) setReport(report);
    }).catch((err: unknown) => {
      if (!cancel) setError(err instanceof ApiError ? err.message : t.apiDown);
    });
    return () => { cancel = true; };
  }, [lang, params, t.apiDown]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setNote(t.copied);
  }
  async function shareOnce() {
    if (!report || sharing) return;
    setSharing(true);
    setNote("");
    try {
      const created = await api<{ token: string; expiresAt: string }>("/api/v1/shares", {
        method: "POST",
        body: JSON.stringify({ report: reportForShare(report) }),
      });
      const url = new URL(appHref(`/s/${created.token}`), window.location.href).href;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setNote(t.shareOnceCopied);
      } catch {
        setNote(t.shareOnceManual);
      }
    } catch (err: unknown) {
      setNote(err instanceof ApiError ? err.message : t.shareOnceFailed);
    } finally {
      setSharing(false);
    }
  }
  async function copyText() {
    if (!report) return;
    await navigator.clipboard.writeText(reportText(report, lang, window.location.href));
    setNote(t.textCopied);
  }
  async function saveCard() {
    if (!report) return;
    await saveReportCard(report, lang);
  }

  return (
    <main>
      <button type="button" className="text-sm text-maroon underline-offset-4 hover:underline" onClick={() => {
        const next = new URLSearchParams(params);
        next.set("lang", lang);
        go(`/?${next.toString()}`);
      }}>{t.back}</button>
      {error && <p className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-clay" role="alert">{error}</p>}
      {!report && !error && <p className="mt-6">{t.working}</p>}
      {report && (
        <>
          <Reading report={report} lang={lang} t={t} />
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="rounded-2xl bg-maroon px-4 py-3 text-sm font-semibold text-cream disabled:opacity-60" onClick={shareOnce} disabled={sharing}>{sharing ? t.shareOnceBusy : t.shareOnce}</button>
            <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm" onClick={copyLink}>{t.share}</button>
            <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm" onClick={copyText}>{t.text}</button>
            <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm" onClick={saveCard}>{t.image}</button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">{t.shareHint}</p>
          {note && <p className="mt-2 text-sm text-sage" role="status">{note}</p>}
          {shareUrl && (
            <label className="mt-3 block text-sm font-semibold">
              {t.shareOnce}
              <input readOnly className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-3 text-xs font-normal" value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
            </label>
          )}
          <p className="mt-6 text-sm leading-relaxed text-ink/70">{report.disclaimer}</p>
        </>
      )}
    </main>
  );
}

async function saveReportCard(report: Report, lang: Lang) {
  await document.fonts.ready;
  const measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return;
  const measure = (text: string, font: string) => {
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  };
  const plan = planCard(report, lang, measure);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = plan.background;
  ctx.fillRect(0, 0, plan.width, plan.height);
  for (const rect of plan.rects) {
    ctx.fillStyle = rect.color;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  for (const run of plan.runs) {
    ctx.font = run.font;
    ctx.fillStyle = run.color;
    ctx.fillText(run.text, run.x, run.y);
  }
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "vinmeen-porutham.png";
  link.click();
}

function SharedResult({
  token,
  invalid,
  lang,
  setLang,
  t,
  go,
}: {
  token: string;
  invalid: boolean;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (typeof copy)[Lang];
  go: (url: string) => void;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [gone, setGone] = useState(invalid);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const appliedLang = useRef(false);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!token || invalid) return;
    let cancel = false;
    const load = () => {
      if (cancel) return;
      readShare(token).then((body) => {
        if (cancel) return;
        setReport(body.report);
        setGone(false);
      }).catch((err: unknown) => {
        if (cancel) return;
        if (err instanceof ApiError && (err.status === 410 || err.status === 404)) setGone(true);
        else setError(err instanceof ApiError ? err.message : t.apiDown);
      });
    };
    const prerendering = "prerendering" in document && document.prerendering;
    if (prerendering) {
      const onShown = () => load();
      document.addEventListener("prerenderingchange", onShown, { once: true });
      return () => {
        cancel = true;
        document.removeEventListener("prerenderingchange", onShown);
      };
    }
    load();
    return () => { cancel = true; };
  }, [token, invalid, t.apiDown]);

  useEffect(() => {
    if (!report || appliedLang.current) return;
    if (report.lang === "en" || report.lang === "ta") {
      appliedLang.current = true;
      setLang(report.lang);
    }
  }, [report, setLang]);

  async function copyText() {
    if (!report) return;
    await navigator.clipboard.writeText(reportText(report, lang, window.location.href));
    setNote(t.textCopied);
  }
  async function saveCard() {
    if (!report) return;
    await saveReportCard(report, lang);
  }

  return (
    <main>
      <button type="button" className="text-sm text-maroon underline-offset-4 hover:underline" onClick={() => go("/")}>{t.shareBack}</button>
      {error && <p className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-clay" role="alert">{error}</p>}
      {gone && !report && (
        <>
          <h1 className="wordmark mt-6 text-4xl text-maroon">{t.shareGoneTitle}</h1>
          <p className="mt-3 max-w-xl text-lg leading-relaxed">{t.shareGone}</p>
        </>
      )}
      {!report && !error && !gone && <p className="mt-6">{t.working}</p>}
      {report && (
        <>
          <p className="mt-4 rounded-2xl bg-gold/20 px-4 py-3 text-sm leading-relaxed text-maroon" role="status">{t.shareUsed}</p>
          <Reading report={report} lang={lang} t={t} readOnlyLabel={t.shareReadOnly} />
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm" onClick={copyText}>{t.text}</button>
            <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm" onClick={saveCard}>{t.image}</button>
          </div>
          {note && <p className="mt-2 text-sm text-sage" role="status">{note}</p>}
          <p className="mt-6 text-sm leading-relaxed text-ink/70">{report.disclaimer}</p>
        </>
      )}
    </main>
  );
}

function Reading({ report, lang, t, readOnlyLabel }: { report: Report; lang: Lang; t: (typeof copy)[Lang]; readOnlyLabel?: string }) {
  const summary = readingSummary(report, lang);
  const decisionColor = report.verdict === "not-recommended" ? "text-clay" : "text-maroon";
  return (
    <div className="mt-4 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(16rem,28rem)_minmax(0,1fr)] lg:gap-10">
      <header className="min-w-0 lg:sticky lg:top-4">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">{lang === "ta" ? "பொருத்தம்" : "Porutham"} · {lang === "ta" ? report.tradition.ta : report.tradition.en}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {report.tradition.confidence === "approximate" && <p className="inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-maroon">{lang === "ta" ? "தோராயமான மரபு" : "Approximate tradition"}</p>}
          {readOnlyLabel && <p className="inline-block rounded-full bg-cream-deep px-3 py-1 text-xs font-semibold text-ink/70">{readOnlyLabel}</p>}
        </div>
        <h1 className={`wordmark mt-3 break-words text-[1.65rem] leading-tight sm:text-[2.15rem] ${decisionColor}`}>{summary.decision}</h1>
        <p className="mt-3 text-lg leading-relaxed">{summary.reason}</p>
        <ul className="mt-4 grid gap-1 text-sm">
          {summary.people.map((person) => (
            <li key={person.role}>
              <span className="font-semibold">{person.name}</span>
              <span className="text-ink/75"> · {person.star} · {person.rasi}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-ink/60">{summary.scoreLabel}</p>
        <p className="wordmark text-xl leading-none text-ink/70 sm:text-2xl">{report.score}<span className="text-base text-ink/45">/{report.maxScore}</span></p>
        {summary.outsideScore && <p className="mt-2 text-sm leading-relaxed text-ink/80">{summary.outsideScore}</p>}
      </header>
      <div className="min-w-0">
        {summary.settingAside.length > 0 && (
          <section>
            <h2 className="wordmark text-2xl text-maroon">{t.setsAside}</h2>
            <ul className="mt-3 grid gap-2">
              {summary.settingAside.map((dosha) => {
                const status = lineStatus(dosha.level, true, lang);
                return (
                  <li key={dosha.id} className="rounded-2xl border border-clay/40 bg-white px-3 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className="min-w-0 break-words font-semibold">{dosha.name}</h3>
                      <span className={`ml-auto shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${toneClass(status.tone)}`}>{status.label}</span>
                    </div>
                    <p className="mt-1">
                      <span className="inline-block whitespace-nowrap rounded-full bg-clay/10 px-2.5 py-0.5 text-xs font-semibold text-clay">{t.critical}</span>
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">{dosha.explanation}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <ul className={`grid gap-2 ${summary.settingAside.length > 0 ? "mt-4" : ""}`}>
          {report.checks.map((check) => (
            <StatusRow
              key={check.id}
              id={check.id}
              name={check.name}
              level={check.level}
              critical={check.critical}
              points={check.points}
              maxPoints={check.maxPoints}
              meaning={check.meaning}
              explanation={check.explanation}
              lang={lang}
              t={t}
            />
          ))}
        </ul>
        {summary.otherDoshas.length > 0 && (
          <section className="mt-6">
            <h2 className="wordmark text-2xl text-maroon">{t.dosha}</h2>
            <ul className="mt-3 grid gap-2">
              {summary.otherDoshas.map((dosha) => (
                <StatusRow
                  key={dosha.id}
                  id={dosha.id}
                  name={dosha.name}
                  level={dosha.level}
                  critical={false}
                  points={0}
                  maxPoints={0}
                  explanation={dosha.explanation}
                  lang={lang}
                  t={t}
                />
              ))}
            </ul>
          </section>
        )}
        {report.notes.length > 0 && (
          <section className="mt-6">
            <h2 className="wordmark text-2xl text-maroon">{t.notes}</h2>
            <ul className="mt-3 grid gap-2">
              {report.notes.map((line, index) => (
                <li key={`${index}-${line.slice(0, 48)}`} className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isWarningNote(line) ? "bg-gold/20" : "bg-white text-ink/80"}`}>{line}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  id,
  name,
  level,
  critical,
  points,
  maxPoints,
  meaning,
  explanation,
  lang,
  t,
}: {
  id: string;
  name: string;
  level: string;
  critical: boolean;
  points: number;
  maxPoints: number;
  meaning?: string;
  explanation: string;
  lang: Lang;
  t: (typeof copy)[Lang];
}) {
  const [open, setOpen] = useState(false);
  const status = lineStatus(level, critical, lang);
  const panelId = `detail-${id}`;
  return (
    <li className="rounded-2xl border border-line bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="min-w-0 break-words font-semibold">{name}</h3>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${toneClass(status.tone)}`}>{status.label}</span>
          {maxPoints > 0 && <span className="whitespace-nowrap text-xs text-ink/50">{points}/{maxPoints}</span>}
        </div>
      </div>
      {status.criticalLabel && (
        <p className="mt-1">
          <span className="inline-block whitespace-nowrap rounded-full bg-clay/10 px-2.5 py-0.5 text-xs font-semibold text-clay">{status.criticalLabel}</span>
        </p>
      )}
      {status.asideNote && <p className="mt-1 text-xs text-ink/70">{status.asideNote}</p>}
      <button
        type="button"
        className="mt-1 text-sm font-semibold text-maroon underline-offset-4 hover:underline"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t.hideWhyName.replaceAll("{name}", name) : t.whyName.replaceAll("{name}", name)}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? t.hideWhy : t.why}
      </button>
      <div id={panelId} hidden={!open} className="mt-2 border-t border-line pt-2">
        {meaning && <p className="text-sm text-ink/60">{meaning}</p>}
        <p className={`text-sm leading-relaxed ${meaning ? "mt-1" : ""}`}>{explanation}</p>
      </div>
    </li>
  );
}

function reportForShare(report: Report): Report {
  const copy = structuredClone(report) as Report & {
    bride: { moonLongitude?: unknown };
    groom: { moonLongitude?: unknown };
  };
  delete copy.bride.birth;
  delete copy.groom.birth;
  delete copy.bride.moonLongitude;
  delete copy.groom.moonLongitude;
  return copy;
}

function toneClass(tone: StatusTone): string {
  if (tone === "match") return "bg-sage/10 text-sage";
  if (tone === "partial") return "bg-gold/20 text-maroon";
  if (tone === "veto") return "bg-clay/10 text-clay";
  if (tone === "neutral") return "bg-ink/10 text-ink";
  return "bg-cream-deep text-ink/70";
}

