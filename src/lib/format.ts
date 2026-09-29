import type { Lang } from "./types";

const FR = "fr-CA";
const EN = "en-US";

function loc(lang: Lang) {
  return lang === "fr" ? FR : EN;
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
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function weekday(ts: number, lang: Lang) {
  return new Intl.DateTimeFormat(loc(lang), { weekday: "short" }).format(new Date(ts));
}

function dayMonth(ts: number, lang: Lang, month: "short" | "long") {
  return new Intl.DateTimeFormat(loc(lang), { day: "numeric", month }).format(new Date(ts));
}

export function formatChatTime(ts: number, lang: Lang) {
  if (isToday(ts)) return formatClock(ts);
  if (isYesterday(ts)) return lang === "fr" ? "Hier" : "Yesterday";
  if (isThisWeek(ts)) return weekday(ts, lang);
  return dayMonth(ts, lang, "short");
}

export function formatFullStamp(ts: number, lang: Lang) {
  if (isToday(ts)) {
    return `${lang === "fr" ? "Aujourd'hui" : "Today"} · ${formatClock(ts)}`;
  }
  if (isYesterday(ts)) {
    return `${lang === "fr" ? "Hier" : "Yesterday"} · ${formatClock(ts)}`;
  }
  return `${dayMonth(ts, lang, "long")} · ${formatClock(ts)}`;
}

export function formatLastSeen(ts: number | undefined, online: boolean, lang: Lang) {
  if (online) return lang === "fr" ? "en ligne" : "online";
  if (!ts) return lang === "fr" ? "vu récemment" : "last seen recently";
  if (isToday(ts)) {
    return lang === "fr"
      ? `vu aujourd'hui à ${formatClock(ts)}`
      : `last seen today at ${formatClock(ts)}`;
  }
  if (isYesterday(ts)) {
    return lang === "fr"
      ? `vu hier à ${formatClock(ts)}`
      : `last seen yesterday at ${formatClock(ts)}`;
  }
  return lang === "fr"
    ? `vu ${dayMonth(ts, lang, "short")}`
    : `last seen ${dayMonth(ts, lang, "short")}`;
}

export function formatDuration(seconds: number) {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatRelativeShort(ts: number, lang: Lang) {
  const diff = Date.now() - ts;
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
