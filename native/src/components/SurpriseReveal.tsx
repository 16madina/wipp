import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Text, useWindowDimensions, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { wippSrc } from "../lib/assets";
import { findDesign, surpriseKindArt, SURPRISE_REVEAL_PAUSE_MS, type Surprise } from "../lib/surprise";
import { colors } from "../theme";
import { Press } from "./ui";
import { ScratchFoil } from "./ScratchFoil";
import { GiftParcel } from "./GiftParcel";
import { SurpriseAnimOverlay } from "./SurpriseAnimOverlay";

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

type Phase = "sealed" | "scratch" | "open";

export function SurpriseReveal({ surprise, onReveal, onPlayAnimation }: { surprise: Surprise; demo?: boolean; onReveal?: () => void; onPlayAnimation?: (id: string) => void }) {
  const scratch = surprise.surpriseType === "scratch";
  const [phase, setPhase] = useState<Phase>("sealed");
  const [left, setLeft] = useState(surprise.surpriseOptions.countdown?.seconds ?? 10);
  const [playing, setPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const started = useRef(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
  }, []);
  const finish = useCallback(() => setPlaying(false), []);
  const art = wippSrc(surpriseKindArt[surprise.surpriseType]);
  const design = findDesign(surprise.surpriseType, surprise.designId);
  const foil = wippSrc(design?.art) ?? wippSrc("fx/surprise/carte.jpg");
  const cardW = 214;
  const cardH = 248;
  const { width: windowW } = useWindowDimensions();
  // Les visuels de carte sont au format paysage (~1584×993). Un cadre carré les recadre et coupe le ruban.
  const foilRatio = surprise.designId === "vip" ? 1536 / 1024 : 1584 / 993;
  const landscape = scratch && phase !== "sealed";
  const frame = Math.min(windowW, 430);
  const openW = Math.max(260, Math.round((frame - 36) * 0.94));
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [foilReady, setFoilReady] = useState(false);

  function playChosenAnimation() {
    if (!surprise.animationId || started.current) return;
    started.current = true;
    revealTimer.current = setTimeout(() => {
      playAnimation();
    }, SURPRISE_REVEAL_PAUSE_MS);
  }

  function playAnimation() {
    if (!surprise.animationId) return;
    if (onPlayAnimation) onPlayAnimation(surprise.animationId);
    else {
      setPlayKey((n) => n + 1);
      setPlaying(true);
    }
  }

  function showMessage() {
    if (phase === "open") return;
    setPhase("open");
    onReveal?.();
    playChosenAnimation();
  }

  useEffect(() => {
    if (surprise.surpriseType !== "countdown" || phase === "open") return;
    if (left <= 0) {
      showMessage();
      return;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left, phase, surprise.surpriseType]);

  const hint =
    surprise.surpriseType === "gift" ? "Touche pour ouvrir" : surprise.surpriseType === "scratch" ? "Touche pour ouvrir" : "Touche pour révéler";

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <View
        style={{
          width: landscape ? openW : cardW,
          maxWidth: landscape ? undefined : "100%",
          height: landscape ? openW / foilRatio : cardH,
          borderRadius: 18,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.surpriseLine,
          backgroundColor: phase === "sealed" ? colors.surpriseInk : colors.surprisePaper,
        }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          const h = e.nativeEvent.layout.height;
          if (w > 8 && h > 8) setBox((prev) => (prev && Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h }));
        }}
      >
        {phase === "open" || (phase === "scratch" && scratch && box && foilReady) ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 30, color: colors.surpriseGoldDeep }}>{MOTIFS[surprise.designId ?? "heart"] ?? "♥"}</Text>
            <Text style={{ marginTop: 8, fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.surpriseInk, textAlign: "center" }}>
              {surprise.message}
            </Text>
            {phase === "open" ? (
              <Text style={{ marginTop: 10, fontSize: 10, color: "rgba(10,11,16,0.7)" }}>✨ Surprise découverte</Text>
            ) : null}
          </View>
        ) : null}

        {phase === "scratch" && scratch && foil && box ? (
          <ScratchFoil source={foil} width={box.w} height={box.h} onCleared={showMessage} onReady={() => setFoilReady(true)} />
        ) : null}

        {phase === "sealed" ? (
          scratch ? (
            <GiftParcel
              onPress={() => {
                setBox(null);
                setFoilReady(false);
                setPhase("scratch");
              }}
            />
          ) : (
            <Press onPress={showMessage} style={{ flex: 1 }}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {art ? <Image source={art} style={{ width: 96, height: 96 }} contentFit="contain" /> : <Sparkles size={36} color={colors.surpriseBright} />}
                <Text style={{ marginTop: 8, fontFamily: "GreatVibes_400Regular", fontSize: 34, color: colors.surpriseBright }}>Surprise</Text>
                {surprise.surpriseType === "countdown" ? (
                  <Text style={{ marginTop: 4, fontSize: 22, fontFamily: "Inter_700Bold", color: colors.surpriseBright }}>
                    {left >= 3600
                      ? `${Math.floor(left / 3600)}:${String(Math.floor((left % 3600) / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`
                      : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
                  </Text>
                ) : (
                  <Text style={{ marginTop: 2, fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.surprisePaper }}>{hint}</Text>
                )}
              </View>
            </Press>
          )
        ) : null}
      </View>
      {phase === "open" && surprise.animationId ? (
        <Press
          onPress={() => {
            if (playing) return;
            playAnimation();
          }}
          accessibilityLabel="Rejouer l’animation de la surprise"
          style={{ marginTop: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Sparkles size={19} color={colors.surpriseGold} />
        </Press>
      ) : null}
      <SurpriseAnimOverlay
        animationId={playing ? surprise.animationId : null}
        playKey={playKey}
        onDone={finish}
      />
    </View>
  );
}
