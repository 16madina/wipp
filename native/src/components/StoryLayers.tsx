import { Platform, Text, View, type TextStyle, type ViewStyle } from "react-native";
import type { StoryFont, StoryLayer, StoryTextLayer } from "../lib/story-overlay";
import { WippSticker } from "./WippSticker";

/** Sizes follow the canvas width, so a story looks the same on every phone. */
export const textSizeFor = (canvasW: number) => Math.round(canvasW * 0.075);
export const stickerSizeFor = (canvasW: number) => Math.round(canvasW * 0.32);

export const FONT_LABEL: Record<StoryFont, string> = {
  classic: "Classique",
  strong: "Fort",
  hand: "Manuscrit",
  typewriter: "Machine",
  elegant: "Élégant",
  neon: "Néon",
};

const pick = (ios: string, android: string, web: string) => (Platform.OS === "ios" ? ios : Platform.OS === "android" ? android : web);

export function fontStyle(font: StoryFont): TextStyle {
  switch (font) {
    case "strong":
      return { fontFamily: "Inter_700Bold", letterSpacing: 0.5 };
    case "hand":
      return { fontFamily: pick("Noteworthy-Bold", "casual", "cursive") };
    case "typewriter":
      return { fontFamily: pick("AmericanTypewriter-Bold", "monospace", "monospace") };
    case "elegant":
      return { fontFamily: pick("Georgia-BoldItalic", "serif", "Georgia"), fontStyle: Platform.OS === "ios" ? undefined : "italic" };
    case "neon":
      return { fontFamily: "Inter_700Bold" };
    default:
      return { fontFamily: "Inter_600SemiBold" };
  }
}

/** Black or white text, whichever reads better on this colour. */
function contrastOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#000000" : "#ffffff";
}

export function textLayerStyles(layer: Pick<StoryTextLayer, "font" | "color" | "bg">, fontSize: number): { box: ViewStyle; text: TextStyle } {
  const base: TextStyle = { fontSize, lineHeight: Math.round(fontSize * 1.22), textAlign: "center", ...fontStyle(layer.font) };
  if (layer.bg === "solid") {
    return {
      box: { backgroundColor: layer.color, borderRadius: fontSize * 0.32, paddingHorizontal: fontSize * 0.35, paddingVertical: fontSize * 0.12 },
      text: { ...base, color: contrastOn(layer.color) },
    };
  }
  if (layer.bg === "soft") {
    return {
      box: { backgroundColor: "rgba(0,0,0,0.55)", borderRadius: fontSize * 0.32, paddingHorizontal: fontSize * 0.35, paddingVertical: fontSize * 0.12 },
      text: { ...base, color: layer.color },
    };
  }
  if (layer.font === "neon") {
    return { box: {}, text: { ...base, color: "#ffffff", textShadowColor: layer.color === "#ffffff" ? "#2ec5ff" : layer.color, textShadowRadius: fontSize * 0.45 } };
  }
  return { box: {}, text: { ...base, color: layer.color, textShadowColor: "rgba(0,0,0,0.65)", textShadowRadius: fontSize * 0.2 } };
}

/** One layer, drawn at its natural size (the caller positions, scales and rotates it). */
export function StoryLayerContent({ layer, canvasW, animate = true }: { layer: StoryLayer; canvasW: number; animate?: boolean }) {
  if (layer.t === "sticker") {
    return <WippSticker id={layer.id} size={stickerSizeFor(canvasW)} still={!animate} />;
  }
  const s = textLayerStyles(layer, textSizeFor(canvasW));
  return (
    <View style={[s.box, { maxWidth: canvasW * 0.86 }]}>
      <Text style={s.text}>{layer.text}</Text>
    </View>
  );
}

/** Viewer: every layer of a story, placed over the photo / video (not touchable). */
export function StoryLayersView({ layers, canvas }: { layers: StoryLayer[]; canvas: { w: number; h: number } }) {
  if (!layers.length || canvas.w < 2) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 3 }}>
      {layers.map((layer, i) => (
        <PlacedLayer key={i} layer={layer} canvas={canvas} />
      ))}
    </View>
  );
}

function PlacedLayer({ layer, canvas }: { layer: StoryLayer; canvas: { w: number; h: number } }) {
  // Centred on (x, y): a zero-size anchor, content centred around it.
  return (
    <View style={{ position: "absolute", left: layer.x * canvas.w, top: layer.y * canvas.h, width: 0, height: 0, alignItems: "center", justifyContent: "center", overflow: "visible" }}>
      {/* A real width to wrap in (a zero-size anchor would break the text word by word). */}
      <View style={{ position: "absolute", width: canvas.w * 0.9, alignItems: "center" }}>
        <View style={{ transform: [{ scale: layer.scale }, { rotate: `${layer.rot}deg` }] }}>
          <StoryLayerContent layer={layer} canvasW={canvas.w} />
        </View>
      </View>
    </View>
  );
}
