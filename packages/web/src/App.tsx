import { useEffect, useMemo, useState } from "react";
import { ApiError, api, apiUrl, appHref, isResultHref, type Named, type Place, type Placement, type Report, type Tradition } from "./api";
import { copy, levelLabel, type Lang } from "./i18n";

const RASI_IDS = ["mesha", "rishabha", "mithuna", "kataka", "simha", "kanya", "tula", "vrischika", "dhanus", "makara", "kumbha", "meena"];

interface PersonForm {
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

const blank = (): PersonForm => ({
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

export function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("vinmeen-lang") === "ta" ? "ta" : "en"));
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

  const result = isResultHref(href);
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-10 pt-4 sm:px-6">
      <Header lang={lang} setLang={setLang} t={t} go={go} />
      {result ? <Result lang={lang} t={t} go={go} /> : <Home lang={lang} t={t} go={go} />}
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
      <div className="flex items-center gap-2">
        <a className="hidden text-sm text-maroon underline-offset-4 hover:underline sm:inline" href={apiUrl("/api/v1/docs")}>{t.docs}</a>
        <div className="flex rounded-full border border-line bg-white p-1 text-sm">
          {(["en", "ta"] as Lang[]).map((code) => (
            <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)} className={`rounded-full px-3 py-1.5 ${lang === code ? "bg-maroon text-cream" : "text-ink"}`}>
              {code === "en" ? "English" : "தமிழ்"}
            </button>
          ))}
        </div>
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

function Home({ lang, t, go }: { lang: Lang; t: (typeof copy)[Lang]; go: (url: string) => void }) {
  const [traditions, setTraditions] = useState<Tradition[]>([]);
  const [stars, setStars] = useState<Named[]>([]);
  const [rasis, setRasis] = useState<Named[]>([]);
  const [kovils, setKovils] = useState<Named[]>([]);
  const [tradition, setTradition] = useState("tamil-nadu");
  const [bride, setBride] = useState<PersonForm>(blank);
  const [groom, setGroom] = useState<PersonForm>(blank);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);

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
    const nextBride = { ...blank(), nakshatraId: "rohini", pada: 1, rasiId: "rishabha", name: lang === "ta" ? "மணமகள்" : "Bride" };
    const nextGroom = { ...blank(), nakshatraId: "pushya", pada: 1, rasiId: "kataka", name: lang === "ta" ? "மணமகன்" : "Groom" };
    setTradition("tamil-nadu");
    setBride(nextBride);
    setGroom(nextGroom);
    submit(nextBride, nextGroom, "tamil-nadu");
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

function writePerson(params: URLSearchParams, prefix: string, form: PersonForm) {
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

function readPerson(params: URLSearchParams, prefix: string) {
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
        latitude: Number(params.get(`${prefix}Lat`)),
        longitude: Number(params.get(`${prefix}Lon`)),
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

function Result({ lang, t, go }: { lang: Lang; t: (typeof copy)[Lang]; go: (url: string) => void }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("lang", lang);
    const url = appHref(`/result?${next.toString()}`);
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState({}, "", url);
    }
    setReport(null);
    setError("");
    api<Report>("/api/v1/match", {
      method: "POST",
      body: JSON.stringify({
        tradition: params.get("tradition") || "tamil-nadu",
        lang,
        bride: readPerson(params, "b"),
        groom: readPerson(params, "g"),
      }),
    }).then(setReport).catch((err: unknown) => setError(err instanceof ApiError ? err.message : t.apiDown));
  }, [lang, params, t.apiDown]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setNote(t.copied);
  }
  async function copyText() {
    if (!report) return;
    await navigator.clipboard.writeText(reportText(report, lang));
    setNote(t.textCopied);
  }
  async function saveCard() {
    if (!report) return;
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FBF6EE";
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = "#6E1F2C";
    ctx.font = "600 72px Fraunces, 'Noto Serif Tamil', serif";
    ctx.fillText("Vinmeen", 72, 120);
    ctx.font = "600 36px 'Noto Serif Tamil', serif";
    ctx.fillText("விண்மீன்", 72, 170);
    ctx.fillStyle = "#C8962E";
    ctx.fillRect(72, 196, 160, 6);
    ctx.fillStyle = "#2A1614";
    ctx.font = "600 42px 'Source Sans 3', 'Noto Sans Tamil', sans-serif";
    ctx.fillText(lang === "ta" ? report.tradition.ta : report.tradition.en, 72, 270);
    ctx.font = "600 92px Fraunces, 'Noto Serif Tamil', serif";
    ctx.fillStyle = "#6E1F2C";
    ctx.fillText(`${report.score}/${report.maxScore}`, 72, 390);
    ctx.font = "400 32px 'Source Sans 3', 'Noto Sans Tamil', sans-serif";
    ctx.fillStyle = "#2A1614";
    wrap(ctx, report.verdictText, 72, 450, 936, 40);
    let y = 620;
    ctx.font = "600 28px 'Source Sans 3', 'Noto Sans Tamil', sans-serif";
    for (const check of report.checks) {
      ctx.fillStyle = check.level === "match" ? "#1E6B45" : check.level === "partial" ? "#8A5A12" : "#8C3A3A";
      ctx.fillText(`${check.name}  ${levelLabel(lang, check.level)}`, 72, y);
      y += 48;
      if (y > 1220) break;
    }
    ctx.fillStyle = "#6E1F2C";
    ctx.font = "400 24px 'Source Sans 3', 'Noto Sans Tamil', sans-serif";
    ctx.fillText(lang === "ta" ? "பொருத்தம் · Vinmeen" : "Porutham · Vinmeen", 72, 1300);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "vinmeen-porutham.png";
    link.click();
  }

  return (
    <main>
      <button type="button" className="text-sm text-maroon underline-offset-4 hover:underline" onClick={() => go("/")}>{t.back}</button>
      {error && <p className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-clay" role="alert">{error}</p>}
      {!report && !error && <p className="mt-6">{t.working}</p>}
      {report && (
        <>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-gold">{lang === "ta" ? "பொருத்தம்" : "Porutham"} · {lang === "ta" ? report.tradition.ta : report.tradition.en}</p>
          {report.tradition.confidence === "approximate" && <p className="mt-2 inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-maroon">{lang === "ta" ? "தோராயமான மரபு" : "Approximate tradition"}</p>}
          <h1 className="wordmark mt-3 text-6xl text-maroon">{report.score}<span className="text-3xl text-ink/50">/{report.maxScore}</span></h1>
          <p className="mt-3 text-lg leading-relaxed">{report.verdictText}</p>
          <p className="mt-2 text-sm text-ink/70">{pairLine(report, lang)}</p>
          <ul className="mt-6 grid gap-3">
            {report.checks.map((check) => (
              <li key={check.id} className="rounded-3xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{check.name}</h2>
                    <p className="text-sm text-ink/60">{check.meaning}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${tone(check.level)}`}>{levelLabel(lang, check.level)}{check.critical ? ` · ${t.critical}` : ""}</span>
                </div>
                <p className="mt-2 leading-relaxed">{check.explanation}</p>
                {check.maxPoints > 0 && <p className="mt-2 text-xs text-ink/50">{check.points}/{check.maxPoints}</p>}
              </li>
            ))}
          </ul>
          {report.doshas.length > 0 && (
            <section className="mt-6">
              <h2 className="wordmark text-2xl text-maroon">{t.dosha}</h2>
              <ul className="mt-3 grid gap-3">
                {report.doshas.map((dosha) => (
                  <li key={dosha.id} className="rounded-3xl border border-dashed border-gold bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{dosha.name}</h3>
                      <span className={`rounded-full px-3 py-1 text-sm ${tone(dosha.level)}`}>{levelLabel(lang, dosha.level)}</span>
                    </div>
                    <p className="mt-2 leading-relaxed">{dosha.explanation}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="rounded-2xl bg-maroon px-4 py-3 text-sm font-semibold text-cream" onClick={copyLink}>{t.share}</button>
            <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm" onClick={copyText}>{t.text}</button>
            <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm" onClick={saveCard}>{t.image}</button>
          </div>
          {note && <p className="mt-2 text-sm text-sage">{note}</p>}
          <p className="mt-6 text-sm leading-relaxed text-ink/70">{report.disclaimer}</p>
        </>
      )}
    </main>
  );
}

function tone(level: string) {
  if (level === "match") return "bg-sage/10 text-sage";
  if (level === "partial") return "bg-gold/20 text-maroon";
  if (level === "unavailable") return "bg-cream-deep text-ink/70";
  return "bg-clay/10 text-clay";
}

function pairLine(report: Report, lang: Lang) {
  const side = (person: Report["bride"]) => {
    const star = lang === "ta" ? person.nakshatra.ta : person.nakshatra.en;
    const rasi = lang === "ta" ? person.rasi.ta : person.rasi.en;
    return `${person.name ? `${person.name} · ` : ""}${star}, ${person.pada}, ${rasi}`;
  };
  return `${side(report.bride)}  ·  ${side(report.groom)}`;
}

function reportText(report: Report, lang: Lang) {
  const lines = [
    `Vinmeen · விண்மீன்`,
    lang === "ta" ? report.tradition.ta : report.tradition.en,
    `${report.score}/${report.maxScore}`,
    report.verdictText,
    pairLine(report, lang),
    ...report.checks.map((c) => `${c.name}: ${levelLabel(lang, c.level)}`),
    report.disclaimer,
    window.location.href,
  ];
  return lines.join("\n");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, line: number) {
  const words = text.split(" ");
  let row = "";
  let yy = y;
  for (const word of words) {
    const trial = row ? `${row} ${word}` : word;
    if (ctx.measureText(trial).width > width) {
      ctx.fillText(row, x, yy);
      row = word;
      yy += line;
    } else row = trial;
  }
  if (row) ctx.fillText(row, x, yy);
}
