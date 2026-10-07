import { WEEK_DAYS, type WeekHours } from "./business-card";

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Open right now? Uses the phone's clock (the shop and the visitor are almost always in the same city).
 * A closing time before the opening time means it closes after midnight.
 */
export function openState(week: WeekHours | null | undefined, now = new Date()): { open: boolean; label: string } | null {
  if (!week) return null;
  const dayIndex = (now.getDay() + 6) % 7; // Monday = 0
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = week[WEEK_DAYS[dayIndex]!];
  const yesterday = week[WEEK_DAYS[(dayIndex + 6) % 7]!];
  if (yesterday && toMin(yesterday.c) < toMin(yesterday.o) && minutes < toMin(yesterday.c)) {
    return { open: true, label: "Ouvert maintenant" };
  }
  if (today) {
    const o = toMin(today.o);
    const c = toMin(today.c);
    const open = c > o ? minutes >= o && minutes < c : minutes >= o || minutes < c;
    if (open) return { open: true, label: "Ouvert maintenant" };
    if (minutes < o) return { open: false, label: `Ouvre à ${today.o}` };
  }
  return { open: false, label: "Fermé" };
}

/** Profile links from the handles saved on the card. */
export const socialUrl = {
  instagram: (h: string) => `https://instagram.com/${encodeURIComponent(h)}`,
  tiktok: (h: string) => `https://www.tiktok.com/@${encodeURIComponent(h)}`,
  facebook: (h: string) => `https://www.facebook.com/${encodeURIComponent(h)}`,
};

export function websiteUrl(raw: string) {
  const v = raw.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
