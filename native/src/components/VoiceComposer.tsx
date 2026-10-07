import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Keyboard, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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

/**
 * Microphone of the chat bar, WhatsApp style.
 * Hold: records — release sends, slide left cancels, slide up locks. Tap: records hands-free (locked).
 * Locked: delete · timer · live wave · pause/resume · send.
 * While recording, the parent hides the other buttons (onActiveChange) and this bar takes the whole width.
 */
export function VoiceComposer({ size, onSend, onActiveChange }: { size: number; onSend: (take: VoiceTake) => void; onActiveChange: (active: boolean) => void }) {
  const voice = useVoiceRecorder(onSend);
  const [mode, setMode] = useState<"hold" | "locked" | null>(null);
  const modeRef = useRef<"hold" | "locked" | null>(null);
  const slideX = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(0)).current;
  const active = mode !== null || voice.phase !== "idle";
  const report = useRef(onActiveChange);
  report.current = onActiveChange;
  /** True while the microphone is starting (the recorder is still « idle » then). */
  const startingRef = useRef(false);

  useEffect(() => {
    report.current(active);
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

  // Gestures are built once per mode (not on every timer tick: rebuilding them mid-touch could drop the finger).
  const actions = useRef({ begin, finish, cancel, lock });
  actions.current = { begin, finish, cancel, lock };
  const activeRef = useRef(active);
  activeRef.current = active;
  const isLocked = mode === "locked";
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(170)
      .enabled(!isLocked)
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
        if (!success) return;
        if (modeRef.current === "locked") actions.current.finish(true);
        else if (!activeRef.current) actions.current.begin("locked");
      });
    return Gesture.Exclusive(pan, tap);
  }, [isLocked, slideX, slideY]);

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

  return (
    <View style={{ flex: active ? 1 : undefined, flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
      {active ? (
        <View
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: 22,
            backgroundColor: colors.surface2,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: locked ? 6 : 14,
            gap: 10,
            overflow: "hidden",
          }}
        >
          {locked ? (
            <Press onPress={cancel} accessibilityLabel="Supprimer le message vocal" hitSlop={6} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={20} color={colors.danger} />
            </Press>
          ) : null}
          <RecDot on={!paused} />
          <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"], minWidth: 40 }}>{formatVoiceTime(voice.ms)}</Text>
          {locked ? (
            <>
              <LiveWave levels={voice.levels} paused={paused} />
              <Press
                onPress={() => void (paused ? voice.resume() : voice.pause())}
                accessibilityLabel={paused ? "Reprendre l’enregistrement" : "Mettre en pause"}
                hitSlop={6}
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy }}
              >
                {paused ? <Play size={17} color={colors.danger} fill={colors.danger} /> : <Pause size={17} color={colors.fg} fill={colors.fg} />}
              </Press>
            </>
          ) : (
            <Animated.View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, opacity: hintOpacity, transform: [{ translateX: hintX }] }}>
              <ChevronLeft size={16} color={colors.muted} />
              <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 14 }}>Glisser pour annuler</Text>
            </Animated.View>
          )}
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
          <View
            accessibilityRole="button"
            accessibilityLabel={locked ? "Envoyer le message vocal" : "Message vocal : maintenir pour enregistrer"}
            style={{
              width: locked ? size + 4 : size,
              height: locked ? size + 4 : size,
              borderRadius: (size + 4) / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: locked ? colors.accent : "transparent",
            }}
          >
            {locked ? <Send size={Math.round(size * 0.48)} color={colors.accentFg} /> : <Mic size={Math.round(size * 0.55)} color={holding ? "transparent" : colors.fg} />}
          </View>
        </GestureDetector>
        {holding ? (
          // Big round microphone under the finger: follows it and breathes with the voice.
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: BIG,
              height: BIG,
              borderRadius: BIG / 2,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ translateX: bigX }, { translateY: bigY }],
            }}
          >
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
