import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

export function WippMark({
  size = 56,
  invert,
}: {
  size?: number;
  invert?: boolean;
}) {
  const face = invert ? "#0B1220" : "#F7F9FC";
  const smile = invert ? "#0B1220" : "#FFD84D";
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx="32" fill={invert ? "#FFD84D" : "#0B1220"} />
      <Circle cx="22" cy="27" r="4.4" fill={face} />
      <Circle cx="42" cy="27" r="4.4" fill={face} />
      <Path
        d="M18 36c4.8 9.5 23.2 9.5 28 0"
        stroke={smile}
        strokeWidth="3.6"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function WippWordmark({ size = 22, color = colors.fg }: { size?: number; color?: string }) {
  const w = size * 2.96;
  return (
    <Svg width={w} height={size} viewBox="0 0 172 58">
      <Path
        d="M13 14c0 0-1 24 12.5 24 10.5 0 13-16.5 16.5-16.5S48 38 58.5 38C73 38 72 14 72 14"
        fill="none"
        stroke={color}
        strokeWidth="10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M88 23.5v18" fill="none" stroke={color} strokeWidth="10.5" strokeLinecap="round" />
      <Path d="M108 12v38" fill="none" stroke={color} strokeWidth="10.5" strokeLinecap="round" />
      <Path
        d="M108 16.5c18.5 0 23 4.5 23 12.5s-4.5 12.5-23 12.5"
        fill="none"
        stroke={color}
        strokeWidth="10.5"
        strokeLinecap="round"
      />
      <Path d="M142 12v38" fill="none" stroke={color} strokeWidth="10.5" strokeLinecap="round" />
      <Path
        d="M142 16.5c18.5 0 23 4.5 23 12.5s-4.5 12.5-23 12.5"
        fill="none"
        stroke={color}
        strokeWidth="10.5"
        strokeLinecap="round"
      />
      <Circle cx="88" cy="12" r="5.8" fill={colors.accent} />
      <Path
        d="M20 52c32 8 98 8 132 0"
        stroke={colors.accent}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function WippPhonesGlyph({ size = 28, color = colors.navy }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x="8" y="15" width="18" height="36" rx="4" stroke={color} strokeWidth="1.7" transform="rotate(14 17 33)" />
      <Rect x="38" y="15" width="18" height="36" rx="4" stroke={color} strokeWidth="1.7" transform="rotate(-14 47 33)" />
      <Path d="M29.4 31c1.15 1.5 1.15 3.9 0 5.4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M32.4 29c1.6 2 1.6 6 0 8" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M35.5 27.2c2 2.4 2 7.6 0 10" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
    </Svg>
  );
}

/** Deux téléphones qui se rapprochent — même animation que le web (`wipp-approach-l/r`). */
export function TouchHero({ width = 92, height = 78 }: { width?: number; height?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const leftStyle = {
    transform: [
      { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, 7] }) },
      { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["-16deg", "-7deg"] }) },
    ],
  };
  const rightStyle = {
    transform: [
      { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
      { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["16deg", "7deg"] }) },
    ],
  };
  return (
    <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: width * 0.72,
          height: height * 0.72,
          borderRadius: 999,
          backgroundColor: "rgba(255,216,77,0.28)",
        }}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 4,
            width: 38,
            height: 68,
            borderRadius: 8,
            backgroundColor: "#070b12",
            borderWidth: 1.4,
            borderColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
          },
          leftStyle,
        ]}
      >
        <Text style={{ color: colors.accent, fontSize: 7, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.4 }}>WIPP</Text>
      </Animated.View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2, zIndex: 2 }}>
        <View style={{ width: 4, height: 7, borderRightWidth: 1.4, borderTopWidth: 1.4, borderBottomWidth: 1.4, borderColor: colors.accent, borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />
        <View style={{ width: 4, height: 11, borderRightWidth: 1.4, borderTopWidth: 1.4, borderBottomWidth: 1.4, borderColor: colors.accent, borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />
        <View style={{ width: 4, height: 15, borderRightWidth: 1.4, borderTopWidth: 1.4, borderBottomWidth: 1.4, borderColor: colors.accent, borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />
      </View>
      <Animated.View
        style={[
          {
            position: "absolute",
            right: 4,
            width: 38,
            height: 68,
            borderRadius: 8,
            backgroundColor: "#070b12",
            borderWidth: 1.4,
            borderColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
          },
          rightStyle,
        ]}
      >
        <Text style={{ color: colors.accent, fontSize: 7, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.4 }}>WIPP</Text>
      </Animated.View>
    </View>
  );
}
