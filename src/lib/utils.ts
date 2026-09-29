export function sixDigit() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export const APP_HOST = "wipp.me";
