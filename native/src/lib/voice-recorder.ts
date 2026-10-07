import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { Audio } from "expo-av";
import { deleteAsync } from "expo-file-system/legacy";

/** A finished voice message, ready to send. */
export type VoiceTake = {
  uri: string;
  durationMs: number;
  /** Shape of the voice: 32 levels 0–9, drawn as bars in the bubble. */
  wave: string;
};

export type VoicePhase = "idle" | "starting" | "recording" | "paused";

/** Small mono AAC file (≈ 0.5 Mo per minute), plays on iPhone, Android and the web. */
const OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
};

/** Shorter than this, the take is dropped (a slip of the finger, like WhatsApp). */
const MIN_MS = 800;
/** Safety stop: 15 minutes. */
const MAX_MS = 15 * 60_000;
/** Bars shown live while recording. */
export const LIVE_BARS = 40;

/** Microphone level in dB (-160…0) → 0…1. Normal speech sits around -35…-10 dB. */
function level(db: number) {
  return Math.max(0, Math.min(1, (db + 52) / 44));
}

/** Every level of the take → 32 digits 0–9. */
function toWave(levels: number[]) {
  const n = 32;
  if (!levels.length) return "3".repeat(n);
  let out = "";
  for (let i = 0; i < n; i++) {
    const from = Math.floor((i * levels.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / n));
    let peak = 0;
    for (let j = from; j < to && j < levels.length; j++) peak = Math.max(peak, levels[j] ?? 0);
    out += String(Math.round(peak * 9));
  }
  return out;
}

function askForMic(canAskAgain: boolean) {
  Alert.alert(
    "Micro désactivé",
    canAskAgain ? "Autorise le micro pour enregistrer un message vocal." : "Pour enregistrer un message vocal, autorise le micro pour WIPP dans Réglages.",
    canAskAgain
      ? [{ text: "OK" }]
      : [
          { text: "Annuler", style: "cancel" },
          { text: "Ouvrir Réglages", onPress: () => void Linking.openSettings() },
        ],
  );
}

/**
 * Voice messages, WhatsApp style: start / pause / resume / stop(send or delete).
 * `onTake` receives the finished message when it must be sent.
 */
export function useVoiceRecorder(onTake: (take: VoiceTake) => void) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [ms, setMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const rec = useRef<Audio.Recording | null>(null);
  const phaseRef = useRef<VoicePhase>("idle");
  const all = useRef<number[]>([]);
  const lastMs = useRef(0);
  /** Stop asked while the microphone was still starting: true = send, false = delete. */
  const pendingStop = useRef<boolean | null>(null);
  const take = useRef(onTake);
  take.current = onTake;

  const go = (next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const stop = useCallback(async (send: boolean) => {
    if (phaseRef.current === "idle") return;
    if (phaseRef.current === "starting") {
      pendingStop.current = send;
      return;
    }
    const recording = rec.current;
    rec.current = null;
    go("idle");
    setMs(0);
    setLevels([]);
    if (!recording) return;
    let uri: string | null = null;
    let durationMs = lastMs.current;
    try {
      const status = await recording.stopAndUnloadAsync();
      durationMs = Math.max(durationMs, status.durationMillis ?? 0);
      uri = recording.getURI();
    } catch {
      uri = recording.getURI();
    }
    void Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => undefined);
    if (send && uri && durationMs >= MIN_MS) {
      take.current({ uri, durationMs, wave: toWave(all.current) });
    } else if (uri && Platform.OS !== "web") {
      void deleteAsync(uri, { idempotent: true }).catch(() => undefined);
    }
  }, []);

  const start = useCallback(async () => {
    if (phaseRef.current !== "idle") return false;
    // The microphone already belongs to the call.
    const { useCallSession } = await import("./calls/session");
    if (useCallSession.getState().session && !["ended", "declined", "missed", "busy", "failed"].includes(useCallSession.getState().session!.phase)) {
      Alert.alert("Message vocal", "Impossible d’enregistrer pendant un appel.");
      return false;
    }
    go("starting");
    pendingStop.current = null;
    all.current = [];
    lastMs.current = 0;
    setMs(0);
    setLevels([]);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        go("idle");
        askForMic(perm.canAskAgain);
        return false;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        OPTIONS,
        (st) => {
          if (!st.isRecording) return;
          lastMs.current = st.durationMillis;
          setMs(st.durationMillis);
          if (typeof st.metering === "number") {
            const lv = level(st.metering);
            all.current.push(lv);
            setLevels((prev) => (prev.length >= LIVE_BARS ? [...prev.slice(1), lv] : [...prev, lv]));
          }
          if (st.durationMillis >= MAX_MS) void stop(true);
        },
        70,
      );
      rec.current = recording;
      go("recording");
      if (pendingStop.current !== null) {
        const send = pendingStop.current;
        pendingStop.current = null;
        void stop(send);
      }
      return true;
    } catch (err) {
      go("idle");
      void Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
      Alert.alert("Message vocal", err instanceof Error && /permission/i.test(err.message) ? "Le micro n’est pas autorisé." : "Le micro n’a pas pu démarrer. Réessaie.");
      return false;
    }
  }, [stop]);

  const pause = useCallback(async () => {
    if (phaseRef.current !== "recording" || !rec.current) return;
    try {
      await rec.current.pauseAsync();
      go("paused");
    } catch {
      /* keeps recording */
    }
  }, []);

  const resume = useCallback(async () => {
    if (phaseRef.current !== "paused" || !rec.current) return;
    try {
      await rec.current.startAsync();
      go("recording");
    } catch {
      /* stays paused */
    }
  }, []);

  // Leaving the conversation while recording: the take is deleted, the microphone is released.
  useEffect(() => () => void stop(false), [stop]);

  return { phase, ms, levels, start, stop, pause, resume };
}

/** 0:07, 1:24 … */
export function formatVoiceTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
