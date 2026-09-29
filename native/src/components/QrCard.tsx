import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { qrGrid } from "../lib/qr";
import { colors } from "../theme";

export function QrCard({ value, size = 220, pad = 12 }: { value: string; size?: number; pad?: number }) {
  const grid = qrGrid(value);
  const n = grid.length;
  const qPad = 3;
  const dim = n + qPad * 2;
  const inner = Math.max(48, size - pad * 2);
  const mark = Math.round(inner * 0.18);

  return (
    <View style={{ width: size, height: size, padding: pad, borderRadius: 12, backgroundColor: colors.paper, overflow: "hidden" }}>
      <Svg width={inner} height={inner} viewBox={`0 0 ${dim} ${dim}`}>
        <Rect width={dim} height={dim} fill="#F7F9FC" />
        {grid.map((row, r) =>
          row.map((on, c) =>
            on ? (
              <Rect key={`${r}-${c}`} x={c + qPad} y={r + qPad} width={1} height={1} rx={0.15} fill="#0B1220" />
            ) : null,
          ),
        )}
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: (size - mark) / 2,
          top: (size - mark) / 2,
          width: mark,
          height: mark,
          borderRadius: 8,
          backgroundColor: colors.navy,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: colors.paper,
        }}
      >
        <Svg width={mark * 0.55} height={mark * 0.55} viewBox="0 0 64 64">
          <Circle cx="20" cy="32" r="6" fill="#F7F9FC" />
          <Circle cx="44" cy="32" r="6" fill="#FFD84D" />
          <Path d="M20 32c2.4 0 3.6 8 12 8s9.6-8 12-8" stroke="#F7F9FC" strokeWidth="3" fill="none" strokeLinecap="round" />
        </Svg>
      </View>
    </View>
  );
}
