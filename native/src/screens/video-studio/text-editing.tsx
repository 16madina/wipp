/**
 * Video Studio texts, in two modes:
 * A. TextWriter: write directly on the video, small style bar above the keyboard, ✓ to validate.
 * B. StudioTextView + TextTools: move / pinch / rotate the text on the video, compact tool bar at the bottom.
 * The look comes from textLook(), which follows the same rules as the native export (size, font, box, shadow, animation).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, PanResponder, Platform, ScrollView, Text, TextInput, View, type TextStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AlignCenter, AlignLeft, AlignRight, Check, Pencil, Trash2, X } from "lucide-react-native";
import { Press } from "../../components/ui";
import { palettes } from "../../theme";
import { tr } from "../../lib/tr";
import { STORY_COLORS } from "../../lib/story-overlay";
import * as P from "../../lib/video-studio/project";

const colors = palettes.dark;

export const FONT_NAMES: Record<P.StudioFont, string> = {
  classic: "Classique",
  serif: "Élégant",
  rounded: "Rond",
  mono: "Machine",
  hand: "Manuscrit",
};
const ANIM_NAMES: Record<P.StudioAnim, string> = { none: "Aucune", appear: "Apparition", fade: "Fondu", pop: "Pop", slide: "Glissement" };

/** Text look for a given font size in points (same rules as the export). */
export function textLook(item: Pick<P.StudioText, "font" | "bold" | "color" | "style" | "shadow" | "align">, fontSize: number): TextStyle {
  const family = P.fontFileFor(item.font, item.bold, Platform.OS) ?? undefined;
  const outline = item.style === "outline";
  return {
    color: item.color,
    fontSize,
    textAlign: item.align,
    fontFamily: family,
    fontWeight: item.font === "classic" ? (item.bold ? "800" : "600") : Platform.OS === "android" && item.bold ? "bold" : undefined,
    paddingHorizontal: item.style === "box" ? fontSize * 0.35 : 2,
    paddingVertical: item.style === "box" ? fontSize * 0.35 : 2,
    backgroundColor: item.style === "box" ? "rgba(0,0,0,0.6)" : "transparent",
    borderRadius: fontSize * 0.3,
    overflow: "hidden",
    textShadowColor: outline ? "#000" : item.shadow ? "rgba(0,0,0,0.75)" : "transparent",
    textShadowRadius: outline ? Math.max(2, fontSize * 0.1) : item.shadow ? fontSize * 0.08 : 0,
    textShadowOffset: { width: 0, height: item.shadow && !outline ? fontSize * 0.04 : 0 },
  };
}

/** Long texts get smaller so they stay on the screen. */
export function fittedSize(text: string, size: number) {
  const len = text.trim().length;
  return len > 36 ? Math.max(0.035, size * Math.sqrt(36 / len)) : size;
}

/* ───────── Mode A: writing ───────── */

export function TextWriter({
  item,
  stageW,
  onChange,
  onValidate,
  onCancel,
}: {
  item: P.StudioText;
  stageW: number;
  onChange: (patch: Partial<P.StudioText>) => void;
  onValidate: (text: string) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(item.text);
  const size = fittedSize(value || "A", item.size);
  const fontSize = size * stageW;
  return (
    <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.32)", zIndex: 30 }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Press accessibilityLabel={tr("Annuler le texte")} onPress={onCancel} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
          <X size={22} color="#fff" />
        </Press>
        <Press accessibilityLabel={tr("Valider le texte")} onPress={() => onValidate(value)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
          <Check size={24} color={colors.accentFg} strokeWidth={3} />
        </Press>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: (stageW * 0.14) / 2 }}>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            multiline
            scrollEnabled={false}
            placeholder={tr("Écris ici")}
            placeholderTextColor="rgba(255,255,255,0.55)"
            selectionColor={colors.accent}
            style={[textLook(item, fontSize), { maxWidth: stageW * 0.86, minWidth: 40 }]}
          />
        </View>
        {/* Small style bar right above the keyboard */}
        <View style={{ paddingBottom: 8, gap: 8 }}>
          <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, alignItems: "center" }}>
            {P.STUDIO_FONTS.map((f) => (
              <Press key={f} accessibilityLabel={tr(FONT_NAMES[f])} onPress={() => onChange({ font: f })} style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, justifyContent: "center", backgroundColor: item.font === f ? "#fff" : "rgba(0,0,0,0.5)" }}>
                <Text style={[textLook({ ...item, font: f, style: "plain", shadow: false, color: item.font === f ? "#000" : "#fff", align: "center" }, 15), { paddingHorizontal: 0, paddingVertical: 0 }]}>{tr(FONT_NAMES[f])}</Text>
              </Press>
            ))}
          </ScrollView>
          <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, alignItems: "center" }}>
            <RoundToggle label={tr("Style")} onPress={() => onChange({ style: item.style === "plain" ? "box" : item.style === "box" ? "outline" : "plain" })}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, paddingHorizontal: 5, borderRadius: 4, backgroundColor: item.style === "box" ? "rgba(255,255,255,0.35)" : "transparent", textShadowColor: item.style === "outline" ? colors.accent : "transparent", textShadowRadius: 3 }}>A</Text>
            </RoundToggle>
            <RoundToggle label={tr("Alignement")} onPress={() => onChange({ align: item.align === "center" ? "left" : item.align === "left" ? "right" : "center" })}>
              {item.align === "left" ? <AlignLeft size={18} color="#fff" /> : item.align === "right" ? <AlignRight size={18} color="#fff" /> : <AlignCenter size={18} color="#fff" />}
            </RoundToggle>
            <View style={{ width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.25)" }} />
            {STORY_COLORS.map((c) => (
              <Press key={c} accessibilityLabel={c} onPress={() => onChange({ color: c })} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: item.color === c ? 3 : 1.5, borderColor: item.color === c ? colors.accent : "rgba(255,255,255,0.7)" }} />
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function RoundToggle({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Press accessibilityLabel={label} onPress={onPress} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
      {children}
    </Press>
  );
}

/* ───────── Text on the video (preview = export) ───────── */

export function StudioTextView({
  item,
  stageW,
  stageH,
  head,
  playing,
  selected,
  onSelect,
  onEdit,
  onTransform,
}: {
  item: P.StudioText;
  stageW: number;
  stageH: number;
  head: number;
  /** Paused: the text is shown at rest (fully visible) so it can be edited. */
  playing: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onTransform: (patch: Pick<P.StudioText, "x" | "y" | "size" | "rot">) => void;
}) {
  const [h, setH] = useState(0);
  const [live, setLive] = useState({ dx: 0, dy: 0, scale: 1, rot: 0 });
  const liveRef = useRef(live);
  liveRef.current = live;
  const itemRef = useRef(item);
  itemRef.current = item;
  const cbRef = useRef({ onSelect, onEdit, onTransform });
  cbRef.current = { onSelect, onEdit, onTransform };

  const gesture = useMemo(() => {
    const commit = () => {
      const l = liveRef.current;
      const it = itemRef.current;
      if (l.dx === 0 && l.dy === 0 && l.scale === 1 && l.rot === 0) return;
      cbRef.current.onTransform({ x: it.x + l.dx / stageW, y: it.y + l.dy / stageH, size: it.size * l.scale, rot: ((it.rot + l.rot + 540) % 360) - 180 });
      setLive({ dx: 0, dy: 0, scale: 1, rot: 0 });
    };
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(3)
      .onStart(() => cbRef.current.onSelect())
      .onUpdate((e) => setLive((l) => ({ ...l, dx: e.translationX, dy: e.translationY })))
      .onEnd(commit);
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => cbRef.current.onSelect())
      .onUpdate((e) => setLive((l) => ({ ...l, scale: e.scale })))
      .onEnd(commit);
    const rotate = Gesture.Rotation()
      .runOnJS(true)
      .onUpdate((e) => {
        let deg = (e.rotation * 180) / Math.PI;
        // Small snap to straight.
        const total = itemRef.current.rot + deg;
        if (Math.abs(total) < 4) deg = -itemRef.current.rot;
        setLive((l) => ({ ...l, rot: deg }));
      })
      .onEnd(commit);
    const tap = Gesture.Tap().runOnJS(true).onEnd(() => cbRef.current.onSelect());
    const double = Gesture.Tap().runOnJS(true).numberOfTaps(2).onEnd(() => cbRef.current.onEdit());
    return Gesture.Race(Gesture.Simultaneous(pan, pinch, rotate), Gesture.Exclusive(double, tap));
  }, [stageW, stageH]);

  const anim = playing ? P.animAt(item.anim, head - item.from) : P.animAt("none", 0);
  const fontSize = item.size * live.scale * stageW;
  const maxW = stageW * 0.86;
  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{
          position: "absolute",
          left: item.x * stageW - maxW / 2 + live.dx,
          top: item.y * stageH - h / 2 + live.dy + anim.dy * stageH,
          width: maxW,
          alignItems: "center",
          opacity: anim.opacity,
          transform: [{ rotate: `${item.rot + live.rot}deg` }, { scale: anim.scale }],
        }}
      >
        <View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={{ borderWidth: selected ? 1.5 : 0, borderColor: "rgba(255,255,255,0.9)", borderStyle: "dashed", borderRadius: 8, padding: selected ? 4 : 0, margin: selected ? -5.5 : 0 }}>
          <Text style={textLook(item, fontSize)}>{item.text}</Text>
          {selected ? (
            <>
              <View style={{ position: "absolute", left: -5, top: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" }} />
              <View style={{ position: "absolute", right: -5, top: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" }} />
              <View style={{ position: "absolute", left: -5, bottom: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" }} />
              <View style={{ position: "absolute", right: -5, bottom: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" }} />
            </>
          ) : null}
        </View>
      </View>
    </GestureDetector>
  );
}

/* ───────── Mode B: compact tools ───────── */

type Tab = "font" | "color" | "style" | "anim" | "time";

export function TextTools({
  item,
  total,
  onChange,
  onEdit,
  onDelete,
  onClose,
}: {
  item: P.StudioText;
  total: number;
  onChange: (patch: Partial<P.StudioText>) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("font");
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(true), [item.id]);
  const tabs: { id: Tab; label: string }[] = [
    { id: "font", label: tr("Police") },
    { id: "color", label: tr("Couleur") },
    { id: "style", label: tr("Style") },
    { id: "anim", label: tr("Animation") },
    { id: "time", label: tr("Durée") },
  ];
  return (
    <View style={{ paddingHorizontal: 10, paddingBottom: 6, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, alignItems: "center" }} style={{ flex: 1 }}>
          {tabs.map((t) => (
            <Press
              key={t.id}
              onPress={() => {
                if (tab === t.id) setOpen((o) => !o);
                else {
                  setTab(t.id);
                  setOpen(true);
                }
              }}
              style={{ height: 30, paddingHorizontal: 11, borderRadius: 15, justifyContent: "center", backgroundColor: tab === t.id && open ? "rgba(255,255,255,0.16)" : "transparent" }}
            >
              <Text style={{ color: tab === t.id && open ? "#fff" : colors.muted, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t.label}</Text>
            </Press>
          ))}
        </ScrollView>
        <MiniButton label={tr("Modifier le texte")} onPress={onEdit}><Pencil size={16} color="#fff" /></MiniButton>
        <MiniButton label={tr("Supprimer le texte")} onPress={onDelete}><Trash2 size={16} color={colors.danger} /></MiniButton>
        <MiniButton label={tr("Retour au montage")} onPress={onClose} accent><Check size={17} color={colors.accentFg} strokeWidth={3} /></MiniButton>
      </View>
      {open ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center", minHeight: 38 }}>
          {tab === "font"
            ? P.STUDIO_FONTS.map((f) => (
                <Press key={f} onPress={() => onChange({ font: f })} style={{ height: 36, paddingHorizontal: 12, borderRadius: 12, justifyContent: "center", backgroundColor: item.font === f ? "#fff" : "rgba(255,255,255,0.1)" }}>
                  <Text style={[textLook({ ...item, font: f, style: "plain", shadow: false, color: item.font === f ? "#000" : "#fff", align: "center" }, 15), { paddingHorizontal: 0, paddingVertical: 0 }]}>{tr(FONT_NAMES[f])}</Text>
                </Press>
              ))
            : null}
          {tab === "color"
            ? STORY_COLORS.map((c) => (
                <Press key={c} accessibilityLabel={c} onPress={() => onChange({ color: c })} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: item.color === c ? 3 : 1.5, borderColor: item.color === c ? colors.accent : "rgba(255,255,255,0.6)" }} />
              ))
            : null}
          {tab === "style" ? (
            <>
              <Pill label={tr("Simple")} on={item.style === "plain"} onPress={() => onChange({ style: "plain" })} />
              <Pill label={tr("Fond")} on={item.style === "box"} onPress={() => onChange({ style: "box" })} />
              <Pill label={tr("Contour")} on={item.style === "outline"} onPress={() => onChange({ style: "outline" })} />
              <Pill label={tr("Gras")} on={item.bold} onPress={() => onChange({ bold: !item.bold })} />
              <Pill label={tr("Ombre")} on={item.shadow} onPress={() => onChange({ shadow: !item.shadow })} />
              <Pill label="◧" on={false} onPress={() => onChange({ align: item.align === "center" ? "left" : item.align === "left" ? "right" : "center" })} />
            </>
          ) : null}
          {tab === "anim" ? P.STUDIO_ANIMS.map((a) => <Pill key={a} label={tr(ANIM_NAMES[a])} on={item.anim === a} onPress={() => onChange({ anim: a })} />) : null}
          {tab === "time" ? (
            <>
              <TimeStepper label={tr("Début")} value={item.from} onStep={(d) => onChange({ from: Math.min(item.to - 0.2, item.from + d) })} />
              <TimeStepper label={tr("Fin")} value={item.to} onStep={(d) => onChange({ to: Math.min(total, item.to + d) })} />
            </>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

function MiniButton({ label, onPress, children, accent }: { label: string; onPress: () => void; children: ReactNode; accent?: boolean }) {
  return (
    <Press accessibilityLabel={label} onPress={onPress} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: accent ? colors.accent : "rgba(255,255,255,0.12)" }}>
      {children}
    </Press>
  );
}

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={{ height: 34, paddingHorizontal: 13, borderRadius: 17, justifyContent: "center", backgroundColor: on ? colors.accent : "rgba(255,255,255,0.12)" }}>
      <Text style={{ color: on ? colors.accentFg : "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{label}</Text>
    </Press>
  );
}

function TimeStepper({ label, value, onStep }: { label: string; value: number; onStep: (delta: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 12, marginRight: 2 }}>{label}</Text>
      <Pill label="−" on={false} onPress={() => onStep(-0.1)} />
      <Text style={{ color: "#fff", width: 44, textAlign: "center", fontVariant: ["tabular-nums"], fontSize: 13 }}>{value.toFixed(1)} s</Text>
      <Pill label="+" on={false} onPress={() => onStep(0.1)} />
    </View>
  );
}

/* ───────── Text block in the timeline: drag the ends or the whole block ───────── */

export function TextBlock({
  item,
  row,
  pxPerSec,
  total,
  selected,
  onSelect,
  onDragState,
  onTiming,
}: {
  item: P.StudioText;
  row: number;
  pxPerSec: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onDragState: (dragging: boolean) => void;
  /** live = still dragging. */
  onTiming: (from: number, to: number, live: boolean) => void;
}) {
  const base = useRef({ from: item.from, to: item.to });
  const [label, setLabel] = useState<string | null>(null);
  const cb = useRef({ onTiming, onDragState, onSelect });
  cb.current = { onTiming, onDragState, onSelect };
  const make = (mode: "move" | "start" | "end") =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        base.current = { from: itemRef.current.from, to: itemRef.current.to };
        cb.current.onSelect();
        cb.current.onDragState(true);
        void Haptics.selectionAsync();
      },
      onPanResponderMove: (_, g) => {
        const d = g.dx / pxPerSec;
        const { from, to } = base.current;
        let f = from;
        let t = to;
        if (mode === "move") {
          const len = to - from;
          f = Math.max(0, Math.min(total - len, from + d));
          t = f + len;
        } else if (mode === "start") f = Math.max(0, Math.min(to - 0.3, from + d));
        else t = Math.min(total, Math.max(from + 0.3, to + d));
        setLabel(`${f.toFixed(1)} s → ${t.toFixed(1)} s · ${(t - f).toFixed(1)} s`);
        cb.current.onTiming(f, t, true);
      },
      onPanResponderRelease: (_, g) => end(mode, g.dx),
      onPanResponderTerminate: (_, g) => end(mode, g.dx),
    });
  const itemRef = useRef(item);
  itemRef.current = item;
  function end(mode: "move" | "start" | "end", dx: number) {
    setLabel(null);
    cb.current.onDragState(false);
    const d = dx / pxPerSec;
    const { from, to } = base.current;
    if (Math.abs(dx) < 2) {
      cb.current.onTiming(from, to, false);
      return;
    }
    if (mode === "move") {
      const len = to - from;
      const f = Math.max(0, Math.min(total - len, from + d));
      cb.current.onTiming(f, f + len, false);
    } else if (mode === "start") cb.current.onTiming(Math.max(0, Math.min(to - 0.3, from + d)), to, false);
    else cb.current.onTiming(from, Math.min(total, Math.max(from + 0.3, to + d)), false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const body = useMemo(() => make("move"), [pxPerSec, total]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const left = useMemo(() => make("start"), [pxPerSec, total]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const right = useMemo(() => make("end"), [pxPerSec, total]);
  const w = Math.max(24, (item.to - item.from) * pxPerSec);
  return (
    <View style={{ position: "absolute", left: item.from * pxPerSec, top: row * 30, width: w, height: 26 }}>
      {label ? (
        <View pointerEvents="none" style={{ position: "absolute", bottom: 30, left: -40, right: -40, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold", backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden", fontVariant: ["tabular-nums"] }}>{label}</Text>
        </View>
      ) : null}
      <View
        {...(selected ? body.panHandlers : {})}
        onTouchEnd={selected ? undefined : onSelect}
        style={{ flex: 1, borderRadius: 6, backgroundColor: selected ? "#8e6bff" : "rgba(142,107,255,0.6)", borderWidth: selected ? 2 : 0, borderColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: selected ? 14 : 6, overflow: "hidden" }}
      >
        <Text numberOfLines={1} style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{item.text}</Text>
      </View>
      {selected ? (
        <>
          <View {...left.panHandlers} hitSlop={{ left: 12, right: 6, top: 8, bottom: 8 }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 2, height: 12, borderRadius: 1, backgroundColor: "#8e6bff" }} />
          </View>
          <View {...right.panHandlers} hitSlop={{ left: 6, right: 12, top: 8, bottom: 8 }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 12, borderTopRightRadius: 6, borderBottomRightRadius: 6, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 2, height: 12, borderRadius: 1, backgroundColor: "#8e6bff" }} />
          </View>
        </>
      ) : null}
    </View>
  );
}
