import { Platform } from "react-native";

export type LatLng = { lat: number; lng: number };

/**
 * Current position, or null if refused/unavailable. On phones it needs the expo-location
 * native module (present from the next native build); on web it uses the browser.
 */
export async function getMyPosition(): Promise<LatLng | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.geolocation) return null;
      return await new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        ),
      );
    }
    const Location = await import("expo-location");
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    // Native module missing in an older build, or location off.
    return null;
  }
}

/** Remembered for the session so every screen does not ask again. */
let cached: Promise<LatLng | null> | null = null;
export function myPositionOnce() {
  if (!cached) cached = getMyPosition().then((p) => (p ? p : ((cached = null), null)));
  return cached;
}

export function kmBetween(a: LatLng, b: LatLng) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function kmLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`;
}

type PhotonFeature = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };

/** Address/area/city for a position (OpenStreetMap). */
export async function reverseGeocode(p: LatLng) {
  const res = await fetch(`https://photon.komoot.io/reverse?lat=${p.lat}&lon=${p.lng}&lang=fr`);
  if (!res.ok) return null;
  const f = ((await res.json()) as { features?: PhotonFeature[] }).features?.[0];
  if (!f) return null;
  const q = f.properties;
  return {
    area: q.district || q.locality || q.suburb || [q.housenumber, q.street].filter(Boolean).join(" ") || "",
    city: q.city || q.town || q.village || q.county || "",
    countryCode: (q.countrycode || "").toUpperCase(),
  };
}

/** Coordinates of a city (fallback when no precise address was picked). */
export async function geocodeCity(city: string, countryId: string): Promise<LatLng | null> {
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=8&lang=fr&layer=city`);
    if (!res.ok) return null;
    const hit = ((await res.json()) as { features?: PhotonFeature[] }).features?.find((f) => (f.properties.countrycode || "").toUpperCase() === countryId);
    return hit ? { lat: hit.geometry.coordinates[1], lng: hit.geometry.coordinates[0] } : null;
  } catch {
    return null;
  }
}

/** OpenStreetMap tile (x, y) and pixel offset of a point inside it, for a static mini-map. */
export function osmTile(p: LatLng, zoom = 14) {
  const n = 2 ** zoom;
  const xf = ((p.lng + 180) / 360) * n;
  const rad = (p.lat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { zoom, x: Math.floor(xf), y: Math.floor(yf), fx: xf - Math.floor(xf), fy: yf - Math.floor(yf) };
}
