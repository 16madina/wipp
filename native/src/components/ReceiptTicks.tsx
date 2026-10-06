import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { Message } from "../lib/types";
import { useT } from "../lib/store";
import { colors } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const W = 16;
const H = 12;
const GREY = "rgba(160,168,184,0.95)";
/** The two dots sit on the top line; the smile arc runs underneath them. */
const LEFT = { x: 4.5, y: 4 };
const RIGHT = { x: 11.5, y: 4 };
const DOT_R = 1.9;
const SMILE = `M${LEFT.x - 0.5} 8.1 Q8 11.4 ${RIGHT.x + 0.5} 8.1`;
const SMILE_LEN = 10;

const LABELS = {
  fr: { sending: "Envoi en cours", sent: "Envoyé", delivered: "Reçu", read: "Lu", failed: "Échec d’envoi" },
  en: { sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed to send" },
} as const;

/**
 * WIPP message status (own messages only): • sending, ● sent, ● ● delivered,
 * WIPP Smile (gold dots + arc below) read, red ! failed. Vector-drawn, same on iOS and Android.
 */
export function ReceiptTicks({ status }: { status: Message["status"] }) {
  const t = useT();
  const lang = t("all") === "All" ? "en" : "fr";
  const label = LABELS[lang][status] ?? LABELS.fr.sent;

  // Animate grey → gold, then draw the smile, only when the status changes to "read" while visible.
  const wasRead = useRef(status === "read");
  const [animating, setAnimating] = useState(false);
  const tint = useRef(new Animated.Value(status === "read" ? 1 : 0)).current;
  const draw = useRef(new Animated.Value(status === "read" ? 1 : 0)).current;
  useEffect(() => {
    if (status === "read" && !wasRead.current) {
      wasRead.current = true;
      setAnimating(true);
      tint.setValue(0);
      draw.setValue(0);
      Animated.sequence([
        Animated.timing(tint, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(draw, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start(() => setAnimating(false));
    } else if (status !== "read") {
      wasRead.current = false;
    }
  }, [status, tint, draw]);

  const box = { marginLeft: 4, width: W, height: H } as const;

  if (status === "failed") {
    return (
      <View accessible accessibilityLabel={label} style={box}>
        <Svg width={W} height={H}>
          <Circle cx={8} cy={6} r={5.5} fill={colors.danger} />
          <Rect x={7.15} y={2.8} width={1.7} height={4.2} rx={0.85} fill="#fff" />
          <Circle cx={8} cy={8.75} r={0.95} fill="#fff" />
        </Svg>
      </View>
    );
  }

  if (status === "sending") {
    return (
      <View accessible accessibilityLabel={label} style={box}>
        <Svg width={W} height={H}>
          <Circle cx={8} cy={LEFT.y} r={1.3} fill={GREY} opacity={0.55} />
        </Svg>
      </View>
    );
  }

  if (status === "sent") {
    return (
      <View accessible accessibilityLabel={label} style={box}>
        <Svg width={W} height={H}>
          <Circle cx={8} cy={LEFT.y} r={DOT_R} fill={GREY} />
        </Svg>
      </View>
    );
  }

  const read = status === "read";
  const GOLD = colors.accent;
  const fill = animating ? tint.interpolate({ inputRange: [0, 1], outputRange: [GREY, GOLD] }) : read ? GOLD : GREY;
  return (
    <View accessible accessibilityLabel={label} style={box}>
      <Svg width={W} height={H}>
        <AnimatedCircle cx={LEFT.x} cy={LEFT.y} r={DOT_R} fill={fill as unknown as string} />
        <AnimatedCircle cx={RIGHT.x} cy={RIGHT.y} r={DOT_R} fill={fill as unknown as string} />
        {read ? (
          <AnimatedPath
            d={SMILE}
            stroke={GOLD}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${SMILE_LEN} ${SMILE_LEN}`}
            strokeDashoffset={(animating ? draw.interpolate({ inputRange: [0, 1], outputRange: [SMILE_LEN, 0] }) : 0) as unknown as number}
          />
        ) : null}
      </Svg>
    </View>
  );
}
