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

type Part = { uri: string; ms: number };

/**
 * Voice messages, WhatsApp style.
 * iPhone: each pause closes the current part (so it can be listened to), resume records a new part,
 * and the parts are joined into one file when sending. Elsewhere: a plain pause, no listening before sending.
 * `onTake` receives the finished message when it must be sent.
 */
export function useVoiceRecorder(onTake: (take: VoiceTake) => void) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [ms, setMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [wave, setWave] = useState("");
  const rec = useRef<Audio.Recording | null>(null);
  const phaseRef = useRef<VoicePhase>("idle");
  const parts = useRef<Part[]>([]);
  const doneMs = useRef(0);
  const currentMs = useRef(0);
  const all = useRef<number[]>([]);
  /** Stop asked while the microphone was still starting: true = send, false = delete. */
  const pendingStop = useRef<boolean | null>(null);
  const take = useRef(onTake);
  take.current = onTake;
  const joinable = useRef<boolean | null>(null);

  const go = (next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const canJoin = () => {
    if (joinable.current === null) {
      try {
        joinable.current = (require("wipp-video-trim") as typeof import("wipp-video-trim")).isAudioJoinAvailable();
      } catch {
        joinable.current = false;
      }
    }
    return joinable.current;
  };
  const drop = (list: Part[]) => {
    if (Platform.OS === "web") return;
    for (const p of list) void deleteAsync(p.uri, { idempotent: true }).catch(() => undefined);
  };

  /** Closes the part being recorded and keeps it. */
  const closePart = async () => {
    const recording = rec.current;
    rec.current = null;
    if (!recording) return;
    let partMs = currentMs.current;
    try {
      const status = await recording.stopAndUnloadAsync();
      partMs = Math.max(partMs, status.durationMillis ?? 0);
    } catch {
      /* the file may still be usable */
    }
    const uri = recording.getURI();
    if (uri && partMs > 150) parts.current.push({ uri, ms: partMs });
    doneMs.current += partMs;
    currentMs.current = 0;
  };

  /** Opens a new part (first one, or after a pause). */
  const openPart = async () => {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      OPTIONS,
      (st) => {
        if (!st.isRecording) return;
        currentMs.current = st.durationMillis;
        const total = doneMs.current + st.durationMillis;
        setMs(total);
        if (typeof st.metering === "number") {
          const lv = level(st.metering);
          all.current.push(lv);
          setLevels((prev) => (prev.length >= LIVE_BARS ? [...prev.slice(1), lv] : [...prev, lv]));
        }
        if (total >= MAX_MS) void stop(true);
      },
      70,
    );
    rec.current = recording;
  };

  const stop = useCallback(async (send: boolean) => {
    if (phaseRef.current === "idle") return;
    if (phaseRef.current === "starting") {
      pendingStop.current = send;
      return;
    }
    go("idle");
    await closePart();
    const list = parts.current;
    const total = doneMs.current;
    const shape = toWave(all.current);
    parts.current = [];
    doneMs.current = 0;
    setMs(0);
    setLevels([]);
    setWave("");
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => undefined);
    if (!send || total < MIN_MS || !list.length) {
      drop(list);
      return;
    }
    let uri = list[0]!.uri;
    if (list.length > 1) {
      try {
        const { joinAudioParts } = require("wipp-video-trim") as typeof import("wipp-video-trim");
        uri = (await joinAudioParts(list.map((p) => p.uri))).uri;
        drop(list);
      } catch {
        Alert.alert("Message vocal", "Le message n’a pas pu être assemblé. Réessaie.");
        drop(list);
        return;
      }
    }
    take.current({ uri, durationMs: total, wave: shape });
  }, []);

  const start = useCallback(async () => {
    if (phaseRef.current !== "idle") return false;
    // The microphone already belongs to the call.
    const { useCallSession } = await import("./calls/session");
    const call = useCallSession.getState().session;
    if (call && !["ended", "declined", "missed", "busy", "failed"].includes(call.phase)) {
      Alert.alert("Message vocal", "Impossible d’enregistrer pendant un appel.");
      return false;
    }
    go("starting");
    pendingStop.current = null;
    parts.current = [];
    doneMs.current = 0;
    currentMs.current = 0;
    all.current = [];
    setMs(0);
    setLevels([]);
    setWave("");
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        go("idle");
        askForMic(perm.canAskAgain);
        return false;
      }
      await openPart();
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
      if (canJoin()) await closePart();
      else await rec.current.pauseAsync();
      setWave(toWave(all.current));
      go("paused");
      void Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => undefined);
    } catch {
      /* keeps recording */
    }
  }, []);

  const resume = useCallback(async () => {
    if (phaseRef.current !== "paused") return;
    try {
      if (rec.current) {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        await rec.current.startAsync();
      } else {
        await openPart();
      }
      go("recording");
    } catch {
      /* stays paused */
    }
  }, []);

  /** Paused (iPhone): one playable file of everything said so far, or null. */
  const listenUri = useCallback(async () => {
    if (phaseRef.current !== "paused" || rec.current || !parts.current.length) return null;
    if (parts.current.length === 1) return parts.current[0]!.uri;
    try {
      const { joinAudioParts } = require("wipp-video-trim") as typeof import("wipp-video-trim");
      const joined = await joinAudioParts(parts.current.map((p) => p.uri));
      const old = parts.current;
      parts.current = [{ uri: joined.uri, ms: doneMs.current }];
      drop(old);
      return joined.uri;
    } catch {
      return null;
    }
  }, []);

  // Leaving the conversation while recording: the take is deleted, the microphone is released.
  useEffect(() => () => void stop(false), [stop]);

  return { phase, ms, levels, wave, canListen: phase === "paused" && canJoin(), start, stop, pause, resume, listenUri };
}

/** 0:07, 1:24 … */
export function formatVoiceTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
