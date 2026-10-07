import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Keyboard, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Audio } from "expo-av";
import { ChevronLeft, ChevronUp, Lock, Mic, Pause, Play, Send, Trash2 } from "lucide-react-native";
import { haptic } from "../lib/haptics";
import { formatVoiceTime, LIVE_BARS, useVoiceRecorder, type VoiceTake } from "../lib/voice-recorder";
import { colors } from "../theme";
import { Press } from "./ui";

/** Slide this far left to cancel, this far up to lock (points). */
const CANCEL_X = 110;
const LOCK_Y = 80;
/** The big round button under the finger while holding. */
const BIG = 66;

/** Red dot that blinks while recording. */
function RecDot({ on }: { on: boolean }) {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!on) {
      blink.setValue(0.35);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.25, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, blink]);
  return <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, opacity: blink }} />;
}

/** Live shape of the voice: newest bar on the right. */
function LiveWave({ levels, paused }: { levels: number[]; paused: boolean }) {
  const bars = [...Array(Math.max(0, LIVE_BARS - levels.length)).fill(0), ...levels];
  return (
    <View style={{ flex: 1, height: 26, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 2, overflow: "hidden" }}>
      {bars.map((lv, i) => (
        <View key={i} style={{ width: 3, height: 3 + Math.round(lv * 21), borderRadius: 2, backgroundColor: paused ? colors.muted : colors.accent, opacity: lv ? 1 : 0.35 }} />
      ))}
    </View>
  );
}

/** Shape of the whole take (paused): fills with the listening progress. */
function TakeWave({ wave, progress }: { wave: string; progress: number }) {
  const bars = (wave || "3".repeat(32)).split("").map(Number);
  return (
    <View style={{ flex: 1, height: 26, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      {bars.map((d, i) => {
        const done = (i + 0.5) / bars.length <= progress;
        return <View key={i} style={{ width: 3, height: 3 + d * 2.3, borderRadius: 2, backgroundColor: done ? colors.accent : colors.muted, opacity: done ? 1 : 0.6 }} />;
      })}
    </View>
  );
}

/**
 * Microphone of the chat bar, WhatsApp style.
 * Hold: records — release sends, slide left cancels, slide up locks. Tap: records hands-free (locked).
 * Locked: a panel — the voice note on top (listen while paused, « 1 » = listened once), then delete · pause / resume · send.
 * While recording, the parent hides the other buttons (onActiveChange) and this takes the whole width.
 */
export function VoiceComposer({
  size,
  onSend,
  onActiveChange,
}: {
  size: number;
  onSend: (take: VoiceTake, opts: { viewOnce: boolean }) => void;
  onActiveChange: (active: boolean) => void;
}) {
  const [viewOnce, setViewOnce] = useState(false);
  const viewOnceRef = useRef(false);
  viewOnceRef.current = viewOnce;
  /** Choice frozen when « send » is pressed (the panel resets before the file is ready). */
  const sentViewOnce = useRef(false);
  const voice = useVoiceRecorder((take) => onSend(take, { viewOnce: sentViewOnce.current }));
  const [mode, setMode] = useState<"hold" | "locked" | null>(null);
  const modeRef = useRef<"hold" | "locked" | null>(null);
  const slideX = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(0)).current;
  const active = mode !== null || voice.phase !== "idle";
  const report = useRef(onActiveChange);
  report.current = onActiveChange;
  /** True while the microphone is starting (the recorder is still « idle » then). */
  const startingRef = useRef(false);

  // Listening while paused.
  const player = useRef<Audio.Sound | null>(null);
  const [pv, setPv] = useState({ playing: false, pos: 0, loading: false });
  function stopListening() {
    const s = player.current;
    player.current = null;
    void s?.unloadAsync().catch(() => undefined);
    setPv({ playing: false, pos: 0, loading: false });
  }
  async function toggleListen() {
    if (player.current) {
      const st = await player.current.getStatusAsync();
      if (st.isLoaded && st.isPlaying) await player.current.pauseAsync();
      else await player.current.playAsync();
      return;
    }
    setPv((p) => ({ ...p, loading: true }));
    const uri = await voice.listenUri();
    if (!uri) {
      setPv({ playing: false, pos: 0, loading: false });
      return;
    }
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, progressUpdateIntervalMillis: 80 });
    player.current = sound;
    setPv({ playing: true, pos: 0, loading: false });
    sound.setOnPlaybackStatusUpdate((st) => {
      if (!st.isLoaded) return;
      setPv({ playing: st.isPlaying, pos: st.positionMillis, loading: false });
      if (st.didJustFinish) {
        setPv({ playing: false, pos: 0, loading: false });
        void sound.setPositionAsync(0);
      }
    });
  }
  useEffect(() => () => stopListening(), []);

  useEffect(() => {
    report.current(active);
    if (!active) setViewOnce(false);
  }, [active]);

  // The recorder stopped by itself (15 min, microphone refused…): back to the normal bar.
  useEffect(() => {
    if (voice.phase === "idle" && modeRef.current && !startingRef.current) setBoth(null);
  }, [voice.phase]);

  function setBoth(next: "hold" | "locked" | null) {
    modeRef.current = next;
    setMode(next);
  }
  function resetSlide() {
    slideX.setValue(0);
    slideY.setValue(0);
  }
  function begin(next: "hold" | "locked") {
    Keyboard.dismiss();
    setBoth(next);
    haptic("select");
    startingRef.current = true;
    void voice.start().then((ok) => {
      startingRef.current = false;
      if (!ok) setBoth(null);
    });
  }
  function finish(send: boolean) {
    sentViewOnce.current = modeRef.current === "locked" && viewOnceRef.current;
    stopListening();
    setBoth(null);
    resetSlide();
    if (send) haptic("success");
    void voice.stop(send);
  }
  function cancel() {
    haptic("warn");
    finish(false);
  }
  function lock() {
    if (modeRef.current !== "hold") return;
    haptic("select");
    setBoth("locked");
    resetSlide();
  }
  function pauseOrResume() {
    haptic("select");
    if (voice.phase === "paused") {
      stopListening();
      void voice.resume();
    } else void voice.pause();
  }

  // Gestures are built once per mode (not on every timer tick: rebuilding them mid-touch could drop the finger).
  const actions = useRef({ begin, finish, cancel, lock });
  actions.current = { begin, finish, cancel, lock };
  const activeRef = useRef(active);
  activeRef.current = active;
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(170)
      .onStart(() => actions.current.begin("hold"))
      .onUpdate((e) => {
        if (modeRef.current !== "hold") return;
        slideX.setValue(Math.min(0, e.translationX));
        slideY.setValue(Math.min(0, e.translationY));
        if (e.translationX < -CANCEL_X) actions.current.cancel();
        else if (e.translationY < -LOCK_Y) actions.current.lock();
      })
      .onEnd(() => {
        if (modeRef.current === "hold") actions.current.finish(true);
      })
      .onFinalize(() => {
        // Touch interrupted (alert, incoming call…) while holding: send what was said.
        if (modeRef.current === "hold") actions.current.finish(true);
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(260)
      .onEnd((_e, success) => {
        if (success && !activeRef.current) actions.current.begin("locked");
      });
    return Gesture.Exclusive(pan, tap);
  }, [slideX, slideY]);

  const holding = mode === "hold";
  const locked = mode === "locked";
  const paused = voice.phase === "paused";
  const lastLevel = voice.levels[voice.levels.length - 1] ?? 0;

  // Hold: the hint follows the finger and fades towards « cancel »; the lock rises with it.
  const hintX = slideX.interpolate({ inputRange: [-CANCEL_X, 0], outputRange: [-CANCEL_X * 0.55, 0], extrapolate: "clamp" });
  const hintOpacity = slideX.interpolate({ inputRange: [-CANCEL_X, 0], outputRange: [0.15, 1], extrapolate: "clamp" });
  const bigX = slideX.interpolate({ inputRange: [-CANCEL_X, 0], outputRange: [-CANCEL_X * 0.7, 0], extrapolate: "clamp" });
  const bigY = slideY.interpolate({ inputRange: [-LOCK_Y, 0], outputRange: [-LOCK_Y * 0.7, 0], extrapolate: "clamp" });
  const lockY = slideY.interpolate({ inputRange: [-LOCK_Y, 0], outputRange: [-LOCK_Y * 0.45, 0], extrapolate: "clamp" });
  const lockGlow = slideY.interpolate({ inputRange: [-LOCK_Y, 0], outputRange: [1, 0.85], extrapolate: "clamp" });

  if (locked) {
    const total = voice.ms;
    return (
      <View style={{ flex: 1, marginBottom: 4, borderRadius: 22, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, gap: 12 }}>
        {/* The voice note */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 36 }}>
          {paused ? (
            <Press
              onPress={() => void toggleListen()}
              disabled={!voice.canListen || pv.loading}
              accessibilityLabel={pv.playing ? "Mettre l’écoute en pause" : "Écouter le message"}
              hitSlop={6}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy, opacity: voice.canListen ? 1 : 0.4 }}
            >
              {pv.playing ? <Pause size={17} color={colors.fg} fill={colors.fg} /> : <Play size={17} color={colors.fg} fill={colors.fg} style={{ marginLeft: 2 }} />}
            </Press>
          ) : (
            <RecDot on />
          )}
          {paused ? <TakeWave wave={voice.wave} progress={total ? pv.pos / total : 0} /> : <LiveWave levels={voice.levels} paused={false} />}
          <Text style={{ color: colors.fg, fontSize: 14, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"], minWidth: 38, textAlign: "right" }}>
            {formatVoiceTime(paused && (pv.playing || pv.pos > 0) ? pv.pos : total)}
          </Text>
          <Press
            onPress={() => setViewOnce((v) => !v)}
            accessibilityLabel={viewOnce ? "Message vocal éphémère : activé" : "Message vocal éphémère : désactivé"}
            hitSlop={6}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderStyle: viewOnce ? "solid" : "dashed",
              borderColor: viewOnce ? colors.accent : colors.muted,
              backgroundColor: viewOnce ? colors.accent : "transparent",
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: viewOnce ? colors.accentFg : colors.muted }}>1</Text>
          </Press>
        </View>
        {viewOnce ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: -6 }}>Éphémère : il pourra être écouté une seule fois.</Text> : null}
        {/* delete · pause / resume · send */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6 }}>
          <Press onPress={cancel} accessibilityLabel="Supprimer le message vocal" hitSlop={8} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={22} color={colors.danger} />
          </Press>
          <Press
            onPress={pauseOrResume}
            disabled={voice.phase === "starting"}
            accessibilityLabel={paused ? "Reprendre l’enregistrement" : "Mettre en pause"}
            hitSlop={8}
            style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: paused ? colors.danger : colors.fg }}
          >
            {paused ? <Mic size={22} color={colors.danger} /> : <Pause size={20} color={colors.fg} fill={colors.fg} />}
          </Press>
          <Press
            onPress={() => finish(true)}
            accessibilityLabel="Envoyer le message vocal"
            hitSlop={8}
            style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent }}
          >
            <Send size={21} color={colors.accentFg} />
          </Press>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: active ? 1 : undefined, flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
      {active ? (
        <View style={{ flex: 1, minHeight: 44, borderRadius: 22, backgroundColor: colors.surface2, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10, overflow: "hidden" }}>
          <RecDot on />
          <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"], minWidth: 40 }}>{formatVoiceTime(voice.ms)}</Text>
          <Animated.View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, opacity: hintOpacity, transform: [{ translateX: hintX }] }}>
            <ChevronLeft size={16} color={colors.muted} />
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 14 }}>Glisser pour annuler</Text>
          </Animated.View>
        </View>
      ) : null}

      <View style={{ width: size, height: size, marginBottom: 4, alignItems: "center", justifyContent: "center", overflow: "visible" }}>
        {holding ? (
          // Slide up to lock.
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: size + 34,
              width: 40,
              height: 84,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.hair,
              alignItems: "center",
              paddingTop: 10,
              gap: 6,
              opacity: lockGlow,
              transform: [{ translateY: lockY }],
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Lock size={18} color={colors.fg} />
            <ChevronUp size={18} color={colors.muted} />
          </Animated.View>
        ) : null}
        <GestureDetector gesture={gesture}>
          <View accessibilityRole="button" accessibilityLabel="Message vocal : maintenir pour enregistrer" style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
            <Mic size={Math.round(size * 0.55)} color={holding ? "transparent" : colors.fg} />
          </View>
        </GestureDetector>
        {holding ? (
          // Big round microphone under the finger: follows it and breathes with the voice.
          <Animated.View pointerEvents="none" style={{ position: "absolute", width: BIG, height: BIG, borderRadius: BIG / 2, alignItems: "center", justifyContent: "center", transform: [{ translateX: bigX }, { translateY: bigY }] }}>
            <View style={{ position: "absolute", width: BIG + 26, height: BIG + 26, borderRadius: (BIG + 26) / 2, backgroundColor: colors.accent, opacity: 0.18, transform: [{ scale: 0.85 + lastLevel * 0.35 }] }} />
            <View style={{ width: BIG, height: BIG, borderRadius: BIG / 2, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Mic size={30} color={colors.accentFg} />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
