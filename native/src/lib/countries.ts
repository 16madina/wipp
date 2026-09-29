export type Country = { id: string; dial: string; fr: string; en: string };

export const COUNTRIES: Country[] = [
  { id: "CA", dial: "+1", fr: "Canada", en: "Canada" },
  { id: "US", dial: "+1", fr: "États-Unis", en: "United States" },
  { id: "HT", dial: "+509", fr: "Haïti", en: "Haiti" },
  { id: "FR", dial: "+33", fr: "France", en: "France" },
  { id: "BE", dial: "+32", fr: "Belgique", en: "Belgium" },
  { id: "CH", dial: "+41", fr: "Suisse", en: "Switzerland" },
  { id: "LU", dial: "+352", fr: "Luxembourg", en: "Luxembourg" },
  { id: "GP", dial: "+590", fr: "Guadeloupe", en: "Guadeloupe" },
  { id: "MQ", dial: "+596", fr: "Martinique", en: "Martinique" },
  { id: "GF", dial: "+594", fr: "Guyane", en: "French Guiana" },
  { id: "RE", dial: "+262", fr: "La Réunion", en: "Réunion" },
  { id: "YT", dial: "+262", fr: "Mayotte", en: "Mayotte" },
  { id: "SN", dial: "+221", fr: "Sénégal", en: "Senegal" },
  { id: "CI", dial: "+225", fr: "Côte d’Ivoire", en: "Côte d’Ivoire" },
  { id: "CM", dial: "+237", fr: "Cameroun", en: "Cameroon" },
  { id: "CD", dial: "+243", fr: "RD Congo", en: "DR Congo" },
  { id: "CG", dial: "+242", fr: "Congo", en: "Congo" },
  { id: "GA", dial: "+241", fr: "Gabon", en: "Gabon" },
  { id: "GN", dial: "+224", fr: "Guinée", en: "Guinea" },
  { id: "ML", dial: "+223", fr: "Mali", en: "Mali" },
  { id: "BF", dial: "+226", fr: "Burkina Faso", en: "Burkina Faso" },
  { id: "BJ", dial: "+229", fr: "Bénin", en: "Benin" },
  { id: "TG", dial: "+228", fr: "Togo", en: "Togo" },
  { id: "NE", dial: "+227", fr: "Niger", en: "Niger" },
  { id: "TD", dial: "+235", fr: "Tchad", en: "Chad" },
  { id: "RW", dial: "+250", fr: "Rwanda", en: "Rwanda" },
  { id: "BI", dial: "+257", fr: "Burundi", en: "Burundi" },
  { id: "MG", dial: "+261", fr: "Madagascar", en: "Madagascar" },
  { id: "MU", dial: "+230", fr: "Maurice", en: "Mauritius" },
  { id: "MA", dial: "+212", fr: "Maroc", en: "Morocco" },
  { id: "DZ", dial: "+213", fr: "Algérie", en: "Algeria" },
  { id: "TN", dial: "+216", fr: "Tunisie", en: "Tunisia" },
  { id: "GB", dial: "+44", fr: "Royaume-Uni", en: "United Kingdom" },
  { id: "DE", dial: "+49", fr: "Allemagne", en: "Germany" },
  { id: "ES", dial: "+34", fr: "Espagne", en: "Spain" },
  { id: "IT", dial: "+39", fr: "Italie", en: "Italy" },
  { id: "PT", dial: "+351", fr: "Portugal", en: "Portugal" },
  { id: "NL", dial: "+31", fr: "Pays-Bas", en: "Netherlands" },
  { id: "BR", dial: "+55", fr: "Brésil", en: "Brazil" },
  { id: "MX", dial: "+52", fr: "Mexique", en: "Mexico" },
  { id: "AU", dial: "+61", fr: "Australie", en: "Australia" },
  { id: "CN", dial: "+86", fr: "Chine", en: "China" },
  { id: "IN", dial: "+91", fr: "Inde", en: "India" },
  { id: "PH", dial: "+63", fr: "Philippines", en: "Philippines" },
  { id: "NG", dial: "+234", fr: "Nigeria", en: "Nigeria" },
  { id: "ZA", dial: "+27", fr: "Afrique du Sud", en: "South Africa" },
  { id: "AE", dial: "+971", fr: "Émirats", en: "UAE" },
  { id: "LB", dial: "+961", fr: "Liban", en: "Lebanon" },
];

export const DEFAULT_COUNTRY = COUNTRIES.find((item) => item.id === "CA") ?? COUNTRIES[0];

export function countryById(id?: string) {
  return COUNTRIES.find((item) => item.id === id) ?? DEFAULT_COUNTRY;
}

export function flagEmoji(id: string) {
  return [...id.toUpperCase()].map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("");
}

export function flagUri(id: string) {
  return `https://flagcdn.com/w80/${id.toLowerCase()}.png`;
}
