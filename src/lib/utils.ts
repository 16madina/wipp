import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function sixDigit() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function qrToken(kind: string) {
  return `${kind}-${Math.random().toString(36).slice(2, 8)}`;
}

export const APP_HOST = "wipp.me";

export function appLink(path = "") {
  const p = path.replace(/^\//, "");
  return p ? `${APP_HOST}/${p}` : APP_HOST;
}
