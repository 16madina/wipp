import { useCallback, useEffect, useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { RotateCcw } from "lucide-react-native";
import { wippSrc } from "../lib/assets";
import { CONFETTI_ANIMATION_ID, CONFETTI_MS, countdownText, findDesign, SURPRISE_REVEAL_PAUSE_MS, type Surprise } from "../lib/surprise";
import { colors } from "../theme";
import { Press } from "./ui";
import { ScratchFoil } from "./ScratchFoil";
import { GiftParcel } from "./GiftParcel";
import { SurpriseAnimOverlay } from "./SurpriseAnimOverlay";

const KIND_LABEL: Record<Surprise["surpriseType"], string> = {
  scratch: "Carte à gratter",
  countdown: "Compte à rebours",
  gift: "Message cadeau",
  confetti: "Confettis",
};

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

export function SurpriseReveal({ surprise, demo, onReveal, onPlayAnimation }: { surprise: Surprise; demo?: boolean; onReveal?: () => void; onPlayAnimation?: (id: string) => void }) {
  const scratch = surprise.surpriseType === "scratch";
  const confetti = surprise.surpriseType === "confetti";
  // Confetti has no parcel: the message is there at once. Already seen: no second rain when the chat reopens.
  const [phase, setPhase] = useState<Phase>(confetti ? "open" : "sealed");
  // Countdown on the real clock, from the moment the message was sent (the preview unlocks after 5 s).
  const unlockAt = useRef(
    demo || !surprise.sentAt ? Date.now() + (demo ? 5 : (surprise.surpriseOptions.countdown?.seconds ?? 0)) * 1000 : surprise.sentAt + (surprise.surpriseOptions.countdown?.seconds ?? 0) * 1000,
  ).current;
  const [left, setLeft] = useState(() => (surprise.surpriseType === "countdown" ? Math.max(0, Math.ceil((unlockAt - Date.now()) / 1000)) : 0));
  const [playing, setPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const started = useRef(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
  }, []);
  const finish = useCallback(() => setPlaying(false), []);
  const design = findDesign(surprise.surpriseType, surprise.designId);
  const foil = wippSrc(design?.art) ?? wippSrc("fx/surprise/carte.jpg");
  const cardW = 176;
  const cardH = 200;
  const { width: windowW } = useWindowDimensions();
  // Les visuels de carte sont au format paysage (~1584×993). Un cadre carré les recadre et coupe le ruban.
  const foilRatio = surprise.designId === "vip" ? 1536 / 1024 : 1584 / 993;
  const landscape = scratch && phase !== "sealed";
  const frame = Math.min(windowW, 430);
  // Compact in the chat: about 70 % of the conversation width.
  const openW = Math.max(220, Math.round((frame - 36) * 0.72));
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [foilReady, setFoilReady] = useState(false);
  const [round, setRound] = useState(0);

  function playChosenAnimation() {
    if (started.current) return;
    if (confetti) onPlayAnimation?.(CONFETTI_ANIMATION_ID);
    if (!surprise.animationId) return;
    started.current = true;
    // After the confetti rain, the animation the sender picked.
    revealTimer.current = setTimeout(() => {
      playAnimation();
    }, confetti ? CONFETTI_MS : SURPRISE_REVEAL_PAUSE_MS);
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

  // The parcel stays locked until the time is up; then the person opens it herself.
  useEffect(() => {
    if (surprise.surpriseType !== "countdown" || phase === "open" || left <= 0) return;
    const id = setTimeout(() => setLeft(Math.max(0, Math.ceil((unlockAt - Date.now()) / 1000))), 1000);
    return () => clearTimeout(id);
  }, [left, phase, surprise.surpriseType, unlockAt]);

  // Confetti: the rain falls the first time the message is seen.
  useEffect(() => {
    if (!confetti || surprise.opened) return;
    const id = setTimeout(() => {
      onReveal?.();
      playChosenAnimation();
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
            <Text style={{ fontSize: 20, color: colors.surpriseGoldDeep }}>{MOTIFS[surprise.designId ?? "heart"] ?? "♥"}</Text>
            <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 19, fontFamily: "Inter_600SemiBold", color: colors.surpriseInk, textAlign: "center" }}>
              {surprise.message}
            </Text>
            {phase === "open" ? (
              <Text style={{ marginTop: 6, fontSize: 10, color: "rgba(10,11,16,0.7)" }}>✨ Surprise découverte</Text>
            ) : null}
          </View>
        ) : null}

        {phase === "scratch" && scratch && foil && box ? (
          <ScratchFoil key={round} source={foil} width={box.w} height={box.h} onCleared={showMessage} onReady={() => setFoilReady(true)} />
        ) : null}

        {phase === "sealed" ? (
          <GiftParcel
            kindLabel={KIND_LABEL[surprise.surpriseType]}
            footer={
              surprise.surpriseType === "countdown" && left > 0 ? `S’ouvre dans ${countdownText(left)}` : "Touche pour ouvrir"
            }
            onPress={() => {
              if (surprise.surpriseType === "countdown" && left > 0) return;
              if (scratch) {
                setBox(null);
                setFoilReady(false);
                setPhase("scratch");
              } else showMessage();
            }}
          />
        ) : null}
      </View>
      {phase === "open" ? (
        <Press
          onPress={() => {
            if (playing) return;
            // Replay from the start: an unscratched card again (or the closed parcel).
            started.current = false;
            if (scratch) {
              // Same size, so keep the measured box and just mount a fresh, unscratched foil.
              setFoilReady(false);
              setRound((n) => n + 1);
              setPhase("scratch");
            } else if (confetti) playChosenAnimation();
            else setPhase("sealed");
          }}
          accessibilityLabel="Revoir la surprise"
          style={{ marginTop: 6, paddingHorizontal: 14, height: 30, borderRadius: 999, borderWidth: 1, borderColor: colors.surpriseGold, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <RotateCcw size={13} color={colors.surpriseGold} />
          <Text style={{ color: colors.surpriseGold, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Revoir</Text>
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
