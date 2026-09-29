export const QR_HOST = "wippapp.com";

export type QrParse =
  | { kind: "profile"; username: string }
  | { kind: "temp"; token: string }
  | { kind: "invalid" };

export function profileQr(username: string) {
  return `https://${QR_HOST}/@${username}`;
}
export function tempQr(token: string) {
  return `https://${QR_HOST}/t/${token}`;
}
export function groupQr(token: string) {
  return `https://${QR_HOST}/g/${token}`;
}
export function businessQr(handle: string) {
  return `https://${QR_HOST}/b/${handle}`;
}

export function parseWippQr(raw: string): QrParse {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { kind: "invalid" };
  }
  const host = url.hostname.replace(/^www\./, "");
  if (url.protocol !== "https:" || host !== QR_HOST) return { kind: "invalid" };
  const p = url.pathname;
  const prof = /^\/@([a-z0-9._]{2,30})$/i.exec(p);
  if (prof) return { kind: "profile", username: prof[1].toLowerCase() };
  const tmp = /^\/t\/([A-Za-z0-9_-]{16,64})$/.exec(p);
  if (tmp) return { kind: "temp", token: tmp[1] };
  return { kind: "invalid" };
}

export const TEMP_QR_MS = 75_000;
