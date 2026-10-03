import { WIPP_WEB_ORIGIN } from "../firebase-config";
import { firebaseIdToken, waitForFirebaseUser } from "../firebase-phone";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "wipp-server-token";
let mem: string | null | undefined;

export async function getStoredWippToken(): Promise<string | null> {
  if (mem !== undefined) return mem;
  try {
    mem = await SecureStore.getItemAsync(TOKEN_KEY);
    return mem;
  } catch {
    mem = null;
    return null;
  }
}

export async function persistWippToken(token: string | null) {
  mem = token;
  try {
    if (!token) await SecureStore.deleteItemAsync(TOKEN_KEY);
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    /* web / unavailable */
  }
}

/** Bearer for /api/wipp — a fresh Firebase ID token after the persisted user is restored. */
export async function ensureWippApiToken(): Promise<string | null> {
  const user = await waitForFirebaseUser();
  if (!user) return null;
  return firebaseIdToken();
}

export async function wippApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await ensureWippApiToken();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(`${WIPP_WEB_ORIGIN}/api/wipp/${path.replace(/^\//, "")}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (!res.ok) {
    const err = new Error(data.message || data.error || `HTTP ${res.status}`) as Error & { code?: string; status?: number };
    err.code = data.error;
    err.status = res.status;
    throw err;
  }
  return data;
}
