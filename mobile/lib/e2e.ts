import * as SecureStore from 'expo-secure-store';
import {
  decryptText,
  deriveChatKey,
  encryptText,
  generateBundle,
  makeE2eEnvelope,
  parseMessageBody,
  type KeyBundle,
} from './e2e-crypto';
import { apiBase } from './api';
import { getStoredToken } from './session';

const IDENTITY_KEY = 'wipp-e2e-identity-v1';

async function authHeaders() {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const token = await getStoredToken();
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

export async function loadOrCreateIdentity(): Promise<KeyBundle> {
  const raw = await SecureStore.getItemAsync(IDENTITY_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as KeyBundle;
    } catch {
      /* regenerate */
    }
  }
  const bundle = await generateBundle();
  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(bundle));
  return bundle;
}

export async function publishIdentity(identity: KeyBundle) {
  const res = await fetch(`${apiBase()}/api/wipp/me/e2e-key`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ publicJwk: identity.publicJwk }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function ensureE2eReady() {
  const identity = await loadOrCreateIdentity();
  try {
    await publishIdentity(identity);
  } catch (err) {
    console.warn('[wipp] e2e publish', err);
  }
  return identity;
}

export async function encryptDmBody(
  identity: KeyBundle,
  peerPublicJwk: JsonWebKey,
  chatId: string,
  plaintext: string,
) {
  const key = await deriveChatKey(identity, peerPublicJwk, chatId);
  const blob = await encryptText(key, plaintext);
  return JSON.stringify(makeE2eEnvelope(blob, identity.publicJwk));
}

export async function decryptDmBody(
  identity: KeyBundle,
  chatId: string,
  body: string,
): Promise<{ text: string; encrypted: boolean } | { text: null; encrypted: true; failed: true } | { text: string; encrypted: false }> {
  const parsed = parseMessageBody(body);
  if (parsed.kind === 'plain') return { text: parsed.text, encrypted: false };
  try {
    const key = await deriveChatKey(identity, parsed.envelope.spk, chatId);
    const text = await decryptText(key, parsed.envelope);
    return { text, encrypted: true };
  } catch {
    return { text: null, encrypted: true, failed: true };
  }
}

export function previewLabel(body: string) {
  const parsed = parseMessageBody(body);
  return parsed.kind === 'e2e' ? '🔒 Message chiffré' : parsed.text;
}
