import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Audio } from "expo-av";
import { Mic, Send, Trash2, Lock } from "lucide-react-native";
import { haptic } from "../lib/haptics";
import { colors } from "../theme";
import { Press } from "./ui";

type Rec = {
  uri: string;
  durationMs: number;
};

export function VoiceHoldButton({
  size,
  onSend,
}: {
  size: number;
  onSend: (rec: Rec) => void;
}) {
  const cancelRef = useRef(false);
  const lockedRef = useRef(false);
  const recording = useRef<Audio.Recording | null>(null);
  const [active, setActive] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ms, setMs] = useState(0);
  const [cancel, setCancel] = useState(false);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
      void recording.current?.stopAndUnloadAsync();
    };
  }, []);

  async function begin() {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) return;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    recording.current = rec;
    started.current = Date.now();
    cancelRef.current = false;
    lockedRef.current = false;
    setActive(true);
    setCancel(false);
    setLocked(false);
    setMs(0);
    haptic("select");
    tick.current = setInterval(() => setMs(Date.now() - started.current), 80);
  }

  async function finish(send: boolean) {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    const rec = recording.current;
    recording.current = null;
    setActive(false);
    setLocked(false);
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      const durationMs = Date.now() - started.current;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (send && uri && durationMs > 400) onSend({ uri, durationMs });
    } catch {
      /* ignore */
    }
  }

  const setCancelJS = (v: boolean) => {
    cancelRef.current = v;
    setCancel(v);
  };
  const setLockedJS = (v: boolean) => {
    lockedRef.current = v;
    setLocked(v);
  };
  const beginJS = () => {
    void begin();
  };
  const endJS = () => {
    if (lockedRef.current) return;
    void finish(!cancelRef.current);
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      runOnJS(beginJS)();
    })
    .onUpdate((e) => {
      runOnJS(setCancelJS)(e.translationX < -70);
      if (e.translationY < -70) runOnJS(setLockedJS)(true);
    })
    .onEnd(() => {
      runOnJS(endJS)();
    });

  if (active) {
    const bars = Array.from({ length: 16 }, (_, i) => 4 + ((ms / 90 + i * 3) % 14));
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, minHeight: size }}>
        <Press onPress={() => void finish(false)} accessibilityLabel="Annuler">
          <Trash2 size={20} color={colors.danger} />
        </Press>
        {locked ? <Lock size={16} color={colors.accent} /> : null}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 22 }}>
          {bars.map((h, i) => (
            <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: cancel ? colors.danger : colors.accent }} />
          ))}
        </View>
        <Text style={{ color: cancel ? colors.danger : colors.fg, fontSize: 13, minWidth: 40 }}>
          {cancel ? "Annuler" : `${Math.floor(ms / 1000)}s`}
        </Text>
        {locked ? (
          <Press onPress={() => void finish(true)}>
            <Send size={18} color={colors.accentFg} />
          </Press>
        ) : null}
      </View>
    );
  }

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Mic size={Math.round(size * 0.55)} color={colors.fg} />
      </View>
    </GestureDetector>
  );
}
