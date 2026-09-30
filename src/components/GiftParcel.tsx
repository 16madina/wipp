import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Ellipse, Path, Rect } from "react-native-svg";
import { colors } from "../theme";
import { Press } from "./ui";

/** Petit paquet cadeau, entier dans la carte, avec un léger flottement. */
export function GiftParcel({ onPress }: { onPress: () => void }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const floatY = bob.interpolate({ inputRange: [0, 1], outputRange: [3, -7] });
  const tilt = bob.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] });
  const lidY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <Press onPress={onPress} style={{ flex: 1, backgroundColor: "#100c08" }} accessibilityLabel="Surprise">
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 8, paddingBottom: 6 }}>
        <Animated.View style={{ transform: [{ translateY: floatY }, { rotate: tilt }], alignItems: "center" }}>
          <Svg width={132} height={36} viewBox="0 0 132 36">
            <Ellipse cx={66} cy={28} rx={36} ry={6} fill="rgba(245,201,79,0.18)" />
            <Path d="M46 20c8-16 14-16 20 0" stroke="#F5C94F" strokeWidth={3.2} fill="none" />
            <Path d="M86 20c-8-16-14-16-20 0" stroke="#F5C94F" strokeWidth={3.2} fill="none" />
            <Ellipse cx={50} cy={16} rx={14} ry={9} fill="#E7C15A" />
            <Ellipse cx={82} cy={16} rx={14} ry={9} fill="#C9962E" />
            <Ellipse cx={66} cy={20} rx={7} ry={6} fill="#FFE58A" />
          </Svg>
          <Animated.View style={{ marginTop: -6, transform: [{ translateY: lidY }] }}>
            <Svg width={132} height={28} viewBox="0 0 132 28">
              <Rect x={24} y={6} width={84} height={20} rx={5} fill="#E8C56B" />
              <Rect x={24} y={6} width={84} height={7} rx={4} fill="#FFE7A3" />
              <Rect x={60} y={6} width={12} height={20} fill="#C9962E" />
            </Svg>
          </Animated.View>
          <Svg width={132} height={62} viewBox="0 0 132 62" style={{ marginTop: -2 }}>
            <Rect x={28} y={0} width={76} height={54} rx={6} fill="#1A140C" />
            <Rect x={28} y={0} width={76} height={54} rx={6} stroke="#F5C94F" strokeWidth={1.4} fill="none" />
            <Rect x={60} y={0} width={12} height={54} fill="#E8C56B" />
            <Rect x={28} y={22} width={76} height={11} fill="#C9962E" />
          </Svg>
        </Animated.View>
        <Text
          style={{
            marginTop: 2,
            fontFamily: "GreatVibes_400Regular",
            fontSize: 34,
            lineHeight: 40,
            color: colors.surpriseBright,
          }}
        >
          Surprise
        </Text>
      </View>
    </Press>
  );
}
