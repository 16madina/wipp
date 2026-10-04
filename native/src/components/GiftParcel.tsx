import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors } from "../theme";
import { Press } from "./ui";

/**
 * Small glossy 3D-looking gift box: it floats and gives a little shake now and then,
 * with the kind of surprise written underneath.
 */
export function GiftParcel({ onPress, kindLabel, footer }: { onPress: () => void; kindLabel?: string; footer?: string }) {
  const bob = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    // A quick wiggle every few seconds, like something is moving inside.
    const wiggle = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        ...[1, -1, 0.7, -0.7, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 70, useNativeDriver: true })),
      ]),
    );
    float.start();
    wiggle.start();
    return () => {
      float.stop();
      wiggle.stop();
    };
  }, [bob, shake]);

  const floatY = bob.interpolate({ inputRange: [0, 1], outputRange: [2, -5] });
  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ["-8deg", "8deg"] });
  const lidY = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-3, 0, -3] });
  const shadow = bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] });

  return (
    <Press onPress={onPress} style={{ flex: 1, backgroundColor: "#100c08" }} accessibilityLabel={`Surprise${kindLabel ? ` : ${kindLabel}` : ""}`}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
        <Animated.View style={{ transform: [{ translateY: floatY }, { rotate }], alignItems: "center" }}>
          <Animated.View style={{ transform: [{ translateY: lidY }] }}>
            <Svg width={84} height={40} viewBox="0 0 84 40">
              <Defs>
                <LinearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFE9A8" />
                  <Stop offset="1" stopColor="#D9A93F" />
                </LinearGradient>
                <LinearGradient id="bow" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FF8FB0" />
                  <Stop offset="1" stopColor="#D23A6A" />
                </LinearGradient>
              </Defs>
              <Path d="M42 22 C30 4 18 8 24 18 C27 23 36 23 42 22 Z" fill="url(#bow)" />
              <Path d="M42 22 C54 4 66 8 60 18 C57 23 48 23 42 22 Z" fill="url(#bow)" />
              <Ellipse cx={42} cy={21} rx={5} ry={4.5} fill="#FF6E98" />
              <Rect x={8} y={22} width={68} height={16} rx={4} fill="url(#lid)" />
              <Rect x={36} y={22} width={12} height={16} fill="url(#bow)" />
            </Svg>
          </Animated.View>
          <Svg width={84} height={50} viewBox="0 0 84 50" style={{ marginTop: -2 }}>
            <Defs>
              <LinearGradient id="box" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#F7D27A" />
                <Stop offset="0.55" stopColor="#E0AE47" />
                <Stop offset="1" stopColor="#A9761F" />
              </LinearGradient>
              <LinearGradient id="ribbon" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FF7FA6" />
                <Stop offset="1" stopColor="#C42E5E" />
              </LinearGradient>
            </Defs>
            <Rect x={12} y={0} width={60} height={46} rx={5} fill="url(#box)" />
            <Rect x={12} y={0} width={14} height={46} rx={5} fill="rgba(255,255,255,0.18)" />
            <Rect x={36} y={0} width={12} height={46} fill="url(#ribbon)" />
            <Rect x={12} y={0} width={60} height={5} fill="rgba(0,0,0,0.18)" />
          </Svg>
        </Animated.View>
        <Animated.View style={{ marginTop: 2, width: 46, height: 5, borderRadius: 23, backgroundColor: "rgba(245,201,79,0.10)", transform: [{ scaleX: shadow }] }} />
        <Text style={{ marginTop: 4, fontFamily: "GreatVibes_400Regular", fontSize: 28, lineHeight: 32, color: colors.surpriseBright }}>Surprise</Text>
        {kindLabel ? <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.surprisePaper }}>{kindLabel}</Text> : null}
        {footer ? <Text style={{ marginTop: 2, fontSize: 11, color: "rgba(255,240,210,0.6)" }}>{footer}</Text> : null}
      </View>
    </Press>
  );
}
