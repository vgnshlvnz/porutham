import {
  kovilById,
  type Gana,
  type Lang,
  type Nadi,
  type Planet,
  type Rajju,
  type Varna,
  type VashyaGroup,
  type YoniAnimal,
} from "./data.js";

export type Level = "match" | "partial" | "none" | "unavailable";

interface Draft {
  id: string;
  points: number;
  maxPoints: number;
  level: Level;
  critical: boolean;
  reason: { code: string; params: Record<string, string | number> };
}

const TARA = [
  ["Janma", "ஜன்மம்"],
  ["Sampat", "சம்பத்"],
  ["Vipat", "விபத்து"],
  ["Kshema", "க்ஷேமம்"],
  ["Pratyak", "பிரத்யக்"],
  ["Sadhaka", "சாதகம்"],
  ["Naidhana", "நைதனம்"],
  ["Mitra", "மித்திரம்"],
  ["Parama Mitra", "பரம மித்திரம்"],
] as const;

const GANA: Record<Gana, [string, string]> = {
  deva: ["Deva", "தேவ கணம்"],
  manushya: ["Manushya", "மனுஷ்ய கணம்"],
  rakshasa: ["Rakshasa", "ராட்சச கணம்"],
};
const YONI: Record<YoniAnimal, [string, string]> = {
  horse: ["horse", "குதிரை"],
  elephant: ["elephant", "யானை"],
  sheep: ["sheep", "ஆடு"],
  serpent: ["serpent", "பாம்பு"],
  dog: ["dog", "நாய்"],
  cat: ["cat", "பூனை"],
  rat: ["rat", "எலி"],
  cow: ["cow", "பசு"],
  buffalo: ["buffalo", "எருமை"],
  tiger: ["tiger", "புலி"],
  deer: ["deer", "மான்"],
  monkey: ["monkey", "குரங்கு"],
  mongoose: ["mongoose", "கீரி"],
  lion: ["lion", "சிங்கம்"],
};
const RAJJU: Record<Rajju, [string, string]> = {
  head: ["head", "தலை"],
  neck: ["neck", "கழுத்து"],
  navel: ["navel", "நாபி"],
  thigh: ["thigh", "தொடை"],
  foot: ["foot", "பாதம்"],
};
const NADI: Record<Nadi, [string, string]> = {
  adi: ["Adi", "ஆதி"],
  madhya: ["Madhya", "மத்திய"],
  antya: ["Antya", "அந்திய"],
};
const PLANET: Record<Planet, [string, string]> = {
  sun: ["Sun", "சூரியன்"],
  moon: ["Moon", "சந்திரன்"],
  mars: ["Mars", "செவ்வாய்"],
  mercury: ["Mercury", "புதன்"],
  jupiter: ["Jupiter", "குரு"],
  venus: ["Venus", "சுக்கிரன்"],
  saturn: ["Saturn", "சனி"],
};
const VARNA: Record<Varna, [string, string]> = {
  brahmin: ["Brahmin class of sign", "பிராமண வகுப்பு ராசி"],
  kshatriya: ["Kshatriya class of sign", "க்ஷத்திரிய வகுப்பு ராசி"],
  vaishya: ["Vaishya class of sign", "வைசிய வகுப்பு ராசி"],
  shudra: ["Shudra class of sign", "சூத்திர வகுப்பு ராசி"],
};
const VASHYA: Record<VashyaGroup, [string, string]> = {
  chatushpada: ["quadruped", "நான்கு கால்"],
  manava: ["human", "மனித"],
  jalachara: ["water", "நீர்"],
  vanachara: ["wild", "வன"],
  keeta: ["insect", "பூச்சி"],
};

const META: Record<string, readonly [string, string, string, string]> = {
  dina: ["Dinam", "தினம்", "Day-to-day health and ease between the couple.", "தம்பதியரின் அன்றாட நலம்."],
  gana: ["Ganam", "கணம்", "Whether the two temperaments sit together.", "இருவரின் குணம் ஒத்துப்போகிறதா."],
  mahendra: ["Mahendram", "மகேந்திரம்", "Children and the growth of the family.", "குழந்தைகளும் குடும்ப வளர்ச்சியும்."],
  "stree-deergha": ["Stree Deergham", "ஸ்திரீ தீர்க்கம்", "The bride's long life and the marriage lasting.", "மணமகளின் நீண்ட ஆயுளும் திருமணம் நிலைப்பதும்."],
  yoni: ["Yoni", "யோனி", "Physical comfort between the couple.", "தம்பதியரின் உடல் இயல்பு."],
  rasi: ["Rasi", "ராசி", "Emotional harmony of the two Moon signs.", "இரு சந்திர ராசிகளின் மன ஒற்றுமை."],
  "rasi-adhipathi": ["Rasi Adhipathi", "ராசி அதிபதி", "Friendship of the two ruling planets.", "இரு ராசி அதிபதிகளின் நட்பு."],
  vasya: ["Vasiyam", "வசியம்", "Mutual attraction in the Tamil vasya table.", "தமிழ் வசிய அட்டவணையில் பரஸ்பர ஈர்ப்பு."],
  rajju: ["Rajju", "ரஜ்ஜு", "A critical longevity check. In Tamil readings this is the body-part group; in the Kerala reading the same word means nadi.", "ஆயுளுக்கு முக்கியம். தமிழில் உடல் உறுப்பு; கேரள வாசிப்பில் இதே சொல் நாடியைக் குறிக்கும்."],
  vedha: ["Vedhai", "வேதை", "A critical check: these two stars should not be a published obstructing pair.", "முக்கியம்: இந்த இரு நட்சத்திரங்களும் வேதை ஜோடியாக இருக்கக்கூடாது."],
  nadi: ["Nadi", "நாடி", "The three constitution groups. Same nadi is the objection.", "மூன்று நாடிகள். ஒரே நாடி ஆட்சேபணை."],
  varna: ["Varna", "வர்ணம்", "A classical sign class, not the person's community. The groom's class should be equal or higher.", "இது ராசி வகுப்பே, நபரின் சாதி அல்ல. மணமகன் வகுப்பு சமமாகவோ உயர்வாகவோ இருக்க வேண்டும்."],
  vashya: ["Vashya", "வஷ்யம்", "North Indian attraction of the two sign groups, out of 2.", "வட இந்திய ராசிக் குழு ஈர்ப்பு, 2-க்குள்."],
  tara: ["Tara", "தாரை", "The star count taken both ways, out of 3.", "இரு திசையிலும் எண்ணும் நட்சத்திர எண்ணிக்கை, 3-க்குள்."],
  "graha-maitri": ["Graha Maitri", "கிரக மைத்ரி", "Friendship of the Moon-sign lords, out of 5.", "சந்திர ராசி அதிபதிகளின் நட்பு, 5-க்குள்."],
  bhakoot: ["Bhakoot", "பகூட்", "The Moon-sign distance. 2/12, 5/9 and 6/8 are the dosha pairs, out of 7.", "சந்திர ராசி இடைவெளி. 2/12, 5/9, 6/8 தோஷ ஜோடிகள், 7-க்குள்."],
  chevvai: ["Chevvai dosham", "செவ்வாய் தோஷம்", "Mars from the ascendant, Moon, and Venus. Not part of the porutham score.", "லக்னம், சந்திரன், சுக்கிரனிலிருந்து செவ்வாய். பொருத்த மதிப்பெண்ணில் சேராது."],
  mangal: ["Mangal dosha", "மங்கள தோஷம்", "North Indian Mars check from the ascendant and the Moon. Not part of the 36.", "லக்னம், சந்திரனிலிருந்து வட இந்திய செவ்வாய் பார்வை. 36-ல் சேராது."],
  "dasa-sandhi": ["Dasa sandhi", "தசா சந்தி", "Whether the two Vimshottari mahadashas change close together.", "இருவரின் விம்சோத்தரி மகா தசைகள் அருகருகே மாறுகிறதா."],
  "rahu-ketu": ["Rahu / Ketu", "ராகு / கேது", "Mean Rahu in the 7th or 8th from the ascendant or the Moon.", "லக்னம் அல்லது சந்திரனிலிருந்து 7 அல்லது 8-ல் சராசரி ராகு."],
  gothra: ["Gothra", "கோத்திரம்", "An optional same-gothra warning. This is lineage, not a star calculation.", "விருப்ப ஒரே கோத்திர எச்சரிக்கை. இது குலம், நட்சத்திரக் கணக்கு அல்ல."],
  kovil: ["Kovil", "கோயில்", "The nine Nagarathar temples. Same kovil is traditionally avoided.", "நகரத்தார் ஒன்பது கோயில். ஒரே கோயில் வழக்கமாகத் தவிர்க்கப்படும்."],
  "body-rajju": ["Body rajju", "உடல் ரஜ்ஜு", "The Tamil five body-part groups, shown beside the Kerala score because Kerala uses the word Rajju for nadi.", "தமிழின் ஐந்து உடல் ரஜ்ஜு. கேரளம் ரஜ்ஜு என்ற சொல்லை நாடிக்குப் பயன்படுத்துவதால் இது தனியே காட்டப்படுகிறது."],
};

function meta(id: string): { en: string; ta: string; meaningEn: string; meaningTa: string } {
  const row = META[id] ?? [id, id, "", ""];
  return { en: row[0], ta: row[1], meaningEn: row[2], meaningTa: row[3] };
}

export function explainCheck(draft: Draft, lang: Lang): {
  id: string;
  name: string;
  meaning: string;
  level: Level;
  points: number;
  maxPoints: number;
  critical: boolean;
  explanation: string;
} {
  const m = meta(draft.id);
  return {
    id: draft.id,
    name: lang === "ta" ? m.ta : m.en,
    meaning: lang === "ta" ? m.meaningTa : m.meaningEn,
    level: draft.level,
    points: draft.points,
    maxPoints: draft.maxPoints,
    critical: draft.critical,
    explanation: draft.reason.code === "meaning-only" ? (lang === "ta" ? m.meaningTa : m.meaningEn) : reasonText(draft, lang),
  };
}

export function explainDosha(draft: Draft, lang: Lang): {
  id: string;
  name: string;
  level: Level;
  critical: boolean;
  explanation: string;
} {
  const m = meta(draft.id);
  return {
    id: draft.id,
    name: lang === "ta" ? m.ta : m.en,
    level: draft.level,
    critical: draft.critical,
    explanation: reasonText(draft, lang),
  };
}

function reasonText(draft: Draft, lang: Lang): string {
  const p = draft.reason.params;
  const code = draft.reason.code;
  const ta = lang === "ta";
  switch (code) {
    case "dina-count": {
      const tara = TARA[Number(p.tara)] ?? TARA[0];
      const ok = draft.level === "match";
      return ta
        ? `மணமகளிலிருந்து மணமகன் வரை எண்ணியது ${p.count} (${tara[1]}). தினம் பொருந்தும் எண்கள் 2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26. ${ok ? "இந்த எண் அந்தப் பட்டியலில் உள்ளது." : "இந்த எண் அந்தப் பட்டியலில் இல்லை."}`
        : `Counting from the bride's star to the groom's gives ${p.count} (${tara[0]}). Dinam matches on 2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24 or 26. ${ok ? "This count is on that list." : "This count is not on that list."}`;
    }
    case "dina-same": {
      const grade = String(p.grade);
      if (grade === "uttama") {
        return ta
          ? "இருவருக்கும் ஒரே நட்சத்திரம். இந்த நட்சத்திரத்தைப் பகிர்வதை தமிழ் பஞ்சாங்கப் பட்டியல் ஏற்கிறது."
          : "Both have the same star. The Tamil almanac list accepts sharing this star.";
      }
      if (grade === "madhyama") {
        return ta
          ? "இருவருக்கும் ஒரே நட்சத்திரம். இந்த நட்சத்திரம் இரண்டாம் தெரிவு: பாதிப் பொருத்தம். ஜோதிடரிடம் கேளுங்கள்."
          : "Both have the same star. This star is a second choice, so the match is partial. Ask your astrologer.";
      }
      return ta
        ? "இருவருக்கும் ஒரே நட்சத்திரம். இந்த நட்சத்திரத்தைப் பகிர்வதை தமிழ் பட்டியல் ஏற்பதில்லை."
        : "Both have the same star. The Tamil list does not accept sharing this star.";
    }
    case "gana":
    case "gana-guna":
      return ganaText(draft, lang);
    case "mahendra":
      return ta
        ? `எண்ணிக்கை ${p.count}. மகேந்திரம் 4, 7, 10, 13, 16, 19, 22, 25-ல் மட்டுமே வரும். ${draft.level === "match" ? "இந்த எண் பொருந்துகிறது." : "இந்த எண் பொருந்தவில்லை."}`
        : `The count is ${p.count}. Mahendram is present only on 4, 7, 10, 13, 16, 19, 22 or 25. ${draft.level === "match" ? "This count is one of those." : "This count is not one of those."}`;
    case "stree":
      return ta
        ? `எண்ணிக்கை ${p.count}. ${p.fullAbove}-க்கு மேல் முழுப் பொருத்தம், ${p.partialFrom} முதல் ${p.fullAbove} வரை பாதி, அதற்குக் கீழ் இல்லை. இங்கு ${draft.level === "match" ? "முழுப் பொருத்தம்" : draft.level === "partial" ? "பாதிப் பொருத்தம்" : "பொருத்தம் இல்லை"}.`
        : `The count is ${p.count}. Above ${p.fullAbove} is a full match, ${p.partialFrom} to ${p.fullAbove} is partial, and below that is no match. This pair is ${draft.level === "match" ? "a full match" : draft.level === "partial" ? "partial" : "not a match"}.`;
    case "yoni":
      return ta
        ? `மணமகள் ${YONI[p.bride as YoniAnimal][1]}, மணமகன் ${YONI[p.groom as YoniAnimal][1]}. பசு–புலி, யானை–சிங்கம், குதிரை–எருமை, நாய்–மான், எலி–பூனை, ஆடு–குரங்கு, பாம்பு–கீரி ஆகிய பகை மட்டும் தோல்வி. ${Number(p.enemy) ? "இது பகை ஜோடி." : "இது பகை ஜோடி அல்ல."}`
        : `The bride's animal is ${YONI[p.bride as YoniAnimal][0]} and the groom's is ${YONI[p.groom as YoniAnimal][0]}. Only the seven enemy pairs fail: cow–tiger, elephant–lion, horse–buffalo, dog–deer, rat–cat, sheep–monkey, serpent–mongoose. ${Number(p.enemy) ? "This is an enemy pair." : "This is not an enemy pair."}`;
    case "yoni-guna":
      return ta
        ? `மணமகள் ${YONI[p.bride as YoniAnimal][1]}, மணமகன் ${YONI[p.groom as YoniAnimal][1]}. ஒரே விலங்கு 4, பகை 0, மற்றவை 2. இங்கு ${p.points}. இடைநிலை 3 மற்றும் 1 மதிப்புகள் இந்தப் பதிப்பில் தட்டையாக்கப்பட்டுள்ளன.`
        : `The bride's animal is ${YONI[p.bride as YoniAnimal][0]} and the groom's is ${YONI[p.groom as YoniAnimal][0]}. Same animal scores 4, an enemy pair scores 0, and anything else scores 2. This pair scores ${p.points}. The intermediate 3 and 1 grades are flattened in this version.`;
    case "rasi":
      return rasiText(lang, Number(p.count), String(p.why), draft.level);
    case "lords":
    case "maitri":
      return lordsText(draft, lang);
    case "vasya":
      return vasyaText(lang, String(p.way));
    case "rajju-body":
      return ta
        ? `மணமகள் ${RAJJU[p.bride as Rajju][1]} ரஜ்ஜு, மணமகன் ${RAJJU[p.groom as Rajju][1]} ரஜ்ஜு. ${rajjuBody(String(p.result), true)}`
        : `The bride is ${RAJJU[p.bride as Rajju][0]} rajju and the groom is ${RAJJU[p.groom as Rajju][0]} rajju. ${rajjuBody(String(p.result), false)}`;
    case "rajju-nadi":
      return ta
        ? `கேரள வாசிப்பில் ரஜ்ஜு என்பது நாடி. மணமகள் ${NADI[p.bride as Nadi][1]}, மணமகன் ${NADI[p.groom as Nadi][1]}. ${p.band === "different" ? "வேறு நாடி, பொருந்தும்." : p.band === "madhya" ? "இருவரும் மத்திய நாடி. இதுவே கேரளம் கடுமையாகப் பார்க்கும் நாடி தோஷம்." : "இருவரும் ஒரே நாடி, ஆனால் மத்தியம் அல்ல. பாதிப் பொருத்தமாக வைக்கப்பட்டுள்ளது."}`
        : `In the Kerala reading, Rajju means nadi. The bride is ${NADI[p.bride as Nadi][0]} and the groom is ${NADI[p.groom as Nadi][0]}. ${p.band === "different" ? "Different nadis, so this matches." : p.band === "madhya" ? "Both are Madhya nadi. That is the nadi fault Kerala treats as grave." : "They share a nadi, but it is not Madhya, so this is kept as partial."}`;
    case "vedha":
      return ta
        ? Number(p.hit)
          ? "இந்த இரு நட்சத்திரங்களும் வேதை ஜோடி. வேதை பொருத்தம் இல்லை. இது முக்கிய ஆட்சேபணை."
          : "இந்த இரு நட்சத்திரங்களும் வேதை ஜோடி அல்ல. வேதை பொருத்தம் உள்ளது."
        : Number(p.hit)
          ? "These two stars are a vedha pair, so Vedhai does not match. This is a critical objection."
          : "These two stars are not a vedha pair, so Vedhai matches.";
    case "nadi-binary":
      return ta
        ? `மணமகள் ${NADI[p.bride as Nadi][1]} நாடி, மணமகன் ${NADI[p.groom as Nadi][1]} நாடி. ${p.bride === p.groom ? "ஒரே நாடி, பொருந்தவில்லை. இந்த வாசிப்பில் நாடி விலக்கு பயன்படுத்தப்படவில்லை." : "வேறு நாடி, பொருந்தும்."}`
        : `The bride is ${NADI[p.bride as Nadi][0]} nadi and the groom is ${NADI[p.groom as Nadi][0]} nadi. ${p.bride === p.groom ? "Same nadi, so this does not match. This reading does not apply a nadi cancellation." : "Different nadis, so this matches."}`;
    case "nadi-guna":
      return ta
        ? `மணமகள் ${NADI[p.bride as Nadi][1]}, மணமகன் ${NADI[p.groom as Nadi][1]}. ${nadiWhy(String(p.why), true)} மதிப்பு ${p.points} / 8.`
        : `The bride is ${NADI[p.bride as Nadi][0]} and the groom is ${NADI[p.groom as Nadi][0]}. ${nadiWhy(String(p.why), false)} The score is ${p.points} / 8.`;
    case "varna":
      return ta
        ? `மணமகள் ${VARNA[p.bride as Varna][1]}, மணமகன் ${VARNA[p.groom as Varna][1]}. இது நபரின் சாதி அல்ல, ராசிக்குரிய பழைய வகுப்பு. மணமகன் வகுப்பு சமம் அல்லது உயர்வு என்றால் 1 புள்ளி.`
        : `The bride's sign is in the ${VARNA[p.bride as Varna][0]} and the groom's sign is in the ${VARNA[p.groom as Varna][0]}. This is not the person's community. The point is given when the groom's sign class is equal or higher.`;
    case "vashya":
      return ta
        ? `மணமகன் குழு ${VASHYA[p.groom as VashyaGroup][1]}, மணமகள் குழு ${VASHYA[p.bride as VashyaGroup][1]}. வஷ்ய மதிப்பு ${p.points} / 2. தனுசு முழுதும் மனிதக் குழு, மகரம் முழுதும் நீர் குழு (அஸ்ட்ரோசேஜ் முறை).`
        : `The groom's group is ${VASHYA[p.groom as VashyaGroup][0]} and the bride's group is ${VASHYA[p.bride as VashyaGroup][0]}. Vashya scores ${p.points} / 2. Dhanu is human for the whole sign and Makara is water for the whole sign, the AstroSage convention.`;
    case "tara":
      return ta
        ? `மணமகளிலிருந்து மணமகன் ${p.toGroom}, மணமகனிலிருந்து மணமகள் ${p.toBride}. மீதி 3, 5, 7 தவிர ஒவ்வொரு திசையும் 1½. கூட்டு ${p.points} / 3.`
        : `From the bride to the groom the count is ${p.toGroom}, and back it is ${p.toBride}. Each direction that is not remainder 3, 5 or 7 scores 1½. Together that is ${p.points} / 3.`;
    case "bhakoot":
      return ta
        ? `மணமகளிலிருந்து எண்ணிக்கை ${p.ab}, மறுதிசை ${p.ba}. ${Number(p.dosha) ? (Number(p.cancelled) ? "இது 2/12, 5/9 அல்லது 6/8 தோஷ ஜோடி, ஆனால் ஒரே அதிபதி அல்லது பரஸ்பர நட்பால் விலக்கப்பட்டு 7 புள்ளி தரப்படுகிறது." : "இது 2/12, 5/9 அல்லது 6/8 தோஷ ஜோடி, அதனால் 0.") : "இது தோஷ ஜோடி அல்ல, அதனால் 7."}`
        : `The count from the bride is ${p.ab}, and the other way is ${p.ba}. ${Number(p.dosha) ? (Number(p.cancelled) ? "This is a 2/12, 5/9 or 6/8 dosha pair, cancelled because the lords are the same or mutual friends, so the full 7 is restored." : "This is a 2/12, 5/9 or 6/8 dosha pair, so the score is 0.") : "This is not a dosha pair, so the score is 7."}`;
    case "mars-dosha":
      return marsText(lang, String(p.kind), String(p.bride), String(p.groom), String(p.result));
    case "dosha-unavailable":
      return ta
        ? "இருவருக்கும் பிறந்த தேதி, நேரம், இடம் இருந்தால் மட்டுமே இதைக் கணக்கிட முடியும். நட்சத்திரம் மட்டும் கொடுத்தால் இது காலியாக இருக்கும்."
        : "This can be calculated only when both people have a birth date, time, and place. With stars alone it stays blank.";
    case "dasa":
      return ta
        ? Number(p.hit)
          ? `அடுத்த 30 ஆண்டுகளில் இருவரின் மகா தசை மாற்றங்கள் ${p.months} மாதத்துக்குள் வருகின்றன (அருகிலுள்ள இடைவெளி சுமார் ${p.days} நாள்). இது தசா சந்தி எச்சரிக்கை.`
          : `அடுத்த 30 ஆண்டுகளில் இருவரின் மகா தசை மாற்றங்கள் ${p.months} மாதத்துக்குள் வரவில்லை.`
        : Number(p.hit)
          ? `Within the next 30 years the two mahadasha changes fall inside ${p.months} months of each other (closest gap about ${p.days} days). That is a dasa sandhi warning.`
          : `Within the next 30 years the two mahadasha changes do not fall inside ${p.months} months of each other.`;
    case "rahu":
      return ta
        ? Number(p.bride) === Number(p.groom)
          ? "இருவருக்கும் 7 அல்லது 8-ல் ராகு உள்ளது, அல்லது இருவருக்கும் இல்லை. இந்தக் குறிப்பு அதை ஒத்துப்போவதாகப் படிக்கிறது."
          : "ஒருவருக்கு மட்டும் 7 அல்லது 8-ல் ராகு உள்ளது. இந்தக் குறிப்பு அதைப் பொருத்தமாகப் பார்ப்பதில்லை."
        : Number(p.bride) === Number(p.groom)
          ? "Both have mean Rahu in the 7th or 8th, or neither does. This note reads that as agreeing."
          : "Only one person has mean Rahu in the 7th or 8th. This note does not treat that as a match.";
    case "gothra":
      if (p.result === "missing") return ta ? "கோத்திரம் இன்னும் நிரப்பப்படவில்லை. இது விருப்ப எச்சரிக்கை." : "Gothra was not filled in. This warning is optional.";
      if (p.result === "same") return ta ? "இருவருக்கும் ஒரே கோத்திரம். தமிழ் பிராமண மரபு அதைத் தவிர்க்கும். இது நட்சத்திரக் கணக்கு அல்ல." : "Both names are the same gothra. Tamil Brahmin custom avoids that. This is not a star calculation.";
      return ta ? "கோத்திரங்கள் வேறு. இந்த எச்சரிக்கை பொருந்தவில்லை." : "The gothras differ, so this warning does not apply.";
    case "kovil":
      return kovilText(lang, String(p.result), String(p.kovil ?? ""));
    case "body-rajju-note":
      return ta
        ? `உடல் ரஜ்ஜு: மணமகள் ${RAJJU[p.bride as Rajju][1]}, மணமகன் ${RAJJU[p.groom as Rajju][1]}. ${Number(p.same) ? "ஒரே குழு. கேரள மதிப்பெண்ணில் இது சேராது; தமிழ் ரஜ்ஜு இதைத் தோஷமாகப் பார்க்கும்." : "வேறு குழு. கேரள மதிப்பெண்ணில் இது சேராது."}`
        : `Body rajju: the bride is ${RAJJU[p.bride as Rajju][0]} and the groom is ${RAJJU[p.groom as Rajju][0]}. ${Number(p.same) ? "Same group. This is outside the Kerala score; a Tamil rajju reading would object." : "Different groups. This note is outside the Kerala score."}`;
    default:
      return ta ? "விளக்கம் இல்லை." : "No explanation was written for this line.";
  }
}

function relWord(rel: string, ta: boolean): string {
  if (rel === "same") return ta ? "அதே கிரகம்" : "the same planet";
  if (rel === "friend") return ta ? "நட்பு" : "friend";
  if (rel === "enemy") return ta ? "பகை" : "enemy";
  return ta ? "நடுநிலை" : "neutral";
}

function relationKind(ab: string, ba: string): string {
  if (ab === "same" || ba === "same") return "same";
  return [ab, ba].sort().join("+");
}

function ganaText(draft: Draft, lang: Lang): string {
  const p = draft.reason.params;
  const ta = lang === "ta";
  const groom = GANA[p.groom as Gana][ta ? 1 : 0];
  const bride = GANA[p.bride as Gana][ta ? 1 : 0];
  const head = ta
    ? `மணமகன் ${groom}, மணமகள் ${bride}. `
    : `The groom is ${groom} and the bride is ${bride}. `;
  if (draft.reason.code === "gana-guna") {
    const max = Number(p.max) || 6;
    return head + (ta
      ? `குண அளவு: ஒரே கணம் 6, தேவ மணமகனும் மனுஷ்ய மணமகளும் 6, மறுதிசை 5, தேவமும் ராட்சசமும் 1, மனுஷ்யமும் ராட்சசமும் 0. இந்த ஜோடி ${p.points} / ${max}.`
      : `On the guna scale, the same gana scores 6, a Deva groom with a Manushya bride scores 6, the reverse scores 5, Deva with Rakshasa scores 1, and Manushya with Rakshasa scores 0. This pair scores ${p.points} / ${max}.`);
  }
  const result = draft.level === "match"
    ? (ta ? "இந்த ஜோடி முழுப் பொருத்தம்." : "This pair is a full match.")
    : draft.level === "partial"
      ? (ta ? "இந்த ஜோடி பாதிப் பொருத்தம்." : "This pair is partial.")
      : (ta ? "இந்த ஜோடி பொருந்தாது." : "This pair does not match.");
  const rule = ta
    ? "ஒரே கணம் முழுப் பொருத்தம். தேவ மணமகனும் மனுஷ்ய மணமகளும் முழுப் பொருத்தம்; மறுதிசை பாதி. ராட்சச கணம் ஒருவரிடம் மட்டும் இருந்தால் பொருந்தாது."
    : "The same gana is a full match. A Deva groom with a Manushya bride is a full match, and the reverse is partial. Rakshasa on one side only does not match.";
  return `${head}${rule} ${result}`;
}

function lordsText(draft: Draft, lang: Lang): string {
  const p = draft.reason.params;
  const ta = lang === "ta";
  const bride = PLANET[p.bride as Planet][ta ? 1 : 0];
  const groom = PLANET[p.groom as Planet][ta ? 1 : 0];
  const head = ta
    ? `மணமகள் அதிபதி ${bride}, மணமகன் அதிபதி ${groom}. மணமகள் பார்வையில் ${relWord(String(p.ab), true)}; மணமகன் பார்வையில் ${relWord(String(p.ba), true)}. `
    : `The bride's lord is ${bride} and the groom's lord is ${groom}. From the bride's lord, the relation is ${relWord(String(p.ab), false)}; from the groom's lord, ${relWord(String(p.ba), false)}. `;
  if (draft.reason.code === "maitri") {
    const max = Number(p.max) || 5;
    return head + (ta
      ? `குண அளவு: ஒரே அதிபதி அல்லது பரஸ்பர நட்பு 5, நட்புடன் நடுநிலை 4, இரு நடுநிலை 3, நட்புடன் பகை 1, பகையுடன் நடுநிலை 0.5, இரு பகை 0. இந்த ஜோடி ${p.points} / ${max}.`
      : `The guna scale is 5 for the same lord or mutual friends, 4 for a friend with a neutral, 3 for two neutrals, 1 for a friend with an enemy, 0.5 for an enemy with a neutral, and 0 for two enemies. This pair scores ${p.points} / ${max}.`);
  }
  return head + lordPoruthamTail(String(p.ab), String(p.ba), Number(p.neutralPass) === 1, draft.points, ta);
}

function lordPoruthamTail(ab: string, ba: string, neutralPass: boolean, points: number, ta: boolean): string {
  if (relationKind(ab, ba) === "neutral+neutral") {
    if (neutralPass) {
      return ta
        ? `இரு நடுநிலை. இந்த வாசிப்பில் இது முழுப் பொருத்தம் (${points}).`
        : `Both ways are neutral. This reading scores two neutrals as a full match (${points}).`;
    }
    return ta
      ? `இரு நடுநிலை. இந்த வாசிப்பில் இது பாதிப் பொருத்தம் (${points}).`
      : `Both ways are neutral. This reading scores two neutrals as partial (${points}).`;
  }
  const kind = relationKind(ab, ba);
  const phrase: Record<string, [string, string]> = {
    same: ["The lords are the same planet.", "அதே கிரகம்."],
    "friend+friend": ["The lords are mutual friends.", "பரஸ்பர நட்பு."],
    "friend+neutral": ["One side is a friend and the other is neutral.", "ஒரு பக்கம் நட்பு, மற்றது நடுநிலை."],
    "enemy+friend": ["One side is a friend and the other is an enemy.", "ஒரு பக்கம் நட்பு, மற்றது பகை."],
    "enemy+neutral": ["One side is an enemy and the other is neutral.", "ஒரு பக்கம் பகை, மற்றது நடுநிலை."],
    "enemy+enemy": ["The lords are mutual enemies.", "இரு பகை."],
  };
  const row = phrase[kind] ?? ["", ""];
  const scored = points >= 1
    ? (ta ? "முழுப் பொருத்தம்" : "a full match")
    : points > 0
      ? (ta ? "பாதிப் பொருத்தம்" : "partial")
      : (ta ? "பொருத்தம் இல்லை" : "not a match");
  return ta ? `${row[1]} ${scored} (${points}).` : `${row[0]} This pair is ${scored} (${points}).`;
}

function rasiText(lang: Lang, count: number, why: string, level: Level): string {
  const head = lang === "ta" ? `மணமகளின் ராசியிலிருந்து எண்ணிக்கை ${count}. ` : `Counting from the bride's rasi gives ${count}. `;
  const bits: Record<string, [string, string]> = {
    "same-star": ["Same rasi and same star: the groom's pada should be the earlier one.", "ஒரே ராசி, ஒரே நட்சத்திரம்: மணமகன் பாதம் முந்தியதாக இருக்க வேண்டும்."],
    "groom-earlier": ["Same rasi, and the groom's star comes first. That is the match this reading asks for.", "ஒரே ராசி; மணமகன் நட்சத்திரம் முதலில் வருகிறது. இந்த வாசிப்பு கேட்பது இதுவே."],
    "bride-earlier": ["Same rasi, but the bride's star comes first. This reading does not treat that as a match.", "ஒரே ராசி, ஆனால் மணமகள் நட்சத்திரம் முதலில் வருகிறது. இதைப் பொருத்தமாக இந்த வாசிப்பு எடுப்பதில்லை."],
    "seventh-exception": ["The 7th is usually the best place, but Kadagam–Magaram and Simmam–Kumbam are the two pairs the almanacs leave out.", "7-ஆம் இடம் வழக்கமாகச் சிறந்தது. கடகம்–மகரம், சிம்மம்–கும்பம் ஆகிய இரண்டைப் பஞ்சாங்கங்கள் விலக்குகின்றன."],
    seventh: ["The 7th is the strongest rasi place in this table.", "இந்த அட்டவணையில் 7-ஆம் இடம் வலிமையான ராசி இடம்."],
    "sixth-exempt": ["The 6th is normally shashtashtaka, but this pair is on the exemption list used here.", "6-ஆம் இடம் வழக்கமாக ஷஷ்டாஷ்டகம். இந்த ஜோடி இங்குள்ள விலக்குப் பட்டியலில் உள்ளது."],
    "eighth-same-lord": ["The 8th is normally refused, but both signs share a lord, so this reading allows it.", "8-ஆம் இடம் வழக்கமாக மறுக்கப்படும். இரு ராசிக்கும் ஒரே அதிபதி, அதனால் இந்த வாசிப்பு அனுமதிக்கிறது."],
    middling: ["The 3rd and 5th are partial: not an objection, and not a full match.", "3 மற்றும் 5 பாதி: ஆட்சேபணை அல்ல, முழுப் பொருத்தமும் அல்ல."],
    "good-place": ["The 9th, 10th and 11th are full matches.", "9, 10, 11 முழுப் பொருத்தம்."],
    shashtashtaka: ["The 6th and 8th are shashtashtaka unless an exemption applies. None applies here.", "விலக்கு இல்லாவிட்டால் 6 மற்றும் 8 ஷஷ்டாஷ்டகம். இங்கு விலக்கு இல்லை."],
    "hard-place": ["The 2nd, 4th and 12th do not match in this table.", "இந்த அட்டவணையில் 2, 4, 12 பொருந்தாது."],
  };
  const line = bits[why] ?? ["", ""];
  const tail = lang === "ta" ? line[1] : line[0];
  const status = lang === "ta"
    ? level === "match" ? " முடிவு: பொருந்தும்." : level === "partial" ? " முடிவு: பாதி." : " முடிவு: பொருந்தவில்லை."
    : level === "match" ? " Result: match." : level === "partial" ? " Result: partial." : " Result: no match.";
  return head + tail + status;
}

function vasyaText(lang: Lang, way: string): string {
  const ta = lang === "ta";
  if (way === "forward") return ta ? "மணமகன் ராசி, மணமகளின் வசியப் பட்டியலில் உள்ளது. இது முழுப் பொருத்தம்." : "The groom's rasi is on the bride's vasya list. That is a full match.";
  if (way === "reverse") return ta ? "மணமகள் ராசி மட்டும் மணமகன் பட்டியலில் உள்ளது. இது பாதிப் பொருத்தம்." : "Only the bride's rasi is on the groom's list. That is a partial match.";
  if (way === "same") return ta ? "ஒரே ராசி தன் வசியப் பட்டியலில் இல்லை, அதனால் வசியம் இல்லை. சில ஜோதிடர் ஒரே ராசியை ஏற்பார்கள்." : "A sign is not on its own vasya list, so there is no vasya match. Some astrologers still accept the same sign.";
  return ta ? "இரு திசையிலும் வசியப் பட்டியல் பொருந்தவில்லை." : "Neither rasi is on the other's vasya list.";
}

function rajjuBody(result: string, ta: boolean): string {
  if (result === "different") return ta ? "வேறு ரஜ்ஜு, பொருந்தும்." : "Different rajju groups, so this matches.";
  if (result === "cancelled") return ta ? "ஒரே ரஜ்ஜு, ஆனால் ஒன்று ஆரோகணம் மற்றது அவரோகணம். இந்த மரபு தோஷத்தை விலக்குகிறது." : "Same rajju, but one star is ascending and the other descending. This tradition sets the dosha aside.";
  if (result === "would-cancel") return ta ? "ஒரே ரஜ்ஜு. ஆரோகணம்/அவரோகணம் விலக்கு சிலர் சொல்வார்கள், இந்த மரபு அதைப் பயன்படுத்தவில்லை. ரஜ்ஜு பொருந்தவில்லை." : "Same rajju. Some astrologers would waive this because one star ascends and the other descends. This tradition does not. Rajju does not match.";
  return ta ? "ஒரே ரஜ்ஜு. இது தமிழ் பொருத்தத்தின் கடுமையான ஆட்சேபணை." : "Same rajju. This is the strongest objection in Tamil matching.";
}

function nadiWhy(why: string, ta: boolean): string {
  const map: Record<string, [string, string]> = {
    different: ["Different nadis, so the full 8.", "வேறு நாடி, முழு 8."],
    "same-rasi": ["Same nadi, but the same rasi and different stars, so the dosha is cancelled.", "ஒரே நாடி, ஆனால் ஒரே ராசியும் வேறு நட்சத்திரமும், அதனால் தோஷம் விலக்கப்பட்டது."],
    "two-rasi": ["Same nakshatra across two rasis, so the dosha is cancelled.", "ஒரே நட்சத்திரம் இரு ராசியில் விழுகிறது, அதனால் தோஷம் விலக்கப்பட்டது."],
    "different-pada": ["Same nakshatra and rasi, different padas: half the points are restored (4).", "ஒரே நட்சத்திரம், ஒரே ராசி, வேறு பாதம்: பாதி புள்ளி (4) திரும்பும்."],
    same: ["Same nadi with no cancellation, so the score is 0. This tradition treats that as a block.", "விலக்கில்லாத ஒரே நாடி, மதிப்பு 0. இந்த மரபு அதைத் தடையாகப் பார்க்கிறது."],
  };
  const row = map[why] ?? ["", ""];
  return ta ? row[1] : row[0];
}

function marsText(lang: Lang, kind: string, bride: string, groom: string, result: string): string {
  const name = kind === "mangal" ? (lang === "ta" ? "மங்கள தோஷம்" : "Mangal dosha") : (lang === "ta" ? "செவ்வாய் தோஷம்" : "Chevvai dosham");
  const who = lang === "ta"
    ? `மணமகள்: ${sev(bride, true)}. மணமகன்: ${sev(groom, true)}.`
    : `Bride: ${sev(bride, false)}. Groom: ${sev(groom, false)}.`;
  const tail: Record<string, [string, string]> = {
    clear: ["Neither chart shows it after the cancellations this tradition uses.", "இந்த மரபு பயன்படுத்தும் விலக்குகளுக்குப் பின் இரு ஜாதகத்திலும் இது இல்லை."],
    both: ["Both charts show it. Many families read that as balanced.", "இரு ஜாதகத்திலும் உள்ளது. பல குடும்பங்கள் அதைச் சமன் என்று படிக்கிறார்கள்."],
    one: ["Only one chart shows it. That is the case families usually ask an astrologer about.", "ஒரு ஜாதகத்தில் மட்டும் உள்ளது. இதைக் குடும்பங்கள் வழக்கமாக ஜோதிடரிடம் கேட்பார்கள்."],
    "matched-severity": ["The two severities match, which this note treats as agreement.", "இரு அளவுகளும் ஒன்று. இந்தக் குறிப்பு அதைப் பொருத்தமாகப் பார்க்கிறது."],
    "mild-gap": ["One side is mild and the other is clear. This is a partial concern, not a hard block.", "ஒரு பக்கம் லேசானது, மற்றது இல்லை. இது பாதி கவலை, கடினத் தடை அல்ல."],
    "severity-gap": ["The severities do not match. This note does not treat that as agreement.", "அளவுகள் ஒத்துவரவில்லை. இந்தக் குறிப்பு அதைப் பொருத்தமாகப் பார்ப்பதில்லை."],
  };
  const row = tail[result] ?? ["", ""];
  return `${name}. ${who} ${lang === "ta" ? row[1] : row[0]}`;
}

function sev(value: string, ta: boolean): string {
  if (value === "strong") return ta ? "வலுவான தோஷம்" : "strong";
  if (value === "mild") return ta ? "லேசான தோஷம்" : "mild";
  return ta ? "இல்லை" : "clear";
}

function kovilText(lang: Lang, result: string, id: string): string {
  const kovil = kovilById.get(id);
  const name = kovil ? (lang === "ta" ? kovil.ta : kovil.en) : id;
  if (result === "missing") {
    return lang === "ta" ? "கோயில் இன்னும் தேர்ந்தெடுக்கப்படவில்லை." : "Kovil was not chosen.";
  }
  if (result === "different") {
    return lang === "ta" ? "இருவரும் வேறு கோயில். இந்த எச்சரிக்கை பொருந்தவில்லை." : "The two kovils differ, so this warning does not apply.";
  }
  if (result === "same-pirivu") {
    return lang === "ta"
      ? `இருவரும் ${name}. ஒரே கோயில் வழக்கமாகத் தவிர்க்கப்படும். ஆனால் இளையாத்தங்குடி, மாத்தூர் பிரிவுகளுக்கு இடையே திருமணம் அனுமதி உண்டு. பிரிவை இந்தச் செயலி பார்க்க முடியாது.`
      : `Both are ${name}. The same kovil is usually avoided, but Illaiyathangudi and Mathur allow marriage across pirivu. This app cannot see the pirivu.`;
  }
  return lang === "ta"
    ? `இருவரும் ${name}. நகரத்தார் மரபு ஒரே கோயிலைத் தவிர்க்கும்.`
    : `Both are ${name}. Nagarathar custom avoids the same kovil.`;
}

export function verdictText(
  lang: Lang,
  verdict: "excellent" | "good" | "borderline" | "poor" | "not-recommended",
  score: number,
  maxScore: number,
  tradition: { en: string; ta: string },
  vetoIds: string[],
  fiveKey: string[],
): string {
  const name = lang === "ta" ? tradition.ta : tradition.en;
  const mark = `${score}/${maxScore}`;
  const listedInFive = new Set(fiveKey);
  const veto = vetoIds.filter((id) => !listedInFive.has(id)).map((id) => (lang === "ta" ? meta(id).ta : meta(id).en)).join(", ");
  const five = fiveKey.map((id) => (lang === "ta" ? meta(id).ta : meta(id).en)).join(", ");
  if (lang === "ta") {
    if (verdict === "not-recommended") {
      const because = [
        veto ? `${veto} தவறியுள்ளது` : "",
        five ? `${five} இல்லாததால் ஐந்து முக்கியப் பொருத்த விதி பொருந்தவில்லை` : "",
      ].filter(Boolean).join("; ");
      return `${name} மரபில் ${mark}. ${because}. மதிப்பெண் என்னவாக இருந்தாலும் இந்த வாசிப்பு பரிந்துரைப்பதில்லை. ஜோதிடரிடம் கேளுங்கள்.`;
    }
    const word = verdict === "excellent" ? "சிறந்த பொருத்தம்" : verdict === "good" ? "நல்ல பொருத்தம்" : verdict === "borderline" ? "எல்லைக்கோட்டுப் பொருத்தம்" : "பல இடங்களில் பொருந்தவில்லை";
    return `${name} மரபில் ${mark}. ${word}. இறுதி முடிவுக்கு குடும்ப ஜோதிடரிடம் கேளுங்கள்.`;
  }
  if (verdict === "not-recommended") {
    const because = [
      veto ? `${veto} did not clear` : "",
      five ? `${five} failed, and this tradition treats a miss on its five essential checks as enough to set the reading aside` : "",
    ].filter(Boolean).join("; ");
    return `${name} gives ${mark}. ${because}. The reading is not recommended, whatever the other lines say. Please ask your astrologer.`;
  }
  const word = verdict === "excellent" ? "An excellent match on this scale" : verdict === "good" ? "A good match on this scale" : verdict === "borderline" ? "A borderline match" : "Several lines do not agree";
  return `${name} gives ${mark}. ${word}. Sit with your family astrologer before anyone decides.`;
}
