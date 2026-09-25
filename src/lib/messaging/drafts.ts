/** Drafts stay on the device. Never sent to Supabase. */

const KEY = "wipp-drafts-v1";

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function readDraft(chatId: string) {
  return read()[chatId] ?? "";
}

export function writeDraft(chatId: string, text: string) {
  const all = read();
  if (!text.trim()) delete all[chatId];
  else all[chatId] = text;
  localStorage.setItem(KEY, JSON.stringify(all));
}
