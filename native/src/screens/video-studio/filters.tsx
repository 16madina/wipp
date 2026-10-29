/**
 * Video Studio filters: one colour filter for the whole video, with its strength.
 * The pictures come from the native engine with the same settings as the export (what you see is what you get).
 */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Check } from "lucide-react-native";
import { studioFilterPreview } from "wipp-video-trim";
import { Press } from "../../components/ui";
import { palettes } from "../../theme";
import { tr } from "../../lib/tr";
import * as P from "../../lib/video-studio/project";

const colors = palettes.dark;

export const FILTER_NAMES: Record<P.StudioFilterKind, string> = {
  none: "Aucun",
  bright: "Luminosité",
  contrast: "Contraste",
  warm: "Chaleur",
  cool: "Froid",
  vivid: "Éclatant",
  bw: "Noir et blanc",
};

/** Before / after on the video, split in the middle. */
export function FilterCompare({ before, after, width, height }: { before: string | null; after: string | null; width: number; height: number }) {
  if (!before) {
    return (
      <View style={{ position: "absolute", left: 0, top: 0, width, height, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height, backgroundColor: "#000" }}>
      <Image source={{ uri: before }} style={{ position: "absolute", width, height }} contentFit="contain" />
      <View style={{ position: "absolute", left: width / 2, top: 0, width: width / 2, height, overflow: "hidden" }}>
        <Image source={{ uri: after ?? before }} style={{ position: "absolute", left: -width / 2, width, height }} contentFit="contain" />
      </View>
      <View style={{ position: "absolute", left: width / 2 - 1, top: 0, width: 2, height, backgroundColor: "#fff" }} />
      <Text style={{ position: "absolute", left: 12, bottom: 14, color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, overflow: "hidden" }}>{tr("Avant")}</Text>
      <Text style={{ position: "absolute", right: 12, bottom: 14, color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, overflow: "hidden" }}>{tr("Après")}</Text>
    </View>
  );
}

/** Loads the pictures for the frame under the play head. */
export function useFilterPictures(frame: { uri: string; time: number } | null, filter: P.StudioFilter) {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Partial<Record<P.StudioFilterKind, string>>>({});
  const key = frame ? `${frame.uri}@${frame.time.toFixed(2)}` : "";
  useEffect(() => {
    if (!frame) return;
    let alive = true;
    setBefore(null);
    setThumbs({});
    void (async () => {
      const b = await studioFilterPreview(frame.uri, frame.time, P.filterParams(undefined)).catch(() => null);
      if (!alive) return;
      setBefore(b);
      for (const kind of P.STUDIO_FILTERS) {
        const uri = kind === "none" ? b : await studioFilterPreview(frame.uri, frame.time, P.filterParams({ kind, amount: 0.8 })).catch(() => null);
        if (!alive) return;
        if (uri) setThumbs((t) => ({ ...t, [kind]: uri }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!frame) return;
    let alive = true;
    if (filter.kind === "none" || filter.amount <= 0) {
      setAfter(null);
      return;
    }
    void studioFilterPreview(frame.uri, frame.time, P.filterParams(filter))
      .then((uri) => alive && setAfter(uri))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, filter.kind, filter.amount]);
  return { before, after, thumbs };
}

export function FilterPanel({
  filter,
  thumbs,
  onChange,
  onClose,
}: {
  filter: P.StudioFilter;
  thumbs: Partial<Record<P.StudioFilterKind, string>>;
  /** live = the slider is still moving. */
  onChange: (f: P.StudioFilter, live: boolean) => void;
  onClose: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>{tr("Filtres et ajustements")}</Text>
        <Press accessibilityLabel={tr("Retour au montage")} onPress={onClose} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent }}>
          <Check size={17} color={colors.accentFg} strokeWidth={3} />
        </Press>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {P.STUDIO_FILTERS.map((kind) => {
          const on = filter.kind === kind;
          return (
            <Press key={kind} accessibilityLabel={tr(FILTER_NAMES[kind])} onPress={() => onChange({ kind, amount: kind === "none" ? 0 : filter.kind === kind ? filter.amount : 0.8 }, false)} style={{ alignItems: "center", gap: 5, width: 62 }}>
              <View style={{ width: 58, height: 76, borderRadius: 10, overflow: "hidden", borderWidth: on ? 2.5 : 1, borderColor: on ? colors.accent : "rgba(255,255,255,0.25)", backgroundColor: colors.surface }}>
                {thumbs[kind] ? <Image source={{ uri: thumbs[kind] }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
              </View>
              <Text numberOfLines={1} style={{ color: on ? "#fff" : colors.muted, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{tr(FILTER_NAMES[kind])}</Text>
            </Press>
          );
        })}
      </ScrollView>
      {filter.kind !== "none" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 12, width: 58 }}>{tr("Intensité")}</Text>
          <AmountSlider value={filter.amount} onChange={(amount, live) => onChange({ ...filter, amount }, live)} />
          <Text style={{ color: "#fff", width: 40, textAlign: "right", fontVariant: ["tabular-nums"], fontSize: 13 }}>{Math.round(filter.amount * 100)} %</Text>
        </View>
      ) : null}
    </View>
  );
}

function AmountSlider({ value, onChange }: { value: number; onChange: (v: number, live: boolean) => void }) {
  const box = useRef({ x: 0, w: 1 });
  const ref = useRef<View>(null);
  const last = useRef(value);
  const cb = useRef(onChange);
  cb.current = onChange;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const v = Math.max(0, Math.min(1, (e.nativeEvent.pageX - box.current.x) / box.current.w));
        last.current = Math.round(v * 100) / 100;
        cb.current(last.current, true);
      },
      onPanResponderMove: (e) => {
        const v = Math.max(0, Math.min(1, (e.nativeEvent.pageX - box.current.x) / box.current.w));
        last.current = Math.round(v * 100) / 100;
        cb.current(last.current, true);
      },
      onPanResponderRelease: () => cb.current(last.current, false),
      onPanResponderTerminate: () => cb.current(last.current, false),
    }),
  ).current;
  return (
    <View
      ref={ref}
      {...responder.panHandlers}
      onLayout={() => ref.current?.measure((_x, _y, w, _h, pageX) => (box.current = { x: pageX, w: w || 1 }))}
      style={{ flex: 1, height: 32, justifyContent: "center" }}
    >
      <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)" }}>
        <View style={{ width: `${value * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
      </View>
      <View style={{ position: "absolute", left: `${value * 100}%`, marginLeft: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" }} />
    </View>
  );
}
