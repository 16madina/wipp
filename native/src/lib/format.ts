import type { Lang } from "./types";

const FR = "fr-CA";
const EN = "en-US";

function loc(lang: Lang) {
  return lang === "fr" ? FR : EN;
}

/** Accepts ms, seconds, ISO strings, or Postgres timestamps. Never throws. */
export function asEpochMs(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const ms = Math.abs(value) < 1e12 ? value * 1000 : value;
    return Number.isNaN(new Date(ms).getTime()) ? null : ms;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return asEpochMs(Number(trimmed));
  const direct = Date.parse(trimmed);
  if (Number.isFinite(direct)) return direct;
  const iso = trimmed.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
}

function clock(ts: number) {
  const when = asEpochMs(ts);
  if (when == null) return "";
  const d = new Date(when);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isToday(ts: number, now = Date.now()) {
  return startOfDay(ts) === startOfDay(now);
}

function isYesterday(ts: number, now = Date.now()) {
  return startOfDay(ts) === startOfDay(now) - 86_400_000;
}

function isThisWeek(ts: number, now = Date.now()) {
  const n = new Date(now);
  const day = (n.getDay() + 6) % 7;
  const monday = startOfDay(now) - day * 86_400_000;
  const t = startOfDay(ts);
  return t >= monday && t < monday + 7 * 86_400_000;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatClock(ts: number) {
  return clock(ts);
}

function weekday(ts: number, lang: Lang) {
  const when = asEpochMs(ts);
  if (when == null) return "";
  return new Intl.DateTimeFormat(loc(lang), { weekday: "short" }).format(new Date(when));
}

function dayMonth(ts: number, lang: Lang, month: "short" | "long") {
  const when = asEpochMs(ts);
  if (when == null) return "";
  return new Intl.DateTimeFormat(loc(lang), { day: "numeric", month }).format(new Date(when));
}

export function formatChatTime(ts: number, lang: Lang) {
  const when = asEpochMs(ts);
  if (when == null) return "";
  if (isToday(when)) return formatClock(when);
  if (isYesterday(when)) return lang === "fr" ? "Hier" : "Yesterday";
  if (isThisWeek(when)) return weekday(when, lang);
  return dayMonth(when, lang, "short");
}

export function formatFullStamp(ts: number, lang: Lang) {
  const when = asEpochMs(ts);
  if (when == null) return "";
  if (isToday(when)) {
    return `${lang === "fr" ? "Aujourd'hui" : "Today"} · ${formatClock(when)}`;
  }
  if (isYesterday(when)) {
    return `${lang === "fr" ? "Hier" : "Yesterday"} · ${formatClock(when)}`;
  }
  return `${dayMonth(when, lang, "long")} · ${formatClock(when)}`;
}

export function formatLastSeen(ts: number | undefined, online: boolean, lang: Lang) {
  const when = asEpochMs(ts);
  if (online) return lang === "fr" ? "en ligne" : "online";
  if (when == null) return lang === "fr" ? "vu récemment" : "last seen recently";
  if (isToday(when)) {
    return lang === "fr"
      ? `vu aujourd'hui à ${formatClock(when)}`
      : `last seen today at ${formatClock(when)}`;
  }
  if (isYesterday(when)) {
    return lang === "fr"
      ? `vu hier à ${formatClock(when)}`
      : `last seen yesterday at ${formatClock(when)}`;
  }
  return lang === "fr"
    ? `vu ${dayMonth(when, lang, "short")}`
    : `last seen ${dayMonth(when, lang, "short")}`;
}

export function formatDuration(seconds: number) {
  const raw = Number(seconds);
  if (!Number.isFinite(raw)) return "0:00";
  const t = Math.max(0, raw);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatRelativeShort(ts: number, lang: Lang) {
  const when = asEpochMs(ts);
  if (when == null) return "";
  const diff = Date.now() - when;
  const min = Math.floor(diff / 60000);
  if (min < 1) return lang === "fr" ? "à l'instant" : "now";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function formatRemain(expiresAt: number, now = Date.now()) {
  const s = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${m.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function formatRemainShort(expiresAt: number, now = Date.now()) {
  const s = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest}` : `${h} h`;
}

export function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function formatMeters(meters: number, lang: Lang) {
  if (meters < 950) return `${Math.max(10, Math.round(meters / 10) * 10)}\u00a0m`;
  const km = meters / 1000;
  if (km < 10) {
    const n = km.toFixed(1);
    return `${lang === "fr" ? n.replace(".", ",") : n}\u00a0km`;
  }
  return `${Math.round(km)}\u00a0km`;
}
