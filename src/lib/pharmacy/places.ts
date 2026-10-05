/**
 * Nearby pharmacies from Google Places API (New) — server side only (the key never reaches the app).
 * Minimal FieldMask to control cost, distance ranking, progressive radius, short in-memory cache.
 */
import { WippHttpError } from "@/lib/messaging/server";

export type PharmacyPlace = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  /** true / false when Google knows the hours, null when unknown (never shown as "closed"). */
  openNow: boolean | null;
  open24h: boolean;
  nextCloseTime: string | null;
  nextOpenTime: string | null;
  weekdayText: string[];
  website: string | null;
  mapsUri: string | null;
  regionCode: string | null;
  /** The pharmacy's own UTC offset, to show "Ferme à 22:00" in local time. */
  utcOffsetMinutes: number | null;
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.currentOpeningHours",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.postalAddress",
  "places.utcOffsetMinutes",
].join(",");

const RADII = [5_000, 10_000, 25_000];
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; value: PharmacyPlace[] }>();

function apiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) throw new WippHttpError(503, "places_not_configured", "La recherche de pharmacies n’est pas encore configurée.");
  return key;
}

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  currentOpeningHours?: {
    openNow?: boolean;
    nextCloseTime?: string;
    nextOpenTime?: string;
    weekdayDescriptions?: string[];
    periods?: { open?: { day?: number; hour?: number; minute?: number }; close?: unknown }[];
  };
  websiteUri?: string;
  googleMapsUri?: string;
  postalAddress?: { regionCode?: string };
  utcOffsetMinutes?: number;
};

function map(p: RawPlace): PharmacyPlace | null {
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  if (!p.id || typeof lat !== "number" || typeof lng !== "number") return null;
  const h = p.currentOpeningHours;
  const periods = h?.periods ?? [];
  // Google encodes "open 24/7" as a single period opening Sunday 00:00 with no close.
  const open24h = periods.length === 1 && !periods[0]?.close && (periods[0]?.open?.hour ?? -1) === 0;
  return {
    id: p.id,
    name: p.displayName?.text?.trim() || "Pharmacie",
    address: p.formattedAddress ?? null,
    lat,
    lng,
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || null,
    openNow: typeof h?.openNow === "boolean" ? h.openNow : null,
    open24h,
    nextCloseTime: h?.nextCloseTime ?? null,
    nextOpenTime: h?.nextOpenTime ?? null,
    weekdayText: h?.weekdayDescriptions ?? [],
    website: p.websiteUri ?? null,
    mapsUri: p.googleMapsUri ?? null,
    regionCode: p.postalAddress?.regionCode ?? null,
    utcOffsetMinutes: typeof p.utcOffsetMinutes === "number" ? p.utcOffsetMinutes : null,
  };
}

async function post(path: "searchNearby" | "searchText", body: unknown, lang: string): Promise<PharmacyPlace[]> {
  const res = await fetch(`https://places.googleapis.com/v1/places:${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey(), "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify({ ...(body as object), languageCode: lang }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn("[wipp-places]", path, res.status, detail.slice(0, 200));
    throw new WippHttpError(502, "places_error", "Les pharmacies ne peuvent pas être chargées pour le moment.");
  }
  const data = (await res.json()) as { places?: RawPlace[] };
  return (data.places ?? []).map(map).filter((p): p is PharmacyPlace => Boolean(p));
}

/** lat/lng → nearby pharmacies, widening the circle (5 → 10 → 25 km) when there are few results. */
export async function nearbyPharmacies(lat: number, lng: number, lang = "fr") {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new WippHttpError(400, "invalid", "Position invalide.");
  }
  // ~110 m grid: a user standing still reuses the same answer.
  const key = `n:${lat.toFixed(3)}:${lng.toFixed(3)}:${lang}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { places: hit.value, radius: null, cached: true };
  let places: PharmacyPlace[] = [];
  let used = RADII[0]!;
  for (const radius of RADII) {
    used = radius;
    places = await post(
      "searchNearby",
      {
        includedTypes: ["pharmacy"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      },
      lang,
    );
    if (places.length >= 5) break;
  }
  cache.set(key, { at: Date.now(), value: places });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return { places, radius: used, cached: false };
}

/** Manual fallback when location is refused: "pharmacie <ville / adresse>". */
export async function pharmaciesByText(query: string, lang = "fr") {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) throw new WippHttpError(400, "invalid", "Indique une ville ou une adresse.");
  const key = `t:${q.toLowerCase()}:${lang}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { places: hit.value };
  const places = await post("searchText", { textQuery: `pharmacie ${q}`, includedType: "pharmacy", pageSize: 20 }, lang);
  cache.set(key, { at: Date.now(), value: places });
  return { places };
}
