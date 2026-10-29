/** Star, rasi, and place tables. Tamil spellings follow common Tamil panchangam usage. */

export type Lang = "en" | "ta";
export type Gana = "deva" | "manushya" | "rakshasa";
export type YoniAnimal =
  | "horse" | "elephant" | "sheep" | "serpent" | "dog" | "cat" | "rat"
  | "cow" | "buffalo" | "tiger" | "deer" | "monkey" | "mongoose" | "lion";
export type Sex = "male" | "female";
export type Rajju = "head" | "neck" | "navel" | "thigh" | "foot";
export type RajjuFlow = "ascending" | "descending" | "peak";
export type Nadi = "adi" | "madhya" | "antya";
export type Planet = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";
export type Varna = "brahmin" | "kshatriya" | "vaishya" | "shudra";
export type VashyaGroup = "chatushpada" | "manava" | "jalachara" | "vanachara" | "keeta";
export type RasiId =
  | "mesha" | "rishabha" | "mithuna" | "kataka" | "simha" | "kanya"
  | "tula" | "vrischika" | "dhanus" | "makara" | "kumbha" | "meena";

export interface Nakshatra {
  id: string;
  index: number;
  en: string;
  /** Tamil-English spelling families often say aloud. */
  localEn: string;
  ta: string;
  gana: Gana;
  yoni: YoniAnimal;
  sex: Sex;
  rajju: Rajju;
  flow: RajjuFlow;
  nadi: Nadi;
}

export interface Rasi {
  id: RasiId;
  index: number;
  en: string;
  ta: string;
  western: string;
  lord: Planet;
  varna: Varna;
  /** Whole-sign North Indian vashya group (AstroSage / Sahita convention). */
  vashya: VashyaGroup;
}

export const NAKSHATRAS: Nakshatra[] = [
  { id: "ashwini", index: 0, en: "Ashwini", localEn: "Aswini", ta: "அஸ்வினி", gana: "deva", yoni: "horse", sex: "male", rajju: "foot", flow: "ascending", nadi: "adi" },
  { id: "bharani", index: 1, en: "Bharani", localEn: "Bharani", ta: "பரணி", gana: "manushya", yoni: "elephant", sex: "male", rajju: "thigh", flow: "ascending", nadi: "madhya" },
  { id: "krittika", index: 2, en: "Krittika", localEn: "Karthigai", ta: "கார்த்திகை", gana: "rakshasa", yoni: "sheep", sex: "female", rajju: "navel", flow: "ascending", nadi: "antya" },
  { id: "rohini", index: 3, en: "Rohini", localEn: "Rohini", ta: "ரோகிணி", gana: "manushya", yoni: "serpent", sex: "male", rajju: "neck", flow: "ascending", nadi: "antya" },
  { id: "mrigashira", index: 4, en: "Mrigashira", localEn: "Mirugasirisham", ta: "மிருகசீரிடம்", gana: "deva", yoni: "serpent", sex: "female", rajju: "head", flow: "peak", nadi: "madhya" },
  { id: "ardra", index: 5, en: "Ardra", localEn: "Thiruvathirai", ta: "திருவாதிரை", gana: "manushya", yoni: "dog", sex: "female", rajju: "neck", flow: "descending", nadi: "adi" },
  { id: "punarvasu", index: 6, en: "Punarvasu", localEn: "Punarpoosam", ta: "புனர்பூசம்", gana: "deva", yoni: "cat", sex: "female", rajju: "navel", flow: "descending", nadi: "adi" },
  { id: "pushya", index: 7, en: "Pushya", localEn: "Poosam", ta: "பூசம்", gana: "deva", yoni: "sheep", sex: "male", rajju: "thigh", flow: "descending", nadi: "madhya" },
  { id: "ashlesha", index: 8, en: "Ashlesha", localEn: "Ayilyam", ta: "ஆயில்யம்", gana: "rakshasa", yoni: "cat", sex: "male", rajju: "foot", flow: "descending", nadi: "antya" },
  { id: "magha", index: 9, en: "Magha", localEn: "Magam", ta: "மகம்", gana: "rakshasa", yoni: "rat", sex: "male", rajju: "foot", flow: "ascending", nadi: "antya" },
  { id: "purva-phalguni", index: 10, en: "Purva Phalguni", localEn: "Pooram", ta: "பூரம்", gana: "manushya", yoni: "rat", sex: "female", rajju: "thigh", flow: "ascending", nadi: "madhya" },
  { id: "uttara-phalguni", index: 11, en: "Uttara Phalguni", localEn: "Uthiram", ta: "உத்திரம்", gana: "manushya", yoni: "cow", sex: "male", rajju: "navel", flow: "ascending", nadi: "adi" },
  { id: "hasta", index: 12, en: "Hasta", localEn: "Hastham", ta: "அஸ்தம்", gana: "deva", yoni: "buffalo", sex: "female", rajju: "neck", flow: "ascending", nadi: "adi" },
  { id: "chitra", index: 13, en: "Chitra", localEn: "Chithirai", ta: "சித்திரை", gana: "rakshasa", yoni: "tiger", sex: "female", rajju: "head", flow: "peak", nadi: "madhya" },
  { id: "swati", index: 14, en: "Swati", localEn: "Swathi", ta: "சுவாதி", gana: "deva", yoni: "buffalo", sex: "male", rajju: "neck", flow: "descending", nadi: "antya" },
  { id: "vishakha", index: 15, en: "Vishakha", localEn: "Visakam", ta: "விசாகம்", gana: "rakshasa", yoni: "tiger", sex: "male", rajju: "navel", flow: "descending", nadi: "antya" },
  { id: "anuradha", index: 16, en: "Anuradha", localEn: "Anusham", ta: "அனுஷம்", gana: "deva", yoni: "deer", sex: "female", rajju: "thigh", flow: "descending", nadi: "madhya" },
  { id: "jyeshtha", index: 17, en: "Jyeshtha", localEn: "Kettai", ta: "கேட்டை", gana: "rakshasa", yoni: "deer", sex: "male", rajju: "foot", flow: "descending", nadi: "adi" },
  { id: "moola", index: 18, en: "Moola", localEn: "Moolam", ta: "மூலம்", gana: "rakshasa", yoni: "dog", sex: "male", rajju: "foot", flow: "ascending", nadi: "adi" },
  { id: "purva-ashadha", index: 19, en: "Purva Ashadha", localEn: "Pooradam", ta: "பூராடம்", gana: "manushya", yoni: "monkey", sex: "male", rajju: "thigh", flow: "ascending", nadi: "madhya" },
  { id: "uttara-ashadha", index: 20, en: "Uttara Ashadha", localEn: "Uthiradam", ta: "உத்திராடம்", gana: "manushya", yoni: "mongoose", sex: "male", rajju: "navel", flow: "ascending", nadi: "antya" },
  { id: "shravana", index: 21, en: "Shravana", localEn: "Thiruvonam", ta: "திருவோணம்", gana: "deva", yoni: "monkey", sex: "female", rajju: "neck", flow: "ascending", nadi: "antya" },
  { id: "dhanishta", index: 22, en: "Dhanishta", localEn: "Avittam", ta: "அவிட்டம்", gana: "rakshasa", yoni: "lion", sex: "female", rajju: "head", flow: "peak", nadi: "madhya" },
  { id: "shatabhisha", index: 23, en: "Shatabhisha", localEn: "Sadayam", ta: "சதயம்", gana: "rakshasa", yoni: "horse", sex: "female", rajju: "neck", flow: "descending", nadi: "adi" },
  { id: "purva-bhadrapada", index: 24, en: "Purva Bhadrapada", localEn: "Poorattathi", ta: "பூரட்டாதி", gana: "manushya", yoni: "lion", sex: "male", rajju: "navel", flow: "descending", nadi: "adi" },
  { id: "uttara-bhadrapada", index: 25, en: "Uttara Bhadrapada", localEn: "Uthirattathi", ta: "உத்திரட்டாதி", gana: "manushya", yoni: "cow", sex: "female", rajju: "thigh", flow: "descending", nadi: "madhya" },
  { id: "revati", index: 26, en: "Revati", localEn: "Revathi", ta: "ரேவதி", gana: "deva", yoni: "elephant", sex: "female", rajju: "foot", flow: "descending", nadi: "antya" },
];

export const RASIS: Rasi[] = [
  { id: "mesha", index: 0, en: "Mesham", ta: "மேஷம்", western: "Aries", lord: "mars", varna: "kshatriya", vashya: "chatushpada" },
  { id: "rishabha", index: 1, en: "Rishabam", ta: "ரிஷபம்", western: "Taurus", lord: "venus", varna: "vaishya", vashya: "chatushpada" },
  { id: "mithuna", index: 2, en: "Mithunam", ta: "மிதுனம்", western: "Gemini", lord: "mercury", varna: "shudra", vashya: "manava" },
  { id: "kataka", index: 3, en: "Kadagam", ta: "கடகம்", western: "Cancer", lord: "moon", varna: "brahmin", vashya: "jalachara" },
  { id: "simha", index: 4, en: "Simmam", ta: "சிம்மம்", western: "Leo", lord: "sun", varna: "kshatriya", vashya: "vanachara" },
  { id: "kanya", index: 5, en: "Kanni", ta: "கன்னி", western: "Virgo", lord: "mercury", varna: "vaishya", vashya: "manava" },
  { id: "tula", index: 6, en: "Thulam", ta: "துலாம்", western: "Libra", lord: "venus", varna: "shudra", vashya: "manava" },
  { id: "vrischika", index: 7, en: "Viruchigam", ta: "விருச்சிகம்", western: "Scorpio", lord: "mars", varna: "brahmin", vashya: "keeta" },
  { id: "dhanus", index: 8, en: "Dhanusu", ta: "தனுசு", western: "Sagittarius", lord: "jupiter", varna: "kshatriya", vashya: "manava" },
  { id: "makara", index: 9, en: "Magaram", ta: "மகரம்", western: "Capricorn", lord: "saturn", varna: "vaishya", vashya: "jalachara" },
  { id: "kumbha", index: 10, en: "Kumbam", ta: "கும்பம்", western: "Aquarius", lord: "saturn", varna: "shudra", vashya: "manava" },
  { id: "meena", index: 11, en: "Meenam", ta: "மீனம்", western: "Pisces", lord: "jupiter", varna: "brahmin", vashya: "jalachara" },
];

/** Natural friendship from Brihat Parashara. Unlisted planets are neutral. Saturn counts Mars as an enemy. */
export const FRIENDSHIP: Record<Planet, { friends: Planet[]; enemies: Planet[] }> = {
  sun: { friends: ["moon", "mars", "jupiter"], enemies: ["venus", "saturn"] },
  moon: { friends: ["sun", "mercury"], enemies: [] },
  mars: { friends: ["sun", "moon", "jupiter"], enemies: ["mercury"] },
  mercury: { friends: ["sun", "venus"], enemies: ["moon"] },
  jupiter: { friends: ["sun", "moon", "mars"], enemies: ["mercury", "venus"] },
  venus: { friends: ["mercury", "saturn"], enemies: ["sun", "moon"] },
  saturn: { friends: ["mercury", "venus"], enemies: ["sun", "moon", "mars"] },
};

/** Tamil vasya: signs the bride's rasi is drawn toward. Groom in this list is a full match. */
export const TAMIL_VASYA: Record<RasiId, RasiId[]> = {
  mesha: ["simha", "vrischika"],
  rishabha: ["kataka", "tula"],
  mithuna: ["kanya"],
  kataka: ["vrischika", "dhanus"],
  simha: ["makara"],
  kanya: ["rishabha", "meena"],
  tula: ["makara"],
  vrischika: ["kataka", "kanya"],
  dhanus: ["meena"],
  makara: ["kumbha"],
  kumbha: ["meena"],
  meena: ["makara"],
};

/**
 * North Indian vashya points. Row is the groom's group, column is the bride's.
 * Whole-sign groups (Dhanu = manava, Makara = jalachara), as used by AstroSage.
 * Source: Sahita vashya grid, checked against AstroSage sample scores.
 */
export const VASHYA_POINTS: Record<VashyaGroup, Record<VashyaGroup, number>> = {
  chatushpada: { chatushpada: 2, manava: 1, jalachara: 1, vanachara: 0, keeta: 1 },
  manava: { chatushpada: 1, manava: 2, jalachara: 0.5, vanachara: 0, keeta: 1 },
  jalachara: { chatushpada: 1, manava: 0.5, jalachara: 2, vanachara: 1, keeta: 1 },
  vanachara: { chatushpada: 0, manava: 0, jalachara: 0, vanachara: 2, keeta: 0 },
  keeta: { chatushpada: 1, manava: 1, jalachara: 1, vanachara: 0, keeta: 2 },
};

export const YONI_ENEMIES: [YoniAnimal, YoniAnimal][] = [
  ["cow", "tiger"],
  ["elephant", "lion"],
  ["horse", "buffalo"],
  ["dog", "deer"],
  ["rat", "cat"],
  ["sheep", "monkey"],
  ["serpent", "mongoose"],
];

/** Twelve ordinary vedha pairs. The head-rajju triangle is added by Tamil rulesets. */
export const VEDHA_PAIRS: [string, string][] = [
  ["ashwini", "jyeshtha"],
  ["bharani", "anuradha"],
  ["krittika", "vishakha"],
  ["rohini", "swati"],
  ["ardra", "shravana"],
  ["punarvasu", "uttara-ashadha"],
  ["pushya", "purva-ashadha"],
  ["ashlesha", "moola"],
  ["magha", "revati"],
  ["purva-phalguni", "uttara-bhadrapada"],
  ["uttara-phalguni", "purva-bhadrapada"],
  ["hasta", "shatabhisha"],
];

export const VEDHA_HEAD: [string, string][] = [
  ["mrigashira", "chitra"],
  ["mrigashira", "dhanishta"],
  ["chitra", "dhanishta"],
];

export const VARNA_RANK: Record<Varna, number> = {
  shudra: 1,
  vaishya: 2,
  kshatriya: 3,
  brahmin: 4,
};

export const DASHA_LORDS: { id: string; years: number; en: string; ta: string }[] = [
  { id: "ketu", years: 7, en: "Ketu", ta: "கேது" },
  { id: "venus", years: 20, en: "Sukran", ta: "சுக்கிரன்" },
  { id: "sun", years: 6, en: "Suryan", ta: "சூரியன்" },
  { id: "moon", years: 10, en: "Chandran", ta: "சந்திரன்" },
  { id: "mars", years: 7, en: "Sevvai", ta: "செவ்வாய்" },
  { id: "rahu", years: 18, en: "Rahu", ta: "ராகு" },
  { id: "jupiter", years: 16, en: "Guru", ta: "குரு" },
  { id: "saturn", years: 19, en: "Sani", ta: "சனி" },
  { id: "mercury", years: 17, en: "Budhan", ta: "புதன்" },
];

export interface Kovil {
  id: string;
  en: string;
  ta: string;
  /** These two kovils traditionally allow marriage across pirivu subdivisions. */
  pirivuNote: boolean;
}

export const KOVILS: Kovil[] = [
  { id: "illaiyathangudi", en: "Illaiyathangudi", ta: "இளையாத்தங்குடி", pirivuNote: true },
  { id: "mathur", en: "Mathur", ta: "மாத்தூர்", pirivuNote: true },
  { id: "vairavan-koil", en: "Vairavan Koil", ta: "வைரவன்கோவில்", pirivuNote: false },
  { id: "nemam-koil", en: "Nemam Koil", ta: "நெமம்கோவில்", pirivuNote: false },
  { id: "illupaikudi", en: "Illupaikudi", ta: "இலுப்பைக்குடி", pirivuNote: false },
  { id: "soorakkudi", en: "Soorakkudi", ta: "சூரக்குடி", pirivuNote: false },
  { id: "velangudi", en: "Velangudi", ta: "வேலங்குடி", pirivuNote: false },
  { id: "irani-koil", en: "Irani Koil", ta: "இரணிக்கோவில்", pirivuNote: false },
  { id: "pillaiyarpatti", en: "Pillaiyarpatti", ta: "பிள்ளையார்பட்டி", pirivuNote: false },
];

export interface City {
  id: string;
  name: string;
  admin: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** Offline fallback when geocoding is unreachable. Coordinates are city centres. */
export const CITIES: City[] = [
  { id: "chennai", name: "Chennai", admin: "Tamil Nadu", country: "India", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata" },
  { id: "madurai", name: "Madurai", admin: "Tamil Nadu", country: "India", latitude: 9.9252, longitude: 78.1198, timezone: "Asia/Kolkata" },
  { id: "coimbatore", name: "Coimbatore", admin: "Tamil Nadu", country: "India", latitude: 11.0168, longitude: 76.9558, timezone: "Asia/Kolkata" },
  { id: "tiruchirappalli", name: "Tiruchirappalli", admin: "Tamil Nadu", country: "India", latitude: 10.7905, longitude: 78.7047, timezone: "Asia/Kolkata" },
  { id: "salem", name: "Salem", admin: "Tamil Nadu", country: "India", latitude: 11.6643, longitude: 78.1460, timezone: "Asia/Kolkata" },
  { id: "tirunelveli", name: "Tirunelveli", admin: "Tamil Nadu", country: "India", latitude: 8.7139, longitude: 77.7567, timezone: "Asia/Kolkata" },
  { id: "erode", name: "Erode", admin: "Tamil Nadu", country: "India", latitude: 11.3410, longitude: 77.7172, timezone: "Asia/Kolkata" },
  { id: "thanjavur", name: "Thanjavur", admin: "Tamil Nadu", country: "India", latitude: 10.7870, longitude: 79.1378, timezone: "Asia/Kolkata" },
  { id: "vellore", name: "Vellore", admin: "Tamil Nadu", country: "India", latitude: 12.9165, longitude: 79.1325, timezone: "Asia/Kolkata" },
  { id: "kanchipuram", name: "Kanchipuram", admin: "Tamil Nadu", country: "India", latitude: 12.8342, longitude: 79.7036, timezone: "Asia/Kolkata" },
  { id: "puducherry", name: "Puducherry", admin: "Puducherry", country: "India", latitude: 11.9416, longitude: 79.8083, timezone: "Asia/Kolkata" },
  { id: "bengaluru", name: "Bengaluru", admin: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946, timezone: "Asia/Kolkata" },
  { id: "hyderabad", name: "Hyderabad", admin: "Telangana", country: "India", latitude: 17.3850, longitude: 78.4867, timezone: "Asia/Kolkata" },
  { id: "mumbai", name: "Mumbai", admin: "Maharashtra", country: "India", latitude: 19.0760, longitude: 72.8777, timezone: "Asia/Kolkata" },
  { id: "delhi", name: "Delhi", admin: "Delhi", country: "India", latitude: 28.6139, longitude: 77.2090, timezone: "Asia/Kolkata" },
  { id: "kolkata", name: "Kolkata", admin: "West Bengal", country: "India", latitude: 22.5726, longitude: 88.3639, timezone: "Asia/Kolkata" },
  { id: "jaffna", name: "Jaffna", admin: "Northern", country: "Sri Lanka", latitude: 9.6615, longitude: 80.0255, timezone: "Asia/Colombo" },
  { id: "colombo", name: "Colombo", admin: "Western", country: "Sri Lanka", latitude: 6.9271, longitude: 79.8612, timezone: "Asia/Colombo" },
  { id: "kandy", name: "Kandy", admin: "Central", country: "Sri Lanka", latitude: 7.2906, longitude: 80.6337, timezone: "Asia/Colombo" },
  { id: "batticaloa", name: "Batticaloa", admin: "Eastern", country: "Sri Lanka", latitude: 7.7170, longitude: 81.7000, timezone: "Asia/Colombo" },
  { id: "singapore", name: "Singapore", admin: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { id: "kuala-lumpur", name: "Kuala Lumpur", admin: "Federal Territory", country: "Malaysia", latitude: 3.1390, longitude: 101.6869, timezone: "Asia/Kuala_Lumpur" },
  { id: "george-town", name: "George Town", admin: "Penang", country: "Malaysia", latitude: 5.4141, longitude: 100.3288, timezone: "Asia/Kuala_Lumpur" },
  { id: "ipoh", name: "Ipoh", admin: "Perak", country: "Malaysia", latitude: 4.5975, longitude: 101.0901, timezone: "Asia/Kuala_Lumpur" },
  { id: "johor-bahru", name: "Johor Bahru", admin: "Johor", country: "Malaysia", latitude: 1.4927, longitude: 103.7414, timezone: "Asia/Kuala_Lumpur" },
  { id: "london", name: "London", admin: "England", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London" },
  { id: "birmingham", name: "Birmingham", admin: "England", country: "United Kingdom", latitude: 52.4862, longitude: -1.8904, timezone: "Europe/London" },
  { id: "leicester", name: "Leicester", admin: "England", country: "United Kingdom", latitude: 52.6369, longitude: -1.1398, timezone: "Europe/London" },
  { id: "paris", name: "Paris", admin: "Île-de-France", country: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { id: "frankfurt", name: "Frankfurt", admin: "Hesse", country: "Germany", latitude: 50.1109, longitude: 8.6821, timezone: "Europe/Berlin" },
  { id: "berlin", name: "Berlin", admin: "Berlin", country: "Germany", latitude: 52.5200, longitude: 13.4050, timezone: "Europe/Berlin" },
  { id: "amsterdam", name: "Amsterdam", admin: "North Holland", country: "Netherlands", latitude: 52.3676, longitude: 4.9041, timezone: "Europe/Amsterdam" },
  { id: "zurich", name: "Zurich", admin: "Zurich", country: "Switzerland", latitude: 47.3769, longitude: 8.5417, timezone: "Europe/Zurich" },
  { id: "milan", name: "Milan", admin: "Lombardy", country: "Italy", latitude: 45.4642, longitude: 9.1900, timezone: "Europe/Rome" },
  { id: "new-york", name: "New York", admin: "New York", country: "United States", latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York" },
  { id: "edison", name: "Edison", admin: "New Jersey", country: "United States", latitude: 40.5187, longitude: -74.4121, timezone: "America/New_York" },
  { id: "boston", name: "Boston", admin: "Massachusetts", country: "United States", latitude: 42.3601, longitude: -71.0589, timezone: "America/New_York" },
  { id: "chicago", name: "Chicago", admin: "Illinois", country: "United States", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" },
  { id: "houston", name: "Houston", admin: "Texas", country: "United States", latitude: 29.7604, longitude: -95.3698, timezone: "America/Chicago" },
  { id: "dallas", name: "Dallas", admin: "Texas", country: "United States", latitude: 32.7767, longitude: -96.7970, timezone: "America/Chicago" },
  { id: "los-angeles", name: "Los Angeles", admin: "California", country: "United States", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { id: "san-jose", name: "San Jose", admin: "California", country: "United States", latitude: 37.3382, longitude: -121.8863, timezone: "America/Los_Angeles" },
  { id: "seattle", name: "Seattle", admin: "Washington", country: "United States", latitude: 47.6062, longitude: -122.3321, timezone: "America/Los_Angeles" },
  { id: "atlanta", name: "Atlanta", admin: "Georgia", country: "United States", latitude: 33.7490, longitude: -84.3880, timezone: "America/New_York" },
  { id: "toronto", name: "Toronto", admin: "Ontario", country: "Canada", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto" },
  { id: "scarborough", name: "Scarborough", admin: "Ontario", country: "Canada", latitude: 43.7764, longitude: -79.2318, timezone: "America/Toronto" },
  { id: "vancouver", name: "Vancouver", admin: "British Columbia", country: "Canada", latitude: 49.2827, longitude: -123.1207, timezone: "America/Vancouver" },
  { id: "montreal", name: "Montreal", admin: "Quebec", country: "Canada", latitude: 45.5017, longitude: -73.5673, timezone: "America/Toronto" },
  { id: "sydney", name: "Sydney", admin: "New South Wales", country: "Australia", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
  { id: "melbourne", name: "Melbourne", admin: "Victoria", country: "Australia", latitude: -37.8136, longitude: 144.9631, timezone: "Australia/Melbourne" },
  { id: "perth", name: "Perth", admin: "Western Australia", country: "Australia", latitude: -31.9523, longitude: 115.8613, timezone: "Australia/Perth" },
  { id: "dubai", name: "Dubai", admin: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai" },
  { id: "abu-dhabi", name: "Abu Dhabi", admin: "Abu Dhabi", country: "United Arab Emirates", latitude: 24.4539, longitude: 54.3773, timezone: "Asia/Dubai" },
  { id: "doha", name: "Doha", admin: "Doha", country: "Qatar", latitude: 25.2854, longitude: 51.5310, timezone: "Asia/Qatar" },
  { id: "kuwait-city", name: "Kuwait City", admin: "Al Asimah", country: "Kuwait", latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait" },
  { id: "muscat", name: "Muscat", admin: "Muscat", country: "Oman", latitude: 23.5880, longitude: 58.3829, timezone: "Asia/Muscat" },
  { id: "manama", name: "Manama", admin: "Capital", country: "Bahrain", latitude: 26.2285, longitude: 50.5860, timezone: "Asia/Bahrain" },
  { id: "riyadh", name: "Riyadh", admin: "Riyadh", country: "Saudi Arabia", latitude: 24.7136, longitude: 46.6753, timezone: "Asia/Riyadh" },
  { id: "durban", name: "Durban", admin: "KwaZulu-Natal", country: "South Africa", latitude: -29.8587, longitude: 31.0218, timezone: "Africa/Johannesburg" },
  { id: "port-louis", name: "Port Louis", admin: "Port Louis", country: "Mauritius", latitude: -20.1609, longitude: 57.5012, timezone: "Indian/Mauritius" },
  { id: "wellington", name: "Wellington", admin: "Wellington", country: "New Zealand", latitude: -41.2865, longitude: 174.7762, timezone: "Pacific/Auckland" },
];

export const nakshatraById = new Map(NAKSHATRAS.map((n) => [n.id, n]));
export const rasiById = new Map(RASIS.map((r) => [r.id, r]));
export const kovilById = new Map(KOVILS.map((k) => [k.id, k]));

export function searchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored = CITIES.map((city) => {
    const hay = `${city.name} ${city.admin} ${city.country}`.toLowerCase();
    if (city.name.toLowerCase() === q) return { city, score: 0 };
    if (city.name.toLowerCase().startsWith(q)) return { city, score: 1 };
    if (hay.includes(q)) return { city, score: 2 };
    return null;
  }).filter((row): row is { city: City; score: number } => row !== null);
  scored.sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name));
  return scored.slice(0, limit).map((row) => row.city);
}

const NAK_ARC_MIN = 800;
const PADA_ARC_MIN = 200;
const RASI_ARC_MIN = 1800;

export function rasiIndexForPada(nakshatraIndex: number, pada: 1 | 2 | 3 | 4): number {
  const start = nakshatraIndex * NAK_ARC_MIN + (pada - 1) * PADA_ARC_MIN;
  return Math.floor(start / RASI_ARC_MIN) % 12;
}

export function placementFromLongitude(longitude: number): {
  longitude: number;
  nakshatra: Nakshatra;
  pada: 1 | 2 | 3 | 4;
  rasi: Rasi;
} {
  let lon = ((longitude % 360) + 360) % 360;
  if (lon >= 359.999999) lon = 0;
  const minutes = (lon / 360) * 21600;
  const nakIndex = Math.min(26, Math.floor(minutes / NAK_ARC_MIN));
  const into = minutes - nakIndex * NAK_ARC_MIN;
  const pada = (Math.min(3, Math.floor(into / PADA_ARC_MIN)) + 1) as 1 | 2 | 3 | 4;
  const rasiIndex = Math.min(11, Math.floor(minutes / RASI_ARC_MIN));
  return {
    longitude: lon,
    nakshatra: NAKSHATRAS[nakIndex],
    pada,
    rasi: RASIS[rasiIndex],
  };
}

export function inclusiveCount(fromIndex: number, toIndex: number, modulo: number): number {
  return ((toIndex - fromIndex + modulo) % modulo) + 1;
}

export function relation(from: Planet, to: Planet): "same" | "friend" | "neutral" | "enemy" {
  if (from === to) return "same";
  const row = FRIENDSHIP[from];
  if (row.friends.includes(to)) return "friend";
  if (row.enemies.includes(to)) return "enemy";
  return "neutral";
}

export function animalsEnemy(a: YoniAnimal, b: YoniAnimal): boolean {
  return YONI_ENEMIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}
