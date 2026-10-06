import { Audio } from "expo-av";
import { cacheDirectory, EncodingType, getInfoAsync, writeAsStringAsync } from "expo-file-system/legacy";

const RATE = 16_000;

type ToneName = "dial" | "ringback" | "busy" | "incoming";

let token = 0;
let active: Audio.Sound | null = null;
const files = new Map<ToneName, string>();

function mix(freqs: number[], seconds: number, gain = 0.3) {
  const n = Math.floor(RATE * seconds);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    let sample = 0;
    for (const freq of freqs) sample += Math.sin((2 * Math.PI * freq * i) / RATE);
    const edge = Math.min(1, i / 140, (n - i) / 140);
    out[i] = Math.max(-32767, Math.min(32767, Math.round((sample / freqs.length) * gain * edge * 32767)));
  }
  return out;
}

function silence(seconds: number) {
  return new Int16Array(Math.floor(RATE * seconds));
}

function concat(parts: Int16Array[]) {
  const total = parts.reduce((n, part) => n + part.length, 0);
  const out = new Int16Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function wavBytes(samples: Int16Array) {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i]!, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function pattern(name: ToneName) {
  if (name === "dial") return mix([350, 440], 0.7, 0.22);
  if (name === "ringback") return concat([mix([440, 480], 2, 0.32), silence(4)]);
  if (name === "busy") return concat([mix([480, 620], 0.5, 0.3), silence(0.5)]);
  return concat([mix([440, 480], 0.4, 0.34), silence(0.2), mix([440, 480], 0.4, 0.34), silence(2)]);
}

async function uriFor(name: ToneName) {
  const cached = files.get(name);
  if (cached) return cached;
  const dir = cacheDirectory;
  if (!dir) return null;
  const uri = `${dir}wipp-tone-${name}.wav`;
  const info = await getInfoAsync(uri);
  if (!info.exists) {
    await writeAsStringAsync(uri, toBase64(wavBytes(pattern(name))), { encoding: EncodingType.Base64 });
  }
  files.set(name, uri);
  return uri;
}

async function unload() {
  const sound = active;
  active = null;
  if (!sound) return;
  try {
    await sound.stopAsync();
  } catch {
    /* already stopped */
  }
  try {
    await sound.unloadAsync();
  } catch {
    /* already released */
  }
}

export async function stopCallTones() {
  token += 1;
  await unload();
}

async function start(name: ToneName, loop: boolean) {
  const gen = ++token;
  await unload();
  if (gen !== token) return null;
  const uri = await uriFor(name);
  if (!uri || gen !== token) return null;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });
  const created = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, isLooping: loop, volume: 0.85 });
  if (gen !== token) {
    await created.sound.unloadAsync();
    return null;
  }
  active = created.sound;
  return created.sound;
}

/** Short dial tone, then the ringback the caller hears while the other phone rings. */
export async function playCallerWaiting() {
  const dial = await start("dial", false);
  if (!dial) return;
  const gen = token;
  dial.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded || !status.didJustFinish || gen !== token) return;
    void start("ringback", true);
  });
}

export async function playBusyTone() {
  await start("busy", true);
}

/** Incoming call with WIPP open: the official WIPP ringtone (loops until answered / ended). */
export async function playIncomingRing() {
  const gen = ++token;
  await unload();
  if (gen !== token) return;
  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false });
    const created = await Audio.Sound.createAsync(require("../../../assets/sounds/wipp-original.mp3"), { shouldPlay: true, isLooping: true, volume: 1 });
    if (gen !== token) {
      await created.sound.unloadAsync();
      return;
    }
    active = created.sound;
  } catch {
    // Fallback: the short synthesized tone.
    if (gen === token) await start("incoming", true);
  }
}
