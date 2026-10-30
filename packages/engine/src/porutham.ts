import {
  animalsEnemy,
  DASHA_LORDS,
  inclusiveCount,
  kovilById,
  NAKSHATRAS,
  nakshatraById,
  pairKey,
  placementFromLongitude,
  RASIS,
  rasiById,
  rasiIndexForPada,
  relation,
  TAMIL_VASYA,
  VARNA_RANK,
  VASHYA_POINTS,
  VEDHA_HEAD,
  VEDHA_PAIRS,
  type Gana,
  type Lang,
  type Nadi,
  type Planet,
  type RasiId,
  type YoniAnimal,
} from "./data.js";
import {
  InputError,
  localToUtc,
  siderealChart,
  type SiderealChart,
} from "./astro.js";
import { explainCheck, explainDosha, verdictText, type Level } from "./explain.js";

export interface BirthInput {
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string;
}

export interface PersonInput {
  name?: string;
  nakshatraId?: string;
  pada?: number;
  rasiId?: string;
  birth?: BirthInput;
  gothra?: string;
  kovil?: string;
}

export interface ResolvedPerson {
  name?: string;
  nakshatraId: string;
  pada: 1 | 2 | 3 | 4;
  rasiId: RasiId;
  moonLongitude?: number;
  chart?: SiderealChart;
  birth?: {
    instant: string;
    offset: string;
    timezone: string;
    placeName?: string;
    ambiguous: boolean;
    latitude: number;
    longitude: number;
  };
  gothra?: string;
  kovil?: string;
  source: "birth" | "star";
  warnings: Warning[];
}

export interface Warning {
  code: string;
  en: string;
  ta: string;
}

export interface SourceNote {
  title: string;
  note: string;
}

export interface TraditionInfo {
  id: string;
  en: string;
  ta: string;
  confidence: "documented" | "approximate";
  summary: { en: string; ta: string };
  sources: SourceNote[];
  scoreUnit: "porutham" | "guna";
  maxScore: number;
}

interface Draft {
  id: string;
  points: number;
  maxPoints: number;
  level: Level;
  critical: boolean;
  reason: { code: string; params: Record<string, string | number> };
}

interface Rules {
  id: string;
  info: TraditionInfo;
  dinaFavourable: number[];
  sameStarUttama: string[];
  sameStarAdhama: string[];
  streeFullAbove: number;
  streePartialFrom: number;
  sixthExemptions: [RasiId, RasiId][];
  eighthSameLord: boolean;
  seventhExceptions: [RasiId, RasiId][];
  neutralLordsPass: boolean;
  vedhaHead: boolean;
  rajjuMode: "body" | "kerala-nadi";
  rajjuArohaCancels: boolean;
  nadiMode: "off" | "binary" | "ashtakoota";
  nadiCritical: boolean;
  fiveKeyVeto: boolean;
  vetoIds: string[];
  excellentMin: number;
  goodMin: number;
  borderlineMin: number;
  system: "porutham" | "guna";
  chevvai: ChevvaiRules | null;
  mangal: ChevvaiRules | null;
  dasaMonths: number | null;
  rahu: boolean;
  gothra: boolean;
  kovil: boolean;
  showBodyRajju: boolean;
}

interface ChevvaiRules {
  id: "chevvai" | "mangal";
  houses: number[];
  refs: ("lagna" | "moon" | "venus")[];
  bothCancel: boolean;
  ownSignCancels: boolean;
  exaltedCancels: boolean;
  debilitatedCancels: boolean;
  jupiterSignCancels: boolean;
  jupiterConjunctionCancels: boolean;
  jupiterAspectReduces: boolean;
  severity: boolean;
}

const SAME_UTTAMA = ["rohini", "ardra", "magha", "hasta", "vishakha", "shravana", "uttara-bhadrapada", "revati"];
const SAME_ADHAMA = ["bharani", "ashlesha", "swati", "jyeshtha", "moola", "dhanishta", "shatabhisha", "purva-bhadrapada"];
const DINA_OK = [2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26];
const FIVE_KEY = ["dina", "gana", "yoni", "rasi", "rajju"];
const SIXTH: [RasiId, RasiId][] = [
  ["mesha", "kanya"],
  ["mithuna", "vrischika"],
  ["tula", "meena"],
  ["dhanus", "rishabha"],
  ["kumbha", "kataka"],
  ["rishabha", "tula"],
  ["vrischika", "mesha"],
];

const TAMIL_CHEVVAI: ChevvaiRules = {
  id: "chevvai",
  houses: [1, 2, 4, 7, 8, 12],
  refs: ["lagna", "moon", "venus"],
  bothCancel: true,
  ownSignCancels: true,
  exaltedCancels: true,
  debilitatedCancels: false,
  jupiterSignCancels: true,
  jupiterConjunctionCancels: true,
  jupiterAspectReduces: false,
  severity: false,
};

const KERALA_CHEVVAI: ChevvaiRules = {
  ...TAMIL_CHEVVAI,
  houses: [2, 4, 7, 8, 12],
};

const BRAHMIN_CHEVVAI: ChevvaiRules = {
  ...TAMIL_CHEVVAI,
  debilitatedCancels: true,
  jupiterAspectReduces: true,
  jupiterSignCancels: false,
  severity: true,
};

const MANGAL: ChevvaiRules = {
  id: "mangal",
  houses: [1, 4, 7, 8, 12],
  refs: ["lagna", "moon"],
  bothCancel: true,
  ownSignCancels: true,
  exaltedCancels: true,
  debilitatedCancels: false,
  jupiterSignCancels: false,
  jupiterConjunctionCancels: true,
  jupiterAspectReduces: false,
  severity: false,
};

function tamilBase(over: Partial<Rules> & Pick<Rules, "id" | "info">): Rules {
  return {
    dinaFavourable: DINA_OK,
    sameStarUttama: SAME_UTTAMA,
    sameStarAdhama: SAME_ADHAMA,
    streeFullAbove: 13,
    streePartialFrom: 8,
    sixthExemptions: SIXTH,
    eighthSameLord: true,
    seventhExceptions: [
      ["kataka", "makara"],
      ["simha", "kumbha"],
    ],
    neutralLordsPass: false,
    vedhaHead: true,
    rajjuMode: "body",
    rajjuArohaCancels: false,
    nadiMode: "off",
    nadiCritical: false,
    fiveKeyVeto: true,
    vetoIds: ["rajju", "vedha"],
    excellentMin: 8,
    goodMin: 6,
    borderlineMin: 5,
    system: "porutham",
    chevvai: TAMIL_CHEVVAI,
    mangal: null,
    dasaMonths: null,
    rahu: false,
    gothra: false,
    kovil: false,
    showBodyRajju: false,
    ...over,
  };
}

const TRADITION_RULES: Rules[] = [
  tamilBase({
    id: "tamil-nadu",
    info: {
      id: "tamil-nadu",
      en: "Tamil Nadu",
      ta: "தமிழ்நாடு",
      confidence: "documented",
      scoreUnit: "porutham",
      maxScore: 10,
      summary: {
        en: "The ten poruthams most Tamil Nadu families ask for. Rajju and Vedhai can set the reading aside, and so can a complete miss on Dinam, Ganam, Yoni, or Rasi. A full match scores 1 and a partial match scores ½.",
        ta: "தமிழ்நாட்டுக் குடும்பங்கள் கேட்கும் பத்துப் பொருத்தம். ரஜ்ஜு, வேதை தவறினால், அல்லது தினம், கணம், யோனி, ராசி முற்றிலும் பொருந்தாவிட்டால், இந்த மரபு பொருத்தத்தை ஒதுக்கும். முழுப் பொருத்தம் 1, பாதிப் பொருத்தம் ½.",
      },
      sources: [
        { title: "Namma Calendar porutham notes", note: "Five key poruthams (Dinam, Ganam, Yoni, Rasi, Rajju) and the 8 / 6 grade bands." },
        { title: "Udaya, How the calculations work", note: "Dina count list, gana asymmetry, stree deergha 13/8, yoni enemies, rasi bands, vasya direction, vedha head triangle." },
        { title: "Neerkondar, Sashtashtaga Dosham (2015)", note: "Five directional anuhoola 6th pairs. Same-lord 6th pairs are included from the widespread Tamil reading." },
        { title: "AstroVed vasya table", note: "Bride-to-groom vasya list." },
        { title: "Muhurta tradition via Astroshastra", note: "Same-nakshatra uttama list, and same-rasi order with the groom earlier in the zodiac." },
      ],
    },
  }),
  tamilBase({
    id: "tamil-aroha",
    rajjuArohaCancels: true,
    info: {
      id: "tamil-aroha",
      en: "Tamil Nadu — Rajju aroha exception",
      ta: "தமிழ்நாடு — ரஜ்ஜு ஆரோகண விதிவிலக்கு",
      confidence: "documented",
      scoreUnit: "porutham",
      maxScore: 10,
      summary: {
        en: "Same ten poruthams as Tamil Nadu, with one published exception: same rajju is set aside when one star is ascending (arohana) and the other is descending (avarohana). Head stars are not given that exception.",
        ta: "தமிழ்நாட்டுப் பத்துப் பொருத்தமே. ஒரே ரஜ்ஜுவில் ஒரு நட்சத்திரம் ஆரோகணம், மற்றது அவரோகணம் என்றால் அந்தத் தோஷம் விலக்கப்படும். தலை ரஜ்ஜுவுக்கு இந்த விலக்கு இல்லை.",
      },
      sources: [
        { title: "Jathaka Alankara, as cited in Tamil rajju discussions", note: "Aroha rajju with avaroha rajju is treated as acceptable." },
        { title: "Dinesh Cheram, Rajju matching", note: "Lists the ascending/descending exception beside same-rasi and same-lord exceptions. Only the aroha exception is switched on here." },
      ],
    },
  }),
  tamilBase({
    id: "kongu",
    fiveKeyVeto: false,
    excellentMin: 8,
    goodMin: 7,
    borderlineMin: 6,
    info: {
      id: "kongu",
      en: "Kongu",
      ta: "கொங்கு",
      confidence: "approximate",
      scoreUnit: "porutham",
      maxScore: 10,
      summary: {
        en: "Approximate. Kongu guides treat Rajju as a hard stop and often ask for at least 7 matches. Namma Calendar describes a seven-porutham Kongu reading but does not publish which seven, so all ten are still shown and the verdict uses 7 of 10.",
        ta: "தோராயம். கொங்கு வழிகாட்டிகள் ரஜ்ஜுவை கட்டாயமாகப் பார்க்கிறார்கள்; குறைந்தது 7 பொருத்தம் கேட்பது உண்டு. ஏழு பொருத்தம் எவை என்று வெளியிடப்பட்ட பட்டியல் இல்லை, அதனால் பத்தும் காட்டப்படுகிறது. தீர்ப்பு 10-ல் 7.",
      },
      sources: [
        { title: "itsmy.wedding, Kongu Gounder wedding guide", note: "Ten-element porutham, minimum 7 of 10, Rajju non-negotiable. A community guide, not a shastra edition." },
        { title: "Matrimony Trust, Rajju guide for Gounder families", note: "Rajju and Vedha treated as the checks families look at first." },
        { title: "Namma Calendar", note: "Names a seven-porutham Kongu ruleset and a 6-of-7 uthamam band, without listing the seven." },
      ],
    },
  }),
  tamilBase({
    id: "sri-lankan-tamil",
    nadiMode: "binary",
    info: {
      id: "sri-lankan-tamil",
      en: "Sri Lankan Tamil",
      ta: "ஈழத் தமிழ்",
      confidence: "documented",
      scoreUnit: "porutham",
      maxScore: 11,
      summary: {
        en: "The Tamil Nadu ten, plus Nadi, the eleventh check Namma Calendar assigns to the Sri Lankan Tamil reading. Same nadi does not match. No nadi-cancellation rules are applied, because that reading does not publish them. Kiraga pavam is not calculated.",
        ta: "தமிழ்நாட்டுப் பத்துடன் நாடி சேர்ந்த பதினொன்று. நம்ம கேலண்டர் ஈழத் தமிழ் வாசிப்பில் நாடியை எண்ணுகிறது. ஒரே நாடி பொருந்தாது. நாடி விலக்கு விதிகள் அந்த வாசிப்பில் வெளியிடப்படவில்லை, அதனால் இங்கும் இல்லை. கிரக பாவம் கணக்கிடப்படவில்லை.",
      },
      sources: [
        { title: "Namma Calendar, three rule sets", note: "Sri Lankan Tamil counts Nadi, eleven poruthams, eight of eleven for uthamam." },
        { title: "Sri Lanka Tamil Matrimony note on kiraga pavam", note: "Kiraga pavam is disputed even inside Sri Lankan Tamil practice, so it is left out." },
      ],
    },
  }),
  tamilBase({
    id: "brahmin",
    nadiMode: "binary",
    nadiCritical: true,
    vetoIds: ["rajju", "vedha", "nadi"],
    chevvai: BRAHMIN_CHEVVAI,
    dasaMonths: 6,
    rahu: true,
    gothra: true,
    info: {
      id: "brahmin",
      en: "Tamil Brahmin (Iyer / Iyengar)",
      ta: "தமிழ் பிராமணர் (ஐயர் / ஐயங்கார்)",
      confidence: "approximate",
      scoreUnit: "porutham",
      maxScore: 11,
      summary: {
        en: "Approximate composite. The Tamil Nadu ten, plus Nadi as an essential check, Chevvai graded by house the way a Srivaishnava matching note describes it, a six-month dasa sandhi screen, Rahu in the 7th or 8th, and an optional same-gothra warning. Iyer and Iyengar practice is not one book.",
        ta: "தோராயக் கூட்டு. தமிழ்நாட்டுப் பத்து, கட்டாய நாடி, ஸ்ரீவைஷ்ணவக் குறிப்பில் உள்ள செவ்வாய் அளவு, ஆறு மாத தசா சந்தி, 7 அல்லது 8-ல் ராகு, மற்றும் விருப்பத்திற்கு ஒரே கோத்திர எச்சரிக்கை. ஐயர், ஐயங்கார் மரபு ஒரே புத்தகம் அல்ல.",
      },
      sources: [
        { title: "TRS Iyengar, Star Matching (Srivaishnavam Practices)", note: "Nadi must differ. Chevvai in 7 or 8 from lagna or Moon is strong; from Venus, or in 2, 4, 12, is milder. Severity should match. Guru's presence reduces it. Same gothra is avoided in the north-Indian section of the same note; Tamil brahmin families share that rule." },
        { title: "Tamilsonline jathaka porutham overview", note: "Names Nadi, Gana, and Rajju among the essential Tamil checks. Not a caste-specific table." },
      ],
    },
  }),
  tamilBase({
    id: "chettiar",
    kovil: true,
    info: {
      id: "chettiar",
      en: "Nagarathar (Chettiar)",
      ta: "நகரத்தார் (செட்டியார்)",
      confidence: "approximate",
      scoreUnit: "porutham",
      maxScore: 10,
      summary: {
        en: "Approximate for the horoscope: no separate Nagarathar porutham table was found, so the Tamil Nadu ten are used. The documented marriage rule added here is the nine-kovil check. Same kovil is traditionally avoided. Illaiyathangudi and Mathur allow pirivu marriages this app cannot see.",
        ta: "ஜாதகத்துக்குத் தோராயம்: தனி நகரத்தார் பொருத்த அட்டவணை கிடைக்கவில்லை, அதனால் தமிழ்நாட்டுப் பத்து. ஆவணப்படுத்தப்பட்ட விதி ஒன்பது கோயில். ஒரே கோயில் வழக்கமாகத் தவிர்க்கப்படும். இளையாத்தங்குடி, மாத்தூர் பிரிவுத் திருமணத்தை இந்தச் செயலி காட்டாது.",
      },
      sources: [
        { title: "Nagarathar Sangam of North America", note: "Nine kovils; bride and groom are not taken from the same kovil. Illaiyathangudi and Mathur permit alliance across pirivu." },
      ],
    },
  }),
  tamilBase({
    id: "kerala",
    streePartialFrom: 7,
    neutralLordsPass: true,
    vedhaHead: false,
    rajjuMode: "kerala-nadi",
    fiveKeyVeto: false,
    vetoIds: ["rajju", "vedha"],
    chevvai: KERALA_CHEVVAI,
    dasaMonths: 12,
    showBodyRajju: true,
    info: {
      id: "kerala",
      en: "Kerala",
      ta: "கேரளம்",
      confidence: "documented",
      scoreUnit: "porutham",
      maxScore: 10,
      summary: {
        en: "The same ten names, with published Kerala settings: Stree Deergha passes from a count of 7 (VSKP; 7 to 13 is partial here), neutral rasi lords pass, Vedhai follows Raman's list without the Chitra triangle, and the word Rajju means the three nadis. Madhya with Madhya is the grave nadi fault. Body-part rajju is shown beside the score, not inside it.",
        ta: "அதே பத்துப் பெயர்கள். கேரள அமைப்பு: ஸ்திரீ தீர்க்கம் எண்ணிக்கை 7 முதல் (VSKP; 7 முதல் 13 வரை பாதி), நடுநிலை அதிபதிகள் பொருந்தும், வேதை இராமன் பட்டியல் (சித்திரை முக்கோணம் இல்லை), ரஜ்ஜு என்ற சொல் மூன்று நாடியைக் குறிக்கும். மத்திய–மத்தியம் கடுமை. உடல் ரஜ்ஜு மதிப்பெண்ணுக்கு வெளியே காட்டப்படும்.",
      },
      sources: [
        { title: "Doosri Rai, Kerala vs Tamil", note: "VSKP stree deergha passes above seven and grades six-and-under as the low band. Kerala treats neutral lords as a pass. Kerala vedha follows Raman, so Chitra has no vedha partner. In Kerala the word rajju is used for the three nadis, and only madhya–madhya is gravely adverse." },
        { title: "B.V. Raman, Muhurtha", note: "Records both the seven and the nine stree-deergha lines. The twelve ordinary vedha pairs." },
      ],
    },
  }),
  {
    id: "ashtakoota",
    info: {
      id: "ashtakoota",
      en: "North Indian Ashtakoota",
      ta: "வட இந்திய அஷ்டகூடம்",
      confidence: "documented",
      scoreUnit: "guna",
      maxScore: 36,
      summary: {
        en: "Guna Milan out of 36 for mixed families. Varna here is a classical sign class, not anyone's community. Yoni uses the sworn-enemy list (same animal 4, enemy 0, anything else 2) rather than the full 14×14 graded table. Bhakoot dosha is cancelled for a shared lord or mutual friends. An uncancelled Nadi dosha sets the reading aside.",
        ta: "கலப்புக் குடும்பங்களுக்கு 36 குண மிலான். இங்கு வர்ணம் ராசி வகுப்பே, சாதி அல்ல. யோனி: ஒரே விலங்கு 4, பகை 0, மற்றவை 2. முழு 14×14 அட்டவணை அல்ல. பகூட் தோஷம் ஒரே அதிபதி அல்லது பரஸ்பர நட்பில் விலகும். நீக்கப்படாத நாடி தோஷம் வாசிப்பை ஒதுக்கும்.",
      },
      sources: [
        { title: "Udaya, Ashta Koota section", note: "Point weights, tara both ways, graha maitri scale, gana scale, bhakoot pairs, verdict bands 33 / 25 / 18." },
        { title: "B.V. Raman, Muhurtha, exception 6", note: "Bhakoot cancelled when one planet owns both signs or the lords are friends. Applied here." },
        { title: "Sahita vashya grid", note: "Whole-sign groups and the 5×5 score matrix used by AstroSage." },
        { title: "Janam Kundli guna table", note: "Same rasi or same nakshatra in two rasis cancels nadi fully; same nakshatra and rasi with different padas scores 4." },
      ],
    },
    dinaFavourable: DINA_OK,
    sameStarUttama: SAME_UTTAMA,
    sameStarAdhama: SAME_ADHAMA,
    streeFullAbove: 13,
    streePartialFrom: 8,
    sixthExemptions: [],
    eighthSameLord: false,
    seventhExceptions: [],
    neutralLordsPass: false,
    vedhaHead: false,
    rajjuMode: "body",
    rajjuArohaCancels: false,
    nadiMode: "ashtakoota",
    nadiCritical: true,
    fiveKeyVeto: false,
    vetoIds: ["nadi"],
    excellentMin: 33,
    goodMin: 25,
    borderlineMin: 18,
    system: "guna",
    chevvai: null,
    mangal: MANGAL,
    dasaMonths: null,
    rahu: false,
    gothra: false,
    kovil: false,
    showBodyRajju: false,
  },
];

const RULES = new Map(TRADITION_RULES.map((r) => [r.id, r]));

export function listTraditions(): TraditionInfo[] {
  return TRADITION_RULES.map((r) => r.info);
}

export function getTradition(id: string): TraditionInfo | undefined {
  return RULES.get(id)?.info;
}

export function resolvePerson(input: PersonInput): ResolvedPerson {
  const warnings: Warning[] = [];
  const gothra = input.gothra?.trim() || undefined;
  const kovil = input.kovil?.trim() || undefined;
  if (input.birth) {
    const { date, time, latitude, longitude, timezone, placeName } = input.birth;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new InputError("invalid_latitude", "Latitude must be between -90 and 90.");
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new InputError("invalid_longitude", "Longitude must be between -180 and 180.");
    }
    const when = localToUtc(date, time, timezone);
    if (when.ambiguous) {
      warnings.push({
        code: "ambiguous_time",
        en: `That clock time happened twice because of daylight saving. The earlier offset (${when.offset}) is used.`,
        ta: `பகல் சேமிப்பு நேரத்தால் இந்தக் கடிகார நேரம் இருமுறை நிகழ்ந்தது. முந்தைய வேறுபாடு (${when.offset}) பயன்படுத்தப்படுகிறது.`,
      });
    }
    const chart = siderealChart(when.utc, latitude, longitude);
    const place = placementFromLongitude(chart.moon);
    return {
      name: input.name?.trim() || undefined,
      nakshatraId: place.nakshatra.id,
      pada: place.pada,
      rasiId: place.rasi.id,
      moonLongitude: place.longitude,
      chart,
      birth: {
        instant: when.instant,
        offset: when.offset,
        timezone: when.timezone,
        placeName,
        ambiguous: when.ambiguous,
        latitude,
        longitude,
      },
      gothra,
      kovil,
      source: "birth",
      warnings,
    };
  }
  const nak = input.nakshatraId ? nakshatraById.get(input.nakshatraId) : undefined;
  if (!nak) throw new InputError("invalid_nakshatra", "Choose one of the 27 nakshatras.");
  const pada = input.pada;
  if (pada !== 1 && pada !== 2 && pada !== 3 && pada !== 4) {
    throw new InputError("invalid_pada", "Pada must be 1, 2, 3, or 4.");
  }
  const natural = RASIS[rasiIndexForPada(nak.index, pada)];
  const requested = input.rasiId ? rasiById.get(input.rasiId as RasiId) : natural;
  if (!requested) throw new InputError("invalid_rasi", "Choose one of the 12 rasis.");
  if (requested.id !== natural.id) {
    warnings.push({
      code: "rasi_override",
      en: `${nak.en} pada ${pada} normally falls in ${natural.en}. The rasi you chose, ${requested.en}, is used for the rasi checks.`,
      ta: `${nak.ta} பாதம் ${pada} வழக்கமாக ${natural.ta}. நீங்கள் தேர்ந்தெடுத்த ${requested.ta} ராசிப் பொருத்தத்துக்குப் பயன்படும்.`,
    });
  }
  return {
    name: input.name?.trim() || undefined,
    nakshatraId: nak.id,
    pada,
    rasiId: requested.id,
    gothra,
    kovil,
    source: "star",
    warnings,
  };
}

export interface PublicPerson {
  name?: string;
  nakshatra: { id: string; en: string; ta: string; localEn: string };
  pada: number;
  rasi: { id: string; en: string; ta: string; western: string };
  moonLongitude?: number;
  source: "birth" | "star";
  birth?: ResolvedPerson["birth"];
  warnings: Warning[];
}

export interface PublicCheck {
  id: string;
  name: string;
  meaning: string;
  level: Level;
  points: number;
  maxPoints: number;
  /** True only when this line's miss is a reason the reading is not recommended. */
  critical: boolean;
  explanation: string;
}

export interface PublicDosha {
  id: string;
  name: string;
  level: Level;
  critical: boolean;
  explanation: string;
}

export interface MatchReport {
  tradition: TraditionInfo;
  lang: Lang;
  bride: PublicPerson;
  groom: PublicPerson;
  score: number;
  maxScore: number;
  verdict: "excellent" | "good" | "borderline" | "poor" | "not-recommended";
  verdictText: string;
  checks: PublicCheck[];
  doshas: PublicDosha[];
  notes: string[];
  disclaimer: string;
}

function levelFromPoints(points: number, max: number): Level {
  if (points >= max && max > 0) return "match";
  if (points <= 0) return "none";
  return "partial";
}

function signOf(lon: number): number {
  return Math.floor((((lon % 360) + 360) % 360) / 30) % 12;
}

function houseBetween(refLon: number, planetLon: number): number {
  return ((signOf(planetLon) - signOf(refLon) + 12) % 12) + 1;
}

function lordGrade(a: Planet, b: Planet, neutralPasses: boolean): { points: number; level: Level; ab: string; ba: string } {
  const ab = relation(a, b);
  const ba = relation(b, a);
  if (ab === "same") return { points: 1, level: "match", ab, ba };
  const kinds = [ab, ba];
  const enemy = kinds.filter((k) => k === "enemy").length;
  const friend = kinds.filter((k) => k === "friend").length;
  const neutral = kinds.filter((k) => k === "neutral").length;
  if (enemy === 2 || (enemy === 1 && neutral === 1)) return { points: 0, level: "none", ab, ba };
  if (friend === 2 || (friend === 1 && neutral === 1)) return { points: 1, level: "match", ab, ba };
  if (neutral === 2) {
    return neutralPasses
      ? { points: 1, level: "match", ab, ba }
      : { points: 0.5, level: "partial", ab, ba };
  }
  return { points: 0.5, level: "partial", ab, ba };
}

function maitriPoints(a: Planet, b: Planet): number {
  if (a === b) return 5;
  const ab = relation(a, b);
  const ba = relation(b, a);
  const key = [ab, ba].sort().join("+");
  if (key === "friend+friend") return 5;
  if (key === "friend+neutral") return 4;
  if (key === "neutral+neutral") return 3;
  if (key === "enemy+friend") return 1;
  if (key === "enemy+neutral") return 0.5;
  return 0;
}

function taraOne(from: number, to: number): { count: number; bad: boolean } {
  const count = inclusiveCount(from, to, 27);
  const rem = count % 9;
  return { count, bad: rem === 3 || rem === 5 || rem === 7 };
}

function isSeventhException(a: RasiId, b: RasiId, pairs: [RasiId, RasiId][]): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function buildStarChecks(bride: ResolvedPerson, groom: ResolvedPerson, rules: Rules): Draft[] {
  const bN = nakshatraById.get(bride.nakshatraId)!;
  const gN = nakshatraById.get(groom.nakshatraId)!;
  const bR = rasiById.get(bride.rasiId)!;
  const gR = rasiById.get(groom.rasiId)!;
  const drafts: Draft[] = [];
  const starCount = inclusiveCount(bN.index, gN.index, 27);
  const rasiCount = inclusiveCount(bR.index, gR.index, 12);

  if (rules.system === "porutham") {
    if (bN.id === gN.id) {
      const grade = rules.sameStarUttama.includes(bN.id)
        ? "uttama"
        : rules.sameStarAdhama.includes(bN.id)
          ? "adhama"
          : "madhyama";
      const level: Level = grade === "uttama" ? "match" : grade === "madhyama" ? "partial" : "none";
      drafts.push({
        id: "dina",
        points: level === "match" ? 1 : level === "partial" ? 0.5 : 0,
        maxPoints: 1,
        level,
        critical: false,
        reason: { code: "dina-same", params: { grade } },
      });
    } else {
      const ok = rules.dinaFavourable.includes(starCount);
      drafts.push({
        id: "dina",
        points: ok ? 1 : 0,
        maxPoints: 1,
        level: ok ? "match" : "none",
        critical: false,
        reason: { code: "dina-count", params: { count: starCount, tara: (starCount - 1) % 9 } },
      });
    }

    const ganaPoints = ganaScore(gN.gana, bN.gana);
    drafts.push({
      id: "gana",
      points: ganaPoints,
      maxPoints: 1,
      level: levelFromPoints(ganaPoints, 1),
      critical: false,
      reason: { code: "gana", params: { groom: gN.gana, bride: bN.gana } },
    });

    const mahendraOk = [4, 7, 10, 13, 16, 19, 22, 25].includes(starCount);
    drafts.push({
      id: "mahendra",
      points: mahendraOk ? 1 : 0,
      maxPoints: 1,
      level: mahendraOk ? "match" : "none",
      critical: false,
      reason: { code: "mahendra", params: { count: starCount } },
    });

    let streeLevel: Level = "none";
    let streePoints = 0;
    if (starCount > rules.streeFullAbove) {
      streeLevel = "match";
      streePoints = 1;
    } else if (starCount >= rules.streePartialFrom) {
      streeLevel = "partial";
      streePoints = 0.5;
    }
    drafts.push({
      id: "stree-deergha",
      points: streePoints,
      maxPoints: 1,
      level: streeLevel,
      critical: false,
      reason: { code: "stree", params: { count: starCount, fullAbove: rules.streeFullAbove, partialFrom: rules.streePartialFrom } },
    });

    const enemy = animalsEnemy(bN.yoni, gN.yoni);
    drafts.push({
      id: "yoni",
      points: enemy ? 0 : 1,
      maxPoints: 1,
      level: enemy ? "none" : "match",
      critical: false,
      reason: { code: "yoni", params: { bride: bN.yoni, groom: gN.yoni, brideSex: bN.sex, groomSex: gN.sex, enemy: enemy ? 1 : 0 } },
    });

    drafts.push(tamilRasi(bride, groom, rules, rasiCount));
    const lords = lordGrade(bR.lord, gR.lord, rules.neutralLordsPass);
    drafts.push({
      id: "rasi-adhipathi",
      points: lords.points,
      maxPoints: 1,
      level: lords.level,
      critical: false,
      reason: { code: "lords", params: { bride: bR.lord, groom: gR.lord, ab: lords.ab, ba: lords.ba, neutralPass: rules.neutralLordsPass ? 1 : 0 } },
    });
    drafts.push(tamilVasya(bR.id, gR.id));
    drafts.push(rajjuCheck(bN, gN, rules));
    drafts.push(vedhaCheck(bN.id, gN.id, rules.vedhaHead));
  } else {
    const brideRank = VARNA_RANK[bR.varna];
    const groomRank = VARNA_RANK[gR.varna];
    const varnaOk = groomRank >= brideRank;
    drafts.push({
      id: "varna",
      points: varnaOk ? 1 : 0,
      maxPoints: 1,
      level: varnaOk ? "match" : "none",
      critical: false,
      reason: { code: "varna", params: { bride: bR.varna, groom: gR.varna } },
    });
    const vPoints = VASHYA_POINTS[gR.vashya][bR.vashya];
    drafts.push({
      id: "vashya",
      points: vPoints,
      maxPoints: 2,
      level: levelFromPoints(vPoints, 2),
      critical: false,
      reason: { code: "vashya", params: { bride: bR.vashya, groom: gR.vashya, points: vPoints } },
    });
    const t1 = taraOne(bN.index, gN.index);
    const t2 = taraOne(gN.index, bN.index);
    const taraPoints = (t1.bad ? 0 : 1.5) + (t2.bad ? 0 : 1.5);
    drafts.push({
      id: "tara",
      points: taraPoints,
      maxPoints: 3,
      level: levelFromPoints(taraPoints, 3),
      critical: false,
      reason: { code: "tara", params: { toGroom: t1.count, toBride: t2.count, points: taraPoints } },
    });
    const yEnemy = animalsEnemy(bN.yoni, gN.yoni);
    const ySame = bN.yoni === gN.yoni;
    const yPoints = yEnemy ? 0 : ySame ? 4 : 2;
    drafts.push({
      id: "yoni",
      points: yPoints,
      maxPoints: 4,
      level: levelFromPoints(yPoints, 4),
      critical: false,
      reason: { code: "yoni-guna", params: { bride: bN.yoni, groom: gN.yoni, points: yPoints } },
    });
    const mPoints = maitriPoints(bR.lord, gR.lord);
    drafts.push({
      id: "graha-maitri",
      points: mPoints,
      maxPoints: 5,
      level: levelFromPoints(mPoints, 5),
      critical: false,
      reason: { code: "maitri", params: { bride: bR.lord, groom: gR.lord, points: mPoints, max: 5, ab: relation(bR.lord, gR.lord), ba: relation(gR.lord, bR.lord) } },
    });
    const gPoints = ganaGuna(gN.gana, bN.gana);
    drafts.push({
      id: "gana",
      points: gPoints,
      maxPoints: 6,
      level: levelFromPoints(gPoints, 6),
      critical: false,
      reason: { code: "gana-guna", params: { groom: gN.gana, bride: bN.gana, points: gPoints, max: 6 } },
    });
    drafts.push(bhakoot(bR.id, gR.id, bR.lord, gR.lord));
  }

  if (rules.nadiMode === "binary") {
    const same = bN.nadi === gN.nadi;
    drafts.push({
      id: "nadi",
      points: same ? 0 : 1,
      maxPoints: 1,
      level: same ? "none" : "match",
      critical: false,
      reason: { code: "nadi-binary", params: { bride: bN.nadi, groom: gN.nadi } },
    });
  } else if (rules.nadiMode === "ashtakoota") {
    drafts.push(nadiGuna(bride, groom));
  }
  return drafts;
}

function ganaScore(groom: Gana, bride: Gana): number {
  if (groom === bride) return 1;
  if (groom === "deva" && bride === "manushya") return 1;
  if (groom === "manushya" && bride === "deva") return 0.5;
  return 0;
}

function ganaGuna(groom: Gana, bride: Gana): number {
  if (groom === bride) return 6;
  if (groom === "deva" && bride === "manushya") return 6;
  if (groom === "manushya" && bride === "deva") return 5;
  if ((groom === "deva" && bride === "rakshasa") || (groom === "rakshasa" && bride === "deva")) return 1;
  return 0;
}

function tamilRasi(bride: ResolvedPerson, groom: ResolvedPerson, rules: Rules, count: number): Draft {
  const b = bride.rasiId;
  const g = groom.rasiId;
  let level: Level = "none";
  let why = "plain";
  if (count === 1) {
    const bN = nakshatraById.get(bride.nakshatraId)!.index;
    const gN = nakshatraById.get(groom.nakshatraId)!.index;
    if (bN === gN) {
      if (groom.pada < bride.pada) level = "match";
      else if (groom.pada === bride.pada) level = "partial";
      else level = "none";
      why = "same-star";
    } else if (gN < bN) {
      level = "match";
      why = "groom-earlier";
    } else {
      level = "none";
      why = "bride-earlier";
    }
  } else if (count === 7 && isSeventhException(b, g, rules.seventhExceptions)) {
    level = "none";
    why = "seventh-exception";
  } else if (count === 7) {
    level = "match";
    why = "seventh";
  } else if (count === 6 && rules.sixthExemptions.some(([x, y]) => x === b && y === g)) {
    level = "match";
    why = "sixth-exempt";
  } else if (count === 8 && rules.eighthSameLord && rasiById.get(b)!.lord === rasiById.get(g)!.lord) {
    level = "match";
    why = "eighth-same-lord";
  } else if (count === 3 || count === 5) {
    level = "partial";
    why = "middling";
  } else if (count === 9 || count === 10 || count === 11) {
    level = "match";
    why = "good-place";
  } else {
    level = "none";
    why = count === 6 || count === 8 ? "shashtashtaka" : "hard-place";
  }
  return {
    id: "rasi",
    points: level === "match" ? 1 : level === "partial" ? 0.5 : 0,
    maxPoints: 1,
    level,
    critical: false,
    reason: { code: "rasi", params: { count, why } },
  };
}

function tamilVasya(bride: RasiId, groom: RasiId): Draft {
  const forward = TAMIL_VASYA[bride].includes(groom);
  const back = TAMIL_VASYA[groom].includes(bride);
  const level: Level = forward ? "match" : back ? "partial" : "none";
  return {
    id: "vasya",
    points: level === "match" ? 1 : level === "partial" ? 0.5 : 0,
    maxPoints: 1,
    level,
    critical: false,
    reason: { code: "vasya", params: { way: forward ? "forward" : back ? "reverse" : bride === groom ? "same" : "none" } },
  };
}

function rajjuCheck(bride: (typeof NAKSHATRAS)[number], groom: (typeof NAKSHATRAS)[number], rules: Rules): Draft {
  if (rules.rajjuMode === "kerala-nadi") {
    if (bride.nadi !== groom.nadi) {
      return { id: "rajju", points: 1, maxPoints: 1, level: "match", critical: false, reason: { code: "rajju-nadi", params: { bride: bride.nadi, groom: groom.nadi, band: "different" } } };
    }
    if (bride.nadi === "madhya") {
      return { id: "rajju", points: 0, maxPoints: 1, level: "none", critical: false, reason: { code: "rajju-nadi", params: { bride: bride.nadi, groom: groom.nadi, band: "madhya" } } };
    }
    return { id: "rajju", points: 0.5, maxPoints: 1, level: "partial", critical: false, reason: { code: "rajju-nadi", params: { bride: bride.nadi, groom: groom.nadi, band: "same-other" } } };
  }
  if (bride.rajju !== groom.rajju) {
    return { id: "rajju", points: 1, maxPoints: 1, level: "match", critical: false, reason: { code: "rajju-body", params: { bride: bride.rajju, groom: groom.rajju, result: "different" } } };
  }
  const oppose =
    (bride.flow === "ascending" && groom.flow === "descending") ||
    (bride.flow === "descending" && groom.flow === "ascending");
  if (rules.rajjuArohaCancels && oppose) {
    return { id: "rajju", points: 1, maxPoints: 1, level: "match", critical: false, reason: { code: "rajju-body", params: { bride: bride.rajju, groom: groom.rajju, result: "cancelled" } } };
  }
  return {
    id: "rajju",
    points: 0,
    maxPoints: 1,
    level: "none",
    critical: false,
    reason: { code: "rajju-body", params: { bride: bride.rajju, groom: groom.rajju, result: oppose ? "would-cancel" : "same" } },
  };
}

function vedhaCheck(bride: string, groom: string, head: boolean): Draft {
  const pairs = head ? [...VEDHA_PAIRS, ...VEDHA_HEAD] : VEDHA_PAIRS;
  const hit = pairs.some(([a, b]) => (a === bride && b === groom) || (a === groom && b === bride));
  return {
    id: "vedha",
    points: hit ? 0 : 1,
    maxPoints: 1,
    level: hit ? "none" : "match",
    critical: false,
    reason: { code: "vedha", params: { hit: hit ? 1 : 0 } },
  };
}

function bhakoot(bride: RasiId, groom: RasiId, brideLord: Planet, groomLord: Planet): Draft {
  const ab = inclusiveCount(rasiById.get(bride)!.index, rasiById.get(groom)!.index, 12);
  const ba = inclusiveCount(rasiById.get(groom)!.index, rasiById.get(bride)!.index, 12);
  const dosha = [2, 5, 6, 8, 9, 12].includes(ab);
  const friends = relation(brideLord, groomLord) === "friend" && relation(groomLord, brideLord) === "friend";
  const same = brideLord === groomLord;
  const cancelled = dosha && (same || friends);
  const points = !dosha || cancelled ? 7 : 0;
  return {
    id: "bhakoot",
    points,
    maxPoints: 7,
    level: points === 7 ? "match" : "none",
    critical: false,
    reason: { code: "bhakoot", params: { ab, ba, dosha: dosha ? 1 : 0, cancelled: cancelled ? 1 : 0 } },
  };
}

function nadiGuna(bride: ResolvedPerson, groom: ResolvedPerson): Draft {
  const b = nakshatraById.get(bride.nakshatraId)!;
  const g = nakshatraById.get(groom.nakshatraId)!;
  let points = 8;
  let why = "different";
  if (b.nadi === g.nadi) {
    if (bride.rasiId === groom.rasiId && bride.nakshatraId !== groom.nakshatraId) {
      points = 8;
      why = "same-rasi";
    } else if (bride.nakshatraId === groom.nakshatraId && bride.rasiId !== groom.rasiId) {
      points = 8;
      why = "two-rasi";
    } else if (bride.nakshatraId === groom.nakshatraId && bride.pada !== groom.pada) {
      points = 4;
      why = "different-pada";
    } else {
      points = 0;
      why = "same";
    }
  }
  return {
    id: "nadi",
    points,
    maxPoints: 8,
    level: levelFromPoints(points, 8),
    critical: false,
    reason: { code: "nadi-guna", params: { bride: b.nadi, groom: g.nadi, why, points } },
  };
}

type Severity = "none" | "mild" | "strong";

function marsSeverity(chart: SiderealChart, rules: ChevvaiRules): Severity {
  let strong = false;
  let mild = false;
  const refLon = (ref: "lagna" | "moon" | "venus") =>
    ref === "lagna" ? chart.lagna : ref === "moon" ? chart.moon : chart.venus;
  for (const ref of rules.refs) {
    const house = houseBetween(refLon(ref), chart.mars);
    if (!rules.houses.includes(house)) continue;
    if (rules.severity && (ref === "lagna" || ref === "moon") && (house === 7 || house === 8)) strong = true;
    else mild = true;
  }
  if (!strong && !mild) return "none";
  const sign = RASIS[signOf(chart.mars)].id;
  const own = sign === "mesha" || sign === "vrischika";
  const exalted = sign === "makara";
  const debilitated = sign === "kataka";
  const jupSign = sign === "dhanus" || sign === "meena";
  const conjunct = signOf(chart.mars) === signOf(chart.jupiter);
  const aspect = [5, 7, 9].includes(houseBetween(chart.jupiter, chart.mars));
  if (!rules.severity) {
    if (rules.ownSignCancels && own) return "none";
    if (rules.exaltedCancels && exalted) return "none";
    if (rules.debilitatedCancels && debilitated) return "none";
    if (rules.jupiterSignCancels && jupSign) return "none";
    if (rules.jupiterConjunctionCancels && conjunct) return "none";
    return "strong";
  }
  if ((rules.ownSignCancels && own) || (rules.exaltedCancels && exalted) || (rules.debilitatedCancels && debilitated)) {
    return "none";
  }
  if (rules.jupiterAspectReduces && (conjunct || aspect)) {
    if (strong) return "mild";
    return "none";
  }
  if (strong) return "strong";
  return mild ? "mild" : "none";
}

function chevvaiDosha(bride: ResolvedPerson, groom: ResolvedPerson, rules: ChevvaiRules): Draft {
  if (!bride.chart || !groom.chart) {
    return { id: rules.id, points: 0, maxPoints: 0, level: "unavailable", critical: false, reason: { code: "dosha-unavailable", params: { kind: rules.id } } };
  }
  const bs = marsSeverity(bride.chart, rules);
  const gs = marsSeverity(groom.chart, rules);
  let level: Level = "match";
  let result = "clear";
  if (bs === "none" && gs === "none") {
    level = "match";
    result = "clear";
  } else if (!rules.severity) {
    if (bs !== "none" && gs !== "none" && rules.bothCancel) {
      level = "match";
      result = "both";
    } else {
      level = "none";
      result = "one";
    }
  } else if (bs === gs && rules.bothCancel) {
    level = "match";
    result = "matched-severity";
  } else if ((bs === "mild" && gs === "none") || (bs === "none" && gs === "mild")) {
    level = "partial";
    result = "mild-gap";
  } else {
    level = "none";
    result = "severity-gap";
  }
  return {
    id: rules.id,
    points: 0,
    maxPoints: 0,
    level,
    critical: level === "none",
    reason: { code: "mars-dosha", params: { kind: rules.id, bride: bs, groom: gs, result } },
  };
}

function dashaBoundaries(moonLon: number, birth: Date): number[] {
  const lon = ((moonLon % 360) + 360) % 360;
  const nak = Math.min(26, Math.floor(lon / (360 / 27)));
  const start = nak * (360 / 27);
  const fracLeft = 1 - (lon - start) / (360 / 27);
  const lordIndex = nak % 9;
  const yearMs = 365.2425 * 86400000;
  const out: number[] = [];
  let t = birth.getTime() + DASHA_LORDS[lordIndex].years * fracLeft * yearMs;
  out.push(t);
  for (let i = 1; i <= 15; i++) {
    t += DASHA_LORDS[(lordIndex + i) % 9].years * yearMs;
    out.push(t);
  }
  return out;
}

function dasaDosha(bride: ResolvedPerson, groom: ResolvedPerson, months: number, asOf: Date): Draft {
  if (bride.moonLongitude == null || groom.moonLongitude == null || !bride.birth || !groom.birth) {
    return { id: "dasa-sandhi", points: 0, maxPoints: 0, level: "unavailable", critical: false, reason: { code: "dosha-unavailable", params: { kind: "dasa-sandhi" } } };
  }
  const horizon = asOf.getTime();
  const until = horizon + 30 * 365.2425 * 86400000;
  const window = months * 30.4375 * 86400000;
  const b = dashaBoundaries(bride.moonLongitude, new Date(bride.birth.instant)).filter((t) => t >= horizon && t <= until);
  const g = dashaBoundaries(groom.moonLongitude, new Date(groom.birth.instant)).filter((t) => t >= horizon && t <= until);
  let closest = Number.POSITIVE_INFINITY;
  for (const x of b) for (const y of g) closest = Math.min(closest, Math.abs(x - y));
  const hit = closest <= window;
  return {
    id: "dasa-sandhi",
    points: 0,
    maxPoints: 0,
    level: hit ? "none" : "match",
    critical: false,
    reason: { code: "dasa", params: { months, hit: hit ? 1 : 0, days: Number.isFinite(closest) ? Math.round(closest / 86400000) : -1 } },
  };
}

function rahuDosha(bride: ResolvedPerson, groom: ResolvedPerson): Draft {
  if (!bride.chart || !groom.chart) {
    return { id: "rahu-ketu", points: 0, maxPoints: 0, level: "unavailable", critical: false, reason: { code: "dosha-unavailable", params: { kind: "rahu-ketu" } } };
  }
  const has = (chart: SiderealChart) => {
    const fromLagna = houseBetween(chart.lagna, chart.rahu);
    const fromMoon = houseBetween(chart.moon, chart.rahu);
    return [7, 8].includes(fromLagna) || [7, 8].includes(fromMoon);
  };
  const b = has(bride.chart);
  const g = has(groom.chart);
  const level: Level = b === g ? "match" : "none";
  return {
    id: "rahu-ketu",
    points: 0,
    maxPoints: 0,
    level,
    critical: false,
    reason: { code: "rahu", params: { bride: b ? 1 : 0, groom: g ? 1 : 0 } },
  };
}

function textDoshas(bride: ResolvedPerson, groom: ResolvedPerson, rules: Rules): Draft[] {
  const out: Draft[] = [];
  if (rules.gothra) {
    if (!bride.gothra || !groom.gothra) {
      out.push({ id: "gothra", points: 0, maxPoints: 0, level: "unavailable", critical: false, reason: { code: "gothra", params: { result: "missing" } } });
    } else if (bride.gothra.toLowerCase() === groom.gothra.toLowerCase()) {
      out.push({ id: "gothra", points: 0, maxPoints: 0, level: "none", critical: true, reason: { code: "gothra", params: { result: "same" } } });
    } else {
      out.push({ id: "gothra", points: 0, maxPoints: 0, level: "match", critical: false, reason: { code: "gothra", params: { result: "different" } } });
    }
  }
  if (rules.kovil) {
    if (!bride.kovil || !groom.kovil) {
      out.push({ id: "kovil", points: 0, maxPoints: 0, level: "unavailable", critical: false, reason: { code: "kovil", params: { result: "missing" } } });
    } else if (bride.kovil === groom.kovil) {
      const kovil = kovilById.get(bride.kovil);
      out.push({
        id: "kovil",
        points: 0,
        maxPoints: 0,
        level: kovil?.pirivuNote ? "partial" : "none",
        critical: true,
        reason: { code: "kovil", params: { result: kovil?.pirivuNote ? "same-pirivu" : "same", kovil: bride.kovil } },
      });
    } else {
      out.push({ id: "kovil", points: 0, maxPoints: 0, level: "match", critical: false, reason: { code: "kovil", params: { result: "different" } } });
    }
  }
  if (rules.showBodyRajju) {
    const b = nakshatraById.get(bride.nakshatraId)!;
    const g = nakshatraById.get(groom.nakshatraId)!;
    out.push({
      id: "body-rajju",
      points: 0,
      maxPoints: 0,
      level: b.rajju === g.rajju ? "none" : "match",
      critical: false,
      reason: { code: "body-rajju-note", params: { bride: b.rajju, groom: g.rajju, same: b.rajju === g.rajju ? 1 : 0 } },
    });
  }
  return out;
}

function publicPerson(person: ResolvedPerson): PublicPerson {
  const nak = nakshatraById.get(person.nakshatraId)!;
  const rasi = rasiById.get(person.rasiId)!;
  return {
    name: person.name,
    nakshatra: { id: nak.id, en: nak.en, ta: nak.ta, localEn: nak.localEn },
    pada: person.pada,
    rasi: { id: rasi.id, en: rasi.en, ta: rasi.ta, western: rasi.western },
    moonLongitude: person.moonLongitude,
    source: person.source,
    birth: person.birth,
    warnings: person.warnings,
  };
}

export function matchHoroscopes(input: {
  bride: PersonInput;
  groom: PersonInput;
  traditionId: string;
  lang?: Lang;
  asOf?: string;
}): MatchReport {
  const rules = RULES.get(input.traditionId);
  if (!rules) throw new InputError("unknown_tradition", "Unknown tradition. Fetch /api/v1/traditions for the ids.");
  const lang: Lang = input.lang === "ta" ? "ta" : "en";
  const bride = resolvePerson(input.bride);
  const groom = resolvePerson(input.groom);
  const drafts = buildStarChecks(bride, groom, rules);
  const score = round1(drafts.reduce((sum, d) => sum + d.points, 0));
  const maxScore = drafts.reduce((sum, d) => sum + d.maxPoints, 0);
  const failed = (id: string) => drafts.some((d) => d.id === id && d.level === "none");
  const five = rules.fiveKeyVeto ? FIVE_KEY.filter(failed) : [];
  const vetoNames = rules.vetoIds.filter((id) => failed(id) && !five.includes(id));
  const vetoed = new Set<string>([...five, ...vetoNames]);
  for (const draft of drafts) draft.critical = vetoed.has(draft.id);
  let verdict: MatchReport["verdict"] = "poor";
  if (vetoed.size > 0) {
    verdict = "not-recommended";
  } else if (score >= rules.excellentMin) verdict = "excellent";
  else if (score >= rules.goodMin) verdict = "good";
  else if (score >= rules.borderlineMin) verdict = "borderline";

  const asOf = input.asOf ? new Date(input.asOf) : new Date();
  const doshaDrafts: Draft[] = [
    ...(rules.chevvai ? [chevvaiDosha(bride, groom, rules.chevvai)] : []),
    ...(rules.mangal ? [chevvaiDosha(bride, groom, rules.mangal)] : []),
    ...(rules.dasaMonths ? [dasaDosha(bride, groom, rules.dasaMonths, asOf)] : []),
    ...(rules.rahu ? [rahuDosha(bride, groom)] : []),
    ...textDoshas(bride, groom, rules),
  ];

  return {
    tradition: rules.info,
    lang,
    bride: publicPerson(bride),
    groom: publicPerson(groom),
    score,
    maxScore,
    verdict,
    verdictText: verdictText(lang, verdict, score, maxScore, rules.info, vetoNames, five),
    checks: drafts.map((d) => explainCheck(d, lang)),
    doshas: doshaDrafts.map((d) => explainDosha(d, lang)),
    notes: [
      lang === "ta" ? rules.info.summary.ta : rules.info.summary.en,
      ...bride.warnings.map((w) => (lang === "ta" ? `மணமகள்: ${w.ta}` : `Bride: ${w.en}`)),
      ...groom.warnings.map((w) => (lang === "ta" ? `மணமகன்: ${w.ta}` : `Groom: ${w.en}`)),
    ],
    disclaimer:
      lang === "ta"
        ? "இது வெளியிடப்பட்ட பொருத்த விதிகளின் வழிகாட்டல் மட்டுமே, முடிவு அல்ல. குடும்ப ஜோதிடரிடம் கேட்டுக்கொள்ளுங்கள். சேவ்வாய் தோஷம், தசா சந்தி, பாப சமயம் போன்றவை மரபுகேற்ப ஓரளவே சேர்க்கப்பட்டுள்ளன."
        : "This is a guide from published matching rules, not a decision. Please sit with your family astrologer. Chevvai dosham, dasa sandhi, and papa samyam are only partly covered, and only where that tradition calls for them.",
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function checkCatalogue(lang: Lang, traditionId?: string): { id: string; name: string; meaning: string; critical: boolean }[] {
  const rules = traditionId ? RULES.get(traditionId) : undefined;
  if (traditionId && !rules) throw new InputError("unknown_tradition", "Unknown tradition.");
  const sample = rules
    ? buildStarChecks(samplePerson("rohini", 1, "rishabha"), samplePerson("pushya", 1, "kataka"), rules).map((d) => d.id)
    : ["dina", "gana", "mahendra", "stree-deergha", "yoni", "rasi", "rasi-adhipathi", "vasya", "rajju", "vedha", "nadi", "varna", "vashya", "tara", "graha-maitri", "bhakoot"];
  const unique = [...new Set(sample)];
  return unique.map((id) => {
    const text = explainCheck(
      { id, points: 0, maxPoints: 1, level: "match", critical: false, reason: { code: "meaning-only", params: {} } },
      lang,
    );
    return { id, name: text.name, meaning: text.meaning, critical: rules ? rules.vetoIds.includes(id) || (id === "nadi" && !!rules.nadiCritical) : id === "rajju" || id === "vedha" };
  });
}

function samplePerson(nak: string, pada: 1 | 2 | 3 | 4, rasi: RasiId): ResolvedPerson {
  return { nakshatraId: nak, pada, rasiId: rasi, source: "star", warnings: [] };
}

