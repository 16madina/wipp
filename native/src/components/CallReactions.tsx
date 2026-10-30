/**
 * Call reactions on screen: the animation on a participant's photo / tile, the collective effect,
 * the compact picker, and the « micro vedette » ring around whoever is speaking.
 * Nothing here touches the call itself (microphone, camera, sound).
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Press } from "./ui";
import { WippSticker } from "./WippSticker";
import { tr } from "../lib/tr";
import { REACTION_BY_ID, REACTIONS, useReactions, type ReactionDef, type ReactionId, saveReactionSettings } from "../lib/calls/reactions";

const GOLD = "#FFD84D";

/** One reaction playing once (final animation file, or the temporary placeholder). */
export function ReactionBurst({ def, size }: { def: ReactionDef; size: number }) {
  const reduce = useReactions((s) => s.reduceMotion);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: def.durationMs, easing: Easing.linear, useNativeDriver: true }).start();
  }, [t, def.durationMs]);
  const box = size * def.scale * (reduce ? 0.7 : 1);
  if (def.sticker) {
    return (
      <Animated.View pointerEvents="none" style={{ width: box, height: box, opacity: t.interpolate({ inputRange: [0, 0.06, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ scale: reduce ? 1 : t.interpolate({ inputRange: [0, 0.1, 0.18, 1], outputRange: [0.4, 1.12, 1, 1] }) }] }}>
        <WippSticker id={def.sticker} size={box} still={reduce} />
      </Animated.View>
    );
  }
  if (def.file != null) {
    return (
      <Animated.View pointerEvents="none" style={{ width: box, height: box, opacity: t.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }) }}>
        <Image source={def.file} style={{ width: box, height: box }} contentFit="contain" autoplay={!reduce} />
      </Animated.View>
    );
  }
  // Temporary placeholder (the Grok animation is not delivered yet).
  const scale = reduce ? 1 : t.interpolate({ inputRange: [0, 0.12, 0.22, 1], outputRange: [0.3, 1.25, 1, 1.05] });
  const rise = reduce ? 0 : t.interpolate({ inputRange: [0, 1], outputRange: [0, -box * 0.35] });
  const opacity = t.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ width: box, height: box, alignItems: "center", justifyContent: "center", opacity, transform: [{ translateY: rise }, { scale }] }}>
      <Text style={{ fontSize: box * 0.62, lineHeight: box * 0.8 }}>{def.emoji}</Text>
    </Animated.View>
  );
}

/** Reactions of one participant, drawn over their tile / photo (upper part: the face stays visible). */
export function ParticipantReactions({ identity, size }: { identity: string | null | undefined; size: number }) {
  const live = useReactions((s) => s.live);
  if (!identity) return null;
  const mine = live.filter((x) => x.from === identity).slice(-2);
  if (!mine.length) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: "4%" }}>
      {mine.map((x, i) => {
        const def = REACTION_BY_ID[x.r];
        return (
          <View key={x.key} style={{ position: "absolute", top: def.place === "around" ? "18%" : "2%", left: "50%", marginLeft: (-size * def.scale) / 2 + i * size * 0.25 }}>
            <ReactionBurst def={def} size={size} />
          </View>
        );
      })}
    </View>
  );
}

/** Collective effect: same reaction sent by several people at once. */
export function CollectiveReaction({ size }: { size: number }) {
  const collective = useReactions((s) => s.collective);
  if (!collective) return null;
  const def = REACTION_BY_ID[collective.r];
  const c = def.collective;
  if (!c) return null;
  const big: ReactionDef = { ...def, file: c.file, sticker: c.file != null ? undefined : c.sticker ?? def.sticker, durationMs: c.durationMs, scale: 1 };
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <ReactionBurst key={collective.at} def={big} size={size} />
      <Text style={{ marginTop: 6, color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 }}>{tr(c.label)}</Text>
    </View>
  );
}

/** Compact picker: 8 reactions in one sheet, one-hand friendly. */
export function ReactionPicker({ visible, onClose, onPick, bottomInset }: { visible: boolean; onClose: () => void; onPick: (id: ReactionId) => void; bottomInset: number }) {
  const reduce = useReactions((s) => s.reduceMotion);
  const sounds = useReactions((s) => s.sounds);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
        <Pressable onPress={() => undefined} style={{ marginHorizontal: 12, marginBottom: bottomInset + 110, backgroundColor: "rgba(14,19,32,0.97)", borderRadius: 24, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
            {REACTIONS.map((r) => (
              <Press
                key={r.id}
                accessibilityLabel={tr(r.label)}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPick(r.id);
                  onClose();
                }}
                style={{ width: "24%", alignItems: "center", paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)" }}
              >
                {r.sticker ? <WippSticker id={r.sticker} size={40} still /> : r.file != null ? <Image source={r.file} style={{ width: 40, height: 40 }} contentFit="contain" autoplay={false} /> : <Text style={{ fontSize: 30, lineHeight: 40 }}>{r.emoji}</Text>}
                <Text numberOfLines={1} style={{ color: "#fff", fontSize: 11, marginTop: 2, fontFamily: "Inter_500Medium" }}>{tr(r.label)}</Text>
              </Press>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Press onPress={() => void saveReactionSettings({ reduceMotion: !reduce })} style={{ flex: 1, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: reduce ? GOLD : "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: reduce ? "#000" : "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{tr("Réduire les animations")}</Text>
            </Press>
            <Press onPress={() => void saveReactionSettings({ sounds: !sounds })} style={{ flex: 1, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: sounds ? GOLD : "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: sounds ? "#000" : "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{sounds ? tr("Sons activés") : tr("Sons coupés")}</Text>
            </Press>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** « Micro vedette »: glowing ring around the photo of whoever is speaking, following their voice. */
export function SpeakingRing({ speaking, level, size, children }: { speaking: boolean; level?: number; size: number; children: React.ReactNode }) {
  const reduce = useReactions((s) => s.reduceMotion);
  const on = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(on, { toValue: speaking ? 1 : 0, duration: 260, useNativeDriver: true }).start();
  }, [speaking, on]);
  useEffect(() => {
    if (!speaking || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, reduce, pulse]);
  const voice = Math.min(1, Math.max(0, level ?? 0.4));
  const ring = size + 14;
  return (
    <View style={{ width: ring, height: ring, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 3,
          borderColor: GOLD,
          opacity: on,
          shadowColor: GOLD,
          shadowOpacity: 0.9,
          shadowRadius: 10,
          transform: [{ scale: Animated.add(1, Animated.multiply(pulse, 0.04 + 0.08 * voice)) }],
        }}
      />
      {children}
    </View>
  );
}

/** WIPP Moment: confetti, hearts and sparkles over the whole call for ~3 s (placeholder until the Grok file). */
const MOMENT_BITS = ["🎉", "💛", "✨", "🎊", "❤️", "✨", "🎉", "💖", "⭐️", "🎊", "✨", "💛"];
export function WippMoment({ width, height }: { width: number; height: number }) {
  const moment = useReactions((s) => s.moment);
  const reduce = useReactions((s) => s.reduceMotion);
  if (!moment) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height, zIndex: 60 }}>
      {MOMENT_BITS.slice(0, reduce ? 4 : MOMENT_BITS.length).map((bit, i) => (
        <MomentBit key={`${moment.at}-${i}`} bit={bit} i={i} width={width} height={height} reduce={reduce} />
      ))}
      <View style={{ position: "absolute", left: 0, right: 0, top: height * 0.4, alignItems: "center" }}>
        <Text style={{ color: GOLD, fontSize: 30, fontFamily: "Inter_800ExtraBold", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 8 }}>WIPP Moment</Text>
      </View>
    </View>
  );
}

function MomentBit({ bit, i, width, height, reduce }: { bit: string; i: number; width: number; height: number; reduce: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 2800, delay: (i % 4) * 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [t, i]);
  const x = ((i * 37) % 100) / 100;
  const fall = reduce ? 0 : t.interpolate({ inputRange: [0, 1], outputRange: [-60, height * (0.55 + ((i * 13) % 30) / 100)] });
  const spin = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${i % 2 ? 200 : -200}deg`] });
  const opacity = t.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.Text style={{ position: "absolute", left: x * (width - 40), top: reduce ? height * 0.3 : 0, fontSize: 34, opacity, transform: [{ translateY: fall }, { rotate: reduce ? "0deg" : spin }] }}>
      {bit}
    </Animated.Text>
  );
}

/** Raised hands, in order (organizer and moderators can give the floor). */
export function HandQueue({ hands, nameOf, canGive, onGive }: { hands: string[]; nameOf: (id: string) => string; canGive: boolean; onGive: (id: string) => void }) {
  if (!hands.length) return null;
  return (
    <View style={{ backgroundColor: "rgba(14,19,32,0.92)", borderRadius: 16, paddingVertical: 8, paddingHorizontal: 10, gap: 4, maxWidth: 220 }}>
      <Text style={{ color: GOLD, fontSize: 12, fontFamily: "Inter_700Bold" }}>✋ {tr("Mains levées")}</Text>
      {hands.slice(0, 6).map((id, i) => (
        <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: "#fff", fontSize: 13, width: 16, fontVariant: ["tabular-nums"] }}>{i + 1}.</Text>
          <Text numberOfLines={1} style={{ flex: 1, color: "#fff", fontSize: 13 }}>{nameOf(id)}</Text>
          {canGive ? (
            <Press onPress={() => onGive(id)} style={{ paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: GOLD, justifyContent: "center" }}>
              <Text style={{ color: "#000", fontSize: 11, fontFamily: "Inter_700Bold" }}>{tr("Parole")}</Text>
            </Press>
          ) : null}
        </View>
      ))}
      {hands.length > 6 ? <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>+{hands.length - 6}</Text> : null}
    </View>
  );
}
