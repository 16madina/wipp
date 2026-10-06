/**
 * Geohash (base32) — small, dependency-free. The phone encodes its position into a cell; the server
 * only ever sees cells (never coordinates) and expands them to "every cell close enough".
 */
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const BITS = [16, 8, 4, 2, 1];

export type CellBox = { latMin: number; latMax: number; lngMin: number; lngMax: number };

export function isGeohash(cell: string, precision?: number) {
  if (!/^[0-9bcdefghjkmnpqrstuvwxyz]+$/.test(cell)) return false;
  return precision ? cell.length === precision : cell.length >= 4 && cell.length <= 9;
}

export function encodeGeohash(lat: number, lng: number, precision: number) {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let out = "";
  let bit = 0;
  let ch = 0;
  let even = true;
  while (out.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch |= BITS[bit]!;
        lngMin = mid;
      } else lngMax = mid;
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= BITS[bit]!;
        latMin = mid;
      } else latMax = mid;
    }
    even = !even;
    if (bit < 4) bit++;
    else {
      out += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return out;
}

export function decodeGeohash(cell: string): CellBox {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let even = true;
  for (const c of cell) {
    const v = BASE32.indexOf(c);
    for (const mask of BITS) {
      if (even) {
        const mid = (lngMin + lngMax) / 2;
        if (v & mask) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (v & mask) latMin = mid;
        else latMax = mid;
      }
      even = !even;
    }
  }
  return { latMin, latMax, lngMin, lngMax };
}

const M_PER_DEG_LAT = 111_320;

function mPerDegLng(lat: number) {
  return Math.max(1, 111_320 * Math.cos((lat * Math.PI) / 180));
}

/** Smallest distance (m) between two cells (0 if they touch/overlap). Equirectangular, fine at city scale. */
export function boxGapM(a: CellBox, b: CellBox) {
  const lat = (a.latMin + a.latMax) / 2;
  const dLat = Math.max(0, b.latMin - a.latMax, a.latMin - b.latMax) * M_PER_DEG_LAT;
  const dLng = Math.max(0, b.lngMin - a.lngMax, a.lngMin - b.lngMax) * mPerDegLng(lat);
  return Math.hypot(dLat, dLng);
}

/** Distance (km) between the centres of two cells. */
export function cellCenterKm(a: string, b: string) {
  const A = decodeGeohash(a);
  const B = decodeGeohash(b);
  const la = (A.latMin + A.latMax) / 2;
  const lb = (B.latMin + B.latMax) / 2;
  const dLat = (lb - la) * M_PER_DEG_LAT;
  const dLng = ((B.lngMin + B.lngMax) / 2 - (A.lngMin + A.lngMax) / 2) * mPerDegLng((la + lb) / 2);
  return Math.hypot(dLat, dLng) / 1000;
}

/**
 * Every cell (same precision) with at least one point within `radiusM` of ANY point of `cell`.
 * So anyone really within radiusM of the searcher is always found, whatever cell boundary lies between.
 */
export function cellsWithin(cell: string, radiusM: number, maxCells = 400) {
  const box = decodeGeohash(cell);
  const precision = cell.length;
  const h = box.latMax - box.latMin;
  const w = box.lngMax - box.lngMin;
  const lat = (box.latMin + box.latMax) / 2;
  const rows = Math.ceil(radiusM / (h * M_PER_DEG_LAT));
  const cols = Math.ceil(radiusM / (w * mPerDegLng(lat)));
  const out: string[] = [];
  for (let dy = -rows; dy <= rows; dy++) {
    for (let dx = -cols; dx <= cols; dx++) {
      const cLat = lat + dy * h;
      if (cLat <= -90 || cLat >= 90) continue;
      let cLng = (box.lngMin + box.lngMax) / 2 + dx * w;
      if (cLng >= 180) cLng -= 360;
      if (cLng < -180) cLng += 360;
      const c = encodeGeohash(cLat, cLng, precision);
      if (boxGapM(box, decodeGeohash(c)) <= radiusM && !out.includes(c)) out.push(c);
      if (out.length >= maxCells) return out;
    }
  }
  return out;
}
