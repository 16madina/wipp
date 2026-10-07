/**
 * Local snapshot of the inbox so a cold start shows chats, last messages and photos at once,
 * before the server sync (which then refreshes everything).
 * Encrypted at rest (AES-256-GCM, key in the secure keychain/keystore); one account only.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { documentDirectory, deleteAsync, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy";
import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { b64, unb64 } from "./crypto";
import type { Chat, Message, User, Shop } from "./types";

const FILE = `${documentDirectory ?? ""}wipp-inbox-v1.bin`;
const KEY_NAME = "wipp-inbox-cache-key";
const MAX_PER_CHAT = 40;
const te = new TextEncoder();
const td = new TextDecoder();

export type InboxSnapshot = {
  v: 1;
  profileId: string;
  savedAt: number;
  chats: Chat[];
  messages: Record<string, Message[]>;
  users: Record<string, User>;
  meAvatar: string;
  /** Shops of the business chats (name, logo), so « Professionnel » chats look right at once. */
  shops?: Shop[];
};

async function cacheKey(): Promise<Uint8Array | null> {
  try {
    let raw = await SecureStore.getItemAsync(KEY_NAME);
    if (!raw) {
      raw = b64(randomBytes(32));
      await SecureStore.setItemAsync(KEY_NAME, raw, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    }
    return unb64(raw);
  } catch {
    return null;
  }
}

/** Local-only media URLs (blob:/data:/file:) are dropped: they do not survive a restart or are huge. */
function slim(m: Message): Message {
  const out = { ...m } as Record<string, unknown>;
  for (const k of ["imageUrl", "videoUrl", "audioUrl", "gifUrl"]) {
    const v = out[k];
    if (typeof v === "string" && /^(blob:|data:)/.test(v)) delete out[k];
  }
  delete out.progress;
  return out as Message;
}

export async function saveInboxSnapshot(input: Omit<InboxSnapshot, "v" | "savedAt">) {
  if (Platform.OS === "web" || !input.profileId) return;
  const key = await cacheKey();
  if (!key) return;
  const messages: Record<string, Message[]> = {};
  for (const c of input.chats) {
    const list = input.messages[c.id];
    if (list?.length) messages[c.id] = list.slice(-MAX_PER_CHAT).map(slim);
  }
  // Only the people of these chats (+ me), not the whole directory.
  const users: Record<string, User> = {};
  for (const [id, u] of Object.entries(input.users)) if (id === "me" || id.startsWith("srvuser:")) users[id] = u;
  const snap: InboxSnapshot = { v: 1, savedAt: Date.now(), ...input, messages, users };
  try {
    const iv = randomBytes(12);
    const ct = gcm(key, iv).encrypt(te.encode(JSON.stringify(snap)));
    await writeAsStringAsync(FILE, `${b64(iv)}.${b64(ct)}`);
  } catch {
    /* cache only */
  }
}

export async function loadInboxSnapshot(profileId: string): Promise<InboxSnapshot | null> {
  if (Platform.OS === "web" || !profileId) return null;
  try {
    const raw = await readAsStringAsync(FILE);
    const [ivB64, ctB64] = raw.split(".");
    const key = await cacheKey();
    if (!key || !ivB64 || !ctB64) return null;
    const snap = JSON.parse(td.decode(gcm(key, unb64(ivB64)).decrypt(unb64(ctB64)))) as InboxSnapshot;
    // Never show another account's inbox.
    return snap.v === 1 && snap.profileId === profileId ? snap : null;
  } catch {
    return null;
  }
}

export async function clearInboxSnapshot() {
  if (Platform.OS === "web") return;
  try {
    await deleteAsync(FILE, { idempotent: true });
  } catch {
    /* ignore */
  }
}
