import { Platform } from "react-native";

type NativeTrim = {
  materialize: (assetId: string) => Promise<{ uri: string; duration: number; ext?: string; bytes?: number }>;
  trim: (uri: string, start: number, end: number) => Promise<{ uri: string; duration: number; ext?: string; bytes?: number }>;
  concatAudio?: (uris: string[]) => Promise<{ uri: string; duration: number }>;
};

/** iPhone: voice parts can be joined into one file (pause → listen → resume). */
export function isAudioJoinAvailable() {
  return typeof native()?.concatAudio === "function";
}

/** Joins voice message parts, in order, into one .m4a file. */
export async function joinAudioParts(uris: string[]) {
  const mod = native();
  if (!mod?.concatAudio) throw new Error("audio_join_unavailable");
  return mod.concatAudio(uris);
}

function native(): NativeTrim | null {
  if (Platform.OS !== "ios") return null;
  try {
    const { requireNativeModule } = require("expo-modules-core") as {
      requireNativeModule: (name: string) => NativeTrim;
    };
    return requireNativeModule("WippVideoTrim");
  } catch {
    return null;
  }
}

export function isVideoTrimAvailable() {
  return native() != null;
}

/** Copies a Photos video into the app cache so playback and export use a real file. */
export async function materializeLibraryVideo(assetId: string) {
  const mod = native();
  if (!mod) throw new Error("video_prepare_unavailable");
  return mod.materialize(assetId);
}

/** Writes a new file containing only [start, end] seconds. */
export async function trimVideoSegment(uri: string, start: number, end: number) {
  const mod = native();
  if (!mod) throw new Error("video_trim_unavailable");
  if (!(end > start) || end - start > 60.25) throw new Error("video_trim_range");
  return mod.trim(uri, start, end);
}

/* ───────── Video Studio ───────── */

type StudioNative = {
  exportProject: (spec: unknown) => Promise<{ uri: string; duration: number; ext?: string; bytes?: number }>;
  cancelExport: () => Promise<void>;
  studioCapabilities?: () => { speed: boolean };
  addListener?: (event: string, cb: (e: { progress: number }) => void) => { remove: () => void };
};

function studioNative(): StudioNative | null {
  try {
    const { requireNativeModule } = require("expo-modules-core") as { requireNativeModule: (name: string) => StudioNative };
    const mod = requireNativeModule("WippVideoTrim");
    return typeof mod.exportProject === "function" ? mod : null;
  } catch {
    return null;
  }
}

/** The phone has the Studio export engine (needs the app version that includes it). */
export function isStudioAvailable() {
  return studioNative() != null;
}

/** What the engine on this phone can do (speed is iPhone-only for now). */
export function studioCapabilities(): { speed: boolean } {
  const mod = studioNative();
  if (!mod) return { speed: false };
  return mod.studioCapabilities ? mod.studioCapabilities() : { speed: Platform.OS === "ios" };
}

/** Makes the final video from a Studio project. Sources are never changed. */
export async function exportStudioProject(spec: unknown, onProgress?: (p: number) => void) {
  const mod = studioNative();
  if (!mod) throw new Error("studio_unavailable");
  const sub = onProgress && mod.addListener ? mod.addListener("onStudioProgress", (e) => onProgress(Math.max(0, Math.min(1, e.progress)))) : null;
  try {
    return await mod.exportProject(spec);
  } finally {
    sub?.remove();
  }
}

export function cancelStudioExport() {
  return studioNative()?.cancelExport();
}
