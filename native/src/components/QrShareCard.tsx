import { forwardRef, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Image as SvgImage, Path, Rect, Text as SvgText } from "react-native-svg";
import { qrGrid } from "../lib/qr";

/** Design size (viewBox). The card is laid out at 2× and exported as-is (× screen scale = sharp image). */
const W = 360;
const H = 540;
const LAYOUT_SCALE = 2;

export type QrShareCardHandle = {
  /** PNG of the card, base64 without the data: prefix. */
  toBase64: () => Promise<string>;
};

/**
 * Image shared or saved from "Mon WIPP": logo, name, @pseudo, the permanent QR and the link written
 * underneath (so it can be typed or tapped where a QR cannot be long-pressed, e.g. WhatsApp).
 * Always in WIPP brand colours, whatever the app theme.
 */
export const QrShareCard = forwardRef<QrShareCardHandle, { value: string; name: string; username: string }>(function QrShareCard(
  { value, name, username },
  ref,
) {
  const svg = useRef<Svg & { toDataURL?: (cb: (b64: string) => void, opts?: { width: number; height: number }) => void }>(null);
  useImperativeHandle(ref, () => ({
    toBase64: () =>
      new Promise<string>((resolve, reject) => {
        const node = svg.current;
        if (!node?.toDataURL) return reject(new Error("export_unavailable"));
        // No size option: iOS would draw the 360×480 card in a corner of a bigger empty canvas.
        node.toDataURL((b64) => resolve(b64.replace(/^data:image\/png;base64,/, "")));
      }),
  }));

  const grid = qrGrid(value);
  const n = grid.length;
  const qrBox = 260;
  const qrX = (W - qrBox) / 2;
  const qrY = 156;
  const pad = 18;
  const cell = (qrBox - pad * 2) / n;
  const link = `wippapp.com/@${username}`;
  const mark = 48;

  return (
    // Drawn off screen: only exported, never shown.
    <View pointerEvents="none" style={{ position: "absolute", left: -10_000, top: 0, width: W * LAYOUT_SCALE, height: H * LAYOUT_SCALE }}>
      <Svg ref={svg} width={W * LAYOUT_SCALE} height={H * LAYOUT_SCALE} viewBox={`0 0 ${W} ${H}`}>
        <Rect width={W} height={H} fill="#0b1220" />
        
        <SvgImage href={require("../../assets/wipp-logo.png")} x={(W - 120) / 2} y={20} width={120} height={49} preserveAspectRatio="xMidYMid meet" />
        <SvgText x={W / 2} y={104} fill="#f7f9fc" fontSize={26} fontWeight="700" fontFamily="Inter_700Bold" textAnchor="middle">
          {name.length > 26 ? `${name.slice(0, 25)}…` : name}
        </SvgText>
        <SvgText x={W / 2} y={134} fill="#ffd84d" fontSize={19} fontWeight="600" fontFamily="Inter_600SemiBold" textAnchor="middle">
          @{username}
        </SvgText>
        <Rect x={qrX} y={qrY} width={qrBox} height={qrBox} rx={18} fill="#f7f9fc" />
        <G>
          {grid.map((row, r) =>
            row.map((on, c) =>
              on ? <Rect key={`${r}-${c}`} x={qrX + pad + c * cell} y={qrY + pad + r * cell} width={cell + 0.2} height={cell + 0.2} fill="#0b1220" /> : null,
            ),
          )}
        </G>
        {/* WIPP smile in the middle of the QR (error correction keeps it readable). */}
        <Rect x={W / 2 - mark / 2} y={qrY + qrBox / 2 - mark / 2} width={mark} height={mark} rx={9} fill="#0b1220" stroke="#f7f9fc" strokeWidth={3} />
        <Circle cx={W / 2 - 8} cy={qrY + qrBox / 2 - 4} r={3.6} fill="#f7f9fc" />
        <Circle cx={W / 2 + 8} cy={qrY + qrBox / 2 - 4} r={3.6} fill="#ffd84d" />
        <Path
          d={`M${W / 2 - 11} ${qrY + qrBox / 2 + 5}c4 0 5 7 11 7s7-7 11-7`}
          stroke="#f7f9fc"
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
        />
        <SvgText x={W / 2} y={qrY + qrBox + 36} fill="rgba(247,249,252,0.7)" fontSize={14} fontFamily="Inter_400Regular" textAnchor="middle">
          Scanne le code ou ouvre le lien
        </SvgText>
        <SvgText x={W / 2} y={qrY + qrBox + 68} fill="#f7f9fc" fontSize={21} fontWeight="700" fontFamily="Inter_700Bold" textAnchor="middle">
          {link}
        </SvgText>
        <SvgText x={W / 2} y={H - 18} fill="rgba(247,249,252,0.5)" fontSize={12} fontFamily="Inter_400Regular" textAnchor="middle">
          Ni numéro, ni e-mail · Connecte-toi sur WIPP
        </SvgText>
      </Svg>
    </View>
  );
});
