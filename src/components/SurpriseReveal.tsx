import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Animated, Modal, Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { wippSrc } from "../lib/assets";
import {
  findAnimation,
  findDesign,
  surpriseKindArt,
  SURPRISE_ANIMATION_MS,
  SURPRISE_REVEAL_PAUSE_MS,
  type Surprise,
} from "../lib/surprise";
import { colors, layout } from "../theme";
import { Press } from "./ui";

const MOTIFS: Record<string, string> = {
  heart: "♥",
  stars: "✦",
  crown: "♛",
  neon: "♡",
  amour: "♥",
  rose: "♡",
  gold: "✦",
  mood: "☾",
  voyage: "✈",
  bff: "♡",
  crew: "★",
  fete: "✦",
  marbre: "◇",
  prestige: "♛",
  vip: "♔",
};

function AnimationOverlay({ animationId, onDone }: { animationId: string | null; onDone: () => void }) {
  const item = findAnimation(animationId);
  const src = item ? wippSrc(item.art) : undefined;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.35)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!item) return;
    opacity.setValue(0);
    scale.setValue(0.35);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.delay(Math.max(0, SURPRISE_ANIMATION_MS - 1020)),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
    const t = setTimeout(() => done.current(), SURPRISE_ANIMATION_MS + 80);
    return () => clearTimeout(t);
  }, [item?.id, opacity, scale]);

  if (!item || !src) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View pointerEvents="none" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={{ opacity, transform: [{ scale }], width: 280, height: 280 }}>
          <Image source={src} style={{ width: "100%", height: "100%" }} contentFit="contain" />
        </Animated.View>
      </View>
    </Modal>
  );
}

export function SurpriseReveal({ surprise, demo = false, onReveal }: { surprise: Surprise; demo?: boolean; onReveal?: () => void }) {
  const [open, setOpen] = useState(demo);
  const [left, setLeft] = useState(surprise.surpriseOptions.countdown?.seconds ?? 10);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const finish = useCallback(() => setPlaying(false), []);
  const art = wippSrc(surpriseKindArt[surprise.surpriseType]);
  const design = findDesign(surprise.surpriseType, surprise.designId);
  const foil = wippSrc(design?.art) ?? wippSrc("fx/surprise/carte.jpg");
  const anim = findAnimation(surprise.animationId);
  const animSrc = anim ? wippSrc(anim.art) : undefined;

  function playChosenAnimation() {
    if (!surprise.animationId || started.current) return;
    started.current = true;
    setTimeout(() => setPlaying(true), SURPRISE_REVEAL_PAUSE_MS);
  }

  function reveal() {
    if (open) return;
    setOpen(true);
    onReveal?.();
    playChosenAnimation();
  }

  useEffect(() => {
    if (demo) playChosenAnimation();
  }, [demo, surprise.animationId]);

  useEffect(() => {
    if (surprise.surpriseType !== "countdown" || open) return;
    if (left <= 0) {
      reveal();
      return;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left, open, surprise.surpriseType]);

  const hint =
    surprise.surpriseType === "gift" ? "Touche le cadeau pour l’ouvrir" : surprise.surpriseType === "scratch" ? "Touche pour gratter" : "Touche pour révéler";

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Press
        disabled={surprise.surpriseType === "countdown" && !open}
        onPress={reveal}
        style={{
          width: layout.surpriseCardWidth,
          maxWidth: "100%",
          height: layout.surpriseCardHeight,
          borderRadius: 17,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.surpriseLine,
          backgroundColor: open ? colors.surprisePaper : colors.surpriseInk,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? (
          <View style={{ paddingHorizontal: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 30, color: colors.surpriseGoldDeep }}>{MOTIFS[surprise.designId ?? "heart"] ?? "♥"}</Text>
            <Text style={{ marginTop: 8, fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.surpriseInk, textAlign: "center", fontStyle: "italic" }}>
              {surprise.message}
            </Text>
            <Text style={{ marginTop: 10, fontSize: 10, color: "rgba(10,11,16,0.7)" }}>✨ Surprise découverte</Text>
          </View>
        ) : (
          <View style={{ alignItems: "center", width: "100%", height: "100%", justifyContent: "center" }}>
            {surprise.surpriseType === "scratch" && foil ? (
              <Image source={foil} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" />
            ) : art ? (
              <Image source={art} style={{ width: 96, height: 96 }} contentFit="contain" />
            ) : (
              <Sparkles size={36} color={colors.surpriseBright} />
            )}
            {surprise.surpriseType === "countdown" ? (
              <Text style={{ marginTop: 8, fontSize: 28, fontFamily: "Inter_700Bold", color: colors.surpriseBright }}>
                {left >= 3600
                  ? `${Math.floor(left / 3600)}:${String(Math.floor((left % 3600) / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`
                  : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
              </Text>
            ) : (
              <Text style={{ marginTop: 8, fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.surprisePaper }}>{hint}</Text>
            )}
            <Text style={{ marginTop: 4, fontSize: 11, color: colors.surpriseSecondary }}>Un message t’attend</Text>
          </View>
        )}
      </Press>
      {open && surprise.animationId ? (
        <Press
          onPress={() => {
            if (playing) return;
            setPlaying(true);
          }}
          style={{ marginTop: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Sparkles size={19} color={colors.surpriseGold} />
        </Press>
      ) : null}
      {open && animSrc && !playing ? (
        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image source={animSrc} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" />
          <Text style={{ color: colors.surpriseBright, fontSize: 12 }}>Animation : {anim?.label}</Text>
        </View>
      ) : null}
      <AnimationOverlay animationId={playing ? surprise.animationId : null} onDone={finish} />
    </View>
  );
}
