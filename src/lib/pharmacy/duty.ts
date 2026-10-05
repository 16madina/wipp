/**
 * Official "pharmacie de garde" (on-duty) data — pluggable providers per country/region.
 *
 * RULE: on-duty status comes ONLY from a verified source (government, pharmacists' order,
 * partner API…). It is never derived from Google Places `openNow`: an open pharmacy is not
 * necessarily the official on-duty pharmacy.
 *
 * To add a country later: implement PharmacyDutyProvider and add it to PROVIDERS. The screen
 * does not change.
 */
import type { PharmacyPlace } from "@/lib/pharmacy/places";

export type DutyPharmacy = {
  /** Stable id from the provider (or a Google place id when the provider gives one). */
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  /** ISO time the duty period ends, when the source gives it. */
  dutyUntil: string | null;
  /** Human name of the official source shown as "Source vérifiée". */
  source: string;
};

export interface PharmacyDutyProvider {
  /** e.g. "ci-onppci" — unique. */
  id: string;
  /** Human source name, e.g. "Ordre national des pharmaciens". */
  sourceName: string;
  /** ISO 3166-1 alpha-2 country codes this provider covers. */
  countries: string[];
  fetchOnDuty(input: { lat: number; lng: number; countryCode: string }): Promise<DutyPharmacy[]>;
}

/** No verified provider is connected yet. Add real ones here — never a fake list. */
const PROVIDERS: PharmacyDutyProvider[] = [];

export function dutyProviderFor(countryCode: string | null): PharmacyDutyProvider | null {
  if (!countryCode) return null;
  const cc = countryCode.toUpperCase();
  return PROVIDERS.find((p) => p.countries.includes(cc)) ?? null;
}

export function hasAnyDutyProvider() {
  return PROVIDERS.length > 0;
}

/**
 * On-duty pharmacies around a position. The country comes from the nearby Google results
 * (postal address region code), so the user never picks a country.
 */
export async function onDutyPharmacies(
  lat: number,
  lng: number,
  nearby: () => Promise<PharmacyPlace[]>,
): Promise<{ available: boolean; countryCode: string | null; source: string | null; pharmacies: DutyPharmacy[] }> {
  // Fast path (and no Places cost) while no provider exists anywhere.
  if (!hasAnyDutyProvider()) return { available: false, countryCode: null, source: null, pharmacies: [] };
  const places = await nearby().catch(() => [] as PharmacyPlace[]);
  const countryCode = places.find((p) => p.regionCode)?.regionCode ?? null;
  const provider = dutyProviderFor(countryCode);
  if (!provider) return { available: false, countryCode, source: null, pharmacies: [] };
  const pharmacies = await provider.fetchOnDuty({ lat, lng, countryCode: countryCode! });
  return { available: true, countryCode, source: provider.sourceName, pharmacies };
}
