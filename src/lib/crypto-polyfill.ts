/**
 * Hermes n'expose pas WebCrypto. @noble et Realtime ont besoin de getRandomValues.
 * À importer avant tout module @noble.
 */
import { getRandomValues as expoGetRandomValues } from "expo-crypto";

const g = globalThis as typeof globalThis & { crypto?: Crypto };

if (!g.crypto || typeof g.crypto.getRandomValues !== "function") {
  const cryptoObj = (g.crypto ?? {}) as Crypto;
  (cryptoObj as { getRandomValues: Crypto["getRandomValues"] }).getRandomValues = ((array: ArrayBufferView) =>
    expoGetRandomValues(array as unknown as Uint8Array)) as Crypto["getRandomValues"];
  g.crypto = cryptoObj;
}

if (typeof g.crypto.randomUUID !== "function") {
  g.crypto.randomUUID = () => {
    const bytes = g.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}
