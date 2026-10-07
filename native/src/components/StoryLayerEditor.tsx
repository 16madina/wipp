import { useEffect, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Trash2, X } from "lucide-react-native";
import { haptic } from "../lib/haptics";
import { composerMascotGold } from "../lib/assets";
import { stickersInPack, wippieStickers } from "../lib/stickers";
import {
  MAX_LAYERS,
  MAX_STICKERS,
  STORY_COLORS,
  STORY_FONTS,
  type StoryLayer,
  type StoryTextBg,
  type StoryTextLayer,
} from "../lib/story-overlay";
import { colors } from "../theme";
import { FONT_LABEL, fontStyle, StoryLayerContent, textLayerStyles, textSizeFor } from "./StoryLayers";
import { Press } from "./ui";
import { WippSticker } from "./WippSticker";

type Canvas = { w: number; h: number };

/** Drop zone at the bottom centre while dragging. */
const inTrash = (x: number, y: number) => {
  "worklet";
  return y > 0.84 && Math.abs(x - 0.5) < 0.16;
};

function EditableLayer({
  layer,
  canvas,
  onChange,
  onDelete,
  onEdit,
  onDrag,
  onOverTrash,
}: {
  layer: StoryLayer;
  canvas: Canvas;
  onChange: (next: StoryLayer) => void;
  onDelete: () => void;
  onEdit: () => void;
  onDrag: (dragging: boolean) => void;
  onOverTrash: (over: boolean) => void;
}) {
  const x = useSharedValue(layer.x);
  const y = useSharedValue(layer.y);
  const scale = useSharedValue(layer.scale);
  const rot = useSharedValue(layer.rot);
  const start = useSharedValue({ x: layer.x, y: layer.y, scale: layer.scale, rot: layer.rot });
  const over = useSharedValue(false);
  const cw = useSharedValue(canvas.w);
  const ch = useSharedValue(canvas.h);
  useEffect(() => {
    cw.value = canvas.w;
    ch.value = canvas.h;
  }, [canvas.w, canvas.h, cw, ch]);

  useEffect(() => {
    x.value = layer.x;
    y.value = layer.y;
    scale.value = layer.scale;
    rot.value = layer.rot;
  }, [layer.x, layer.y, layer.scale, layer.rot, x, y, scale, rot]);

  const latest = useRef(layer);
  latest.current = layer;
  const commit = (nx: number, ny: number, ns: number, nr: number, drop: boolean) => {
    onDrag(false);
    onOverTrash(false);
    if (drop) {
      haptic("warn");
      onDelete();
      return;
    }
    onChange({ ...latest.current, x: nx, y: ny, scale: ns, rot: nr });
  };

  const begin = () => {
    "worklet";
    start.value = { x: x.value, y: y.value, scale: scale.value, rot: rot.value };
    runOnJS(onDrag)(true);
  };
  const end = () => {
    "worklet";
    const drop = over.value;
    over.value = false;
    runOnJS(commit)(
      Math.min(0.98, Math.max(0.02, x.value)),
      Math.min(0.96, Math.max(0.04, y.value)),
      Math.min(4, Math.max(0.3, scale.value)),
      ((rot.value + 540) % 360) - 180,
      drop,
    );
  };

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(begin)
    .onUpdate((e) => {
      x.value = start.value.x + e.translationX / Math.max(cw.value, 1);
      y.value = start.value.y + e.translationY / Math.max(ch.value, 1);
      const now = inTrash(x.value, y.value);
      if (now !== over.value) {
        over.value = now;
        runOnJS(onOverTrash)(now);
      }
    })
    .onEnd(end);
  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.value = { ...start.value, scale: scale.value };
    })
    .onUpdate((e) => {
      scale.value = Math.min(4, Math.max(0.3, start.value.scale * e.scale));
    });
  const rotate = Gesture.Rotation()
    .onStart(() => {
      start.value = { ...start.value, rot: rot.value };
    })
    .onUpdate((e) => {
      rot.value = start.value.rot + (e.rotation * 180) / Math.PI;
    });
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_e, ok) => {
      if (ok) runOnJS(onEdit)();
    });
  const gesture = Gesture.Exclusive(Gesture.Simultaneous(pan, pinch, rotate), tap);

  const anchor = useAnimatedStyle(() => ({ left: x.value * cw.value, top: y.value * ch.value }));
  const body = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
    opacity: over.value ? 0.45 : 1,
  }));

  return (
    <Animated.View style={[{ position: "absolute", width: 0, height: 0, alignItems: "center", justifyContent: "center", overflow: "visible" }, anchor]}>
      <View pointerEvents="box-none" style={{ position: "absolute", width: canvas.w * 0.9, alignItems: "center" }}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[{ padding: 10 }, body]}>
            <StoryLayerContent layer={layer} canvasW={canvas.w} />
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

/** Full-screen text writing: « Terminé », fonts, colours, background. */
function TextEditor({
  initial,
  canvasW,
  onDone,
  onCancel,
}: {
  initial: Pick<StoryTextLayer, "text" | "font" | "color" | "bg">;
  canvasW: number;
  onDone: (value: Pick<StoryTextLayer, "text" | "font" | "color" | "bg">) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initial.text);
  const [font, setFont] = useState(initial.font);
  const [color, setColor] = useState(initial.color);
  const [bg, setBg] = useState<StoryTextBg>(initial.bg);
  const s = textLayerStyles({ font, color, bg }, textSizeFor(canvasW));
  const done = () => {
    Keyboard.dismiss();
    onDone({ text, font, color, bg });
  };
  const nextBg = () => setBg((b) => (b === "none" ? "solid" : b === "solid" ? "soft" : "none"));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Press onPress={onCancel} accessibilityLabel="Annuler" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <X size={26} color="#fff" />
          </Press>
          <Press
            onPress={nextBg}
            accessibilityLabel="Fond du texte"
            style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: bg === "none" ? "rgba(255,255,255,0.12)" : bg === "solid" ? "#fff" : "rgba(255,255,255,0.4)" }}
          >
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: bg === "solid" ? "#000" : "#fff" }}>A</Text>
          </Press>
          <Press onPress={done} accessibilityLabel="Terminé" style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold", fontSize: 15 }}>Terminé</Text>
          </Press>
        </View>
        <Press onPress={done} accessibilityLabel="Valider le texte" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          <View style={[s.box, { maxWidth: canvasW * 0.9 }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              multiline
              maxLength={120}
              placeholder="Écris quelque chose…"
              placeholderTextColor="rgba(255,255,255,0.55)"
              selectionColor={colors.accent}
              style={[s.text, { minWidth: 60, padding: 0 }]}
            />
          </View>
        </Press>
        <View style={{ paddingBottom: 10, gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
            {STORY_FONTS.map((f) => (
              <Press
                key={f}
                onPress={() => setFont(f)}
                style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: "center", backgroundColor: font === f ? "#fff" : "rgba(255,255,255,0.14)" }}
              >
                <Text style={[fontStyle(f), { fontSize: 15, color: font === f ? "#000" : "#fff" }]}>{FONT_LABEL[f]}</Text>
              </Press>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingHorizontal: 14, gap: 10, alignItems: "center" }}>
            {STORY_COLORS.map((c) => (
              <Press
                key={c}
                onPress={() => setColor(c)}
                accessibilityLabel={`Couleur ${c}`}
                style={{ width: color === c ? 32 : 26, height: color === c ? 32 : 26, borderRadius: 16, backgroundColor: c, borderWidth: 2, borderColor: color === c ? colors.accent : "rgba(255,255,255,0.85)" }}
              />
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Wippmoji and Wippie only (EMO and Moments stay out of stories). */
function StickerSheet({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"moji" | "wippie">("moji");
  const list = tab === "moji" ? stickersInPack("moji") : wippieStickers("tous");
  const cols = tab === "moji" ? 5 : 4;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Press onPress={onClose} accessibilityLabel="Fermer les stickers" style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
        <View style={{ height: "55%", backgroundColor: colors.tray, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8, paddingBottom: insets.bottom }}>
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.hair }} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 8 }}>
            {(["moji", "wippie"] as const).map((id) => (
              <Press key={id} onPress={() => setTab(id)} style={{ paddingHorizontal: 16, height: 34, borderRadius: 17, justifyContent: "center", backgroundColor: tab === id ? colors.accent : colors.surface2 }}>
                <Text style={{ color: tab === id ? colors.accentFg : colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{id === "moji" ? "Wippmoji" : "Wippie"}</Text>
              </Press>
            ))}
          </View>
          <FlatList
            key={tab}
            data={list}
            numColumns={cols}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 12 }}
            renderItem={({ item }) => (
              <Press onPress={() => onPick(item.id)} accessibilityLabel={item.labelFr} style={{ flex: 1 / cols, aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 4 }}>
                <WippSticker id={item.id} size={tab === "moji" ? 52 : 70} still />
              </Press>
            )}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/**
 * Texts and stickers over a story photo / video. Touches on empty space go to the photo underneath (zoom / move).
 * `topInset` keeps the tool buttons under the status bar.
 */
export function StoryLayerEditor({ layers, onChange, topInset }: { layers: StoryLayer[]; onChange: (layers: StoryLayer[]) => void; topInset: number }) {
  const [canvas, setCanvas] = useState<Canvas>({ w: 0, h: 0 });
  const [editing, setEditing] = useState<{ index: number | null } | null>(null);
  const [picking, setPicking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const stickers = layers.filter((l) => l.t === "sticker").length;

  const setAt = (i: number, next: StoryLayer) => onChange(layers.map((l, k) => (k === i ? next : l)));
  const removeAt = (i: number) => onChange(layers.filter((_l, k) => k !== i));
  const editingLayer = editing?.index != null ? (layers[editing.index] as StoryTextLayer | undefined) : undefined;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
      onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {canvas.w > 0
        ? layers.map((layer, i) => (
            <EditableLayer
              key={i}
              layer={layer}
              canvas={canvas}
              onChange={(next) => setAt(i, next)}
              onDelete={() => removeAt(i)}
              onEdit={() => {
                if (layer.t === "text") setEditing({ index: i });
              }}
              onDrag={setDragging}
              onOverTrash={(v) => {
                if (v) haptic("select");
                setOverTrash(v);
              }}
            />
          ))
        : null}

      <View pointerEvents="box-none" style={{ position: "absolute", top: topInset + 8, right: 12, gap: 12, alignItems: "center" }}>
        <Press
          accessibilityLabel="Ajouter un texte"
          disabled={layers.length >= MAX_LAYERS}
          onPress={() => setEditing({ index: null })}
          style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 19 }}>Aa</Text>
        </Press>
        <Press
          accessibilityLabel="Ajouter un sticker"
          disabled={stickers >= MAX_STICKERS || layers.length >= MAX_LAYERS}
          onPress={() => setPicking(true)}
          style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", opacity: stickers >= MAX_STICKERS ? 0.5 : 1 }}
        >
          <Image source={composerMascotGold} style={{ width: 38, height: 29 }} contentFit="contain" />
        </Press>
      </View>

      {dragging ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: canvas.h * 0.06, alignItems: "center" }}>
          <View
            style={{
              width: overTrash ? 64 : 52,
              height: overTrash ? 64 : 52,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: overTrash ? colors.danger : "rgba(0,0,0,0.55)",
              borderWidth: 2,
              borderColor: "#fff",
            }}
          >
            <Trash2 size={overTrash ? 28 : 22} color="#fff" />
          </View>
        </View>
      ) : null}

      {editing ? (
        <TextEditor
          initial={editingLayer ?? { text: "", font: "classic", color: "#ffffff", bg: "none" }}
          canvasW={canvas.w || 390}
          onCancel={() => setEditing(null)}
          onDone={(v) => {
            const text = v.text.trim();
            if (editing.index == null) {
              if (text) onChange([...layers, { t: "text", ...v, text, x: 0.5, y: 0.4, scale: 1, rot: 0 }]);
            } else if (!text) {
              removeAt(editing.index);
            } else if (editingLayer) {
              setAt(editing.index, { ...editingLayer, ...v, text });
            }
            setEditing(null);
          }}
        />
      ) : null}
      {picking ? (
        <StickerSheet
          onClose={() => setPicking(false)}
          onPick={(id) => {
            haptic("select");
            onChange([...layers, { t: "sticker", id, x: 0.5, y: 0.45, scale: 1, rot: 0 }]);
            setPicking(false);
          }}
        />
      ) : null}
    </View>
  );
}
