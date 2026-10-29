/**
 * WIPP Video Studio: real editing of a Story video, on the phone.
 * Split, delete, trim, reorder, up to 2 source videos, sound per segment, speed, timed texts, undo / redo.
 * The preview plays the edit as it will be exported; « Terminé » makes the final file (sources untouched).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gauge,
  Pause,
  Play,
  Plus,
  Redo2,
  Scissors,
  Trash2,
  Type,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react-native";
import { cancelStudioExport, exportStudioProject, studioCapabilities } from "wipp-video-trim";
import { Press } from "../../components/ui";
import { palettes } from "../../theme";
import { tr } from "../../lib/tr";
import { STORY_COLORS } from "../../lib/story-overlay";
import * as P from "../../lib/video-studio/project";

const colors = palettes.dark;
const PX_PER_SEC = 44;
const TILE = 44;
const SOURCE_TINT = ["#ffd84d", "#5cc8ff"];

export type StudioResult = { uri: string; mime: string; duration: number; project: P.StudioProject };

type Panel = null | "sound" | "speed" | "text" | "order";

export function VideoStudio({
  initial,
  seed,
  onCancel,
  onDone,
}: {
  /** A project opened before (edits are kept). */
  initial?: P.StudioProject;
  /** First opening: the video, its length if known, and the part already chosen. */
  seed?: { uri: string; duration?: number; start?: number; end?: number };
  onCancel: () => void;
  onDone: (result: StudioResult | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const caps = useMemo(() => studioCapabilities(), []);
  const [history, setHistory] = useState<P.History | null>(() => {
    if (initial) return P.historyOf(initial);
    if (seed?.duration && seed.duration > 0) {
      return P.historyOf(P.createProject({ uri: seed.uri, duration: seed.duration }, seed.start != null && seed.end != null ? { start: seed.start, end: seed.end } : undefined));
    }
    return null;
  });
  /** Live state while a handle is dragged (committed to history on release). */
  const [draft, setDraft] = useState<P.StudioProject | null>(null);
  const project = draft ?? history?.present ?? null;
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [head, setHead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const [thumbs, setThumbs] = useState<Record<string, { step: number; uris: string[] }>>({});
  const [exporting, setExporting] = useState<null | number>(null);
  const [error, setError] = useState("");
  const [handleDrag, setHandleDrag] = useState(false);

  const sources = project?.sources ?? [];
  const uriA = sources[0]?.uri ?? seed?.uri ?? null;
  const uriB = sources[1]?.uri ?? null;
  const playerA = useVideoPlayer(uriA, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.03;
    p.preservesPitch = true;
  });
  const playerB = useVideoPlayer(uriB, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.03;
    p.preservesPitch = true;
  });

  const projectRef = useRef(project);
  projectRef.current = project;
  const playingRef = useRef(false);
  playingRef.current = playing;
  const headRef = useRef(0);
  const activeRef = useRef(0);
  const userScrolling = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // A video opened without a known length (e.g. shared from another app): wait for the player.
  useEffect(() => {
    if (history || !seed) return;
    const sub = playerA.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay" && playerA.duration > 0) {
        setHistory(P.historyOf(P.createProject({ uri: seed.uri, duration: playerA.duration })));
      } else if (status === "error") {
        setError(tr("Cette vidéo ne peut pas être lue."));
      }
    });
    return () => sub.remove();
  }, [history, seed, playerA]);

  useEffect(() => {
    void import("expo-av").then(({ Audio }) => Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false }));
  }, []);

  // Real thumbnails for each source (one every `step` seconds).
  useEffect(() => {
    let alive = true;
    for (const src of sources) {
      if (thumbs[src.id]) continue;
      const step = Math.max(1, src.duration / 48);
      const count = Math.max(1, Math.ceil(src.duration / step));
      setThumbs((t) => ({ ...t, [src.id]: { step, uris: [] } }));
      void (async () => {
        const uris: string[] = [];
        for (let i = 0; i < count; i += 1) {
          const shot = await VideoThumbnails.getThumbnailAsync(src.uri, { time: Math.floor(Math.min(src.duration - 0.1, i * step) * 1000), quality: 0.4 }).catch(() => null);
          uris.push(shot?.uri ?? "");
          if (!alive) return;
          if (i % 6 === 5 || i === count - 1) setThumbs((t) => ({ ...t, [src.id]: { step, uris: [...uris] } }));
        }
      })();
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.map((s) => s.id).join(",")]);

  const playerFor = useCallback((sourceId: string) => {
    const p = projectRef.current;
    const index = p?.sources.find((s) => s.id === sourceId)?.index ?? 0;
    return { index, player: index === 1 ? playerB : playerA, other: index === 1 ? playerA : playerB };
  }, [playerA, playerB]);

  /** Shows the final-timeline time t: right source, right place, segment volume and speed. */
  const showAt = useCallback(
    (t: number, play: boolean) => {
      const p = projectRef.current;
      if (!p) return;
      const hit = P.locate(p, t);
      if (!hit) return;
      const { index, player, other } = playerFor(hit.seg.sourceId);
      other.pause();
      player.volume = hit.seg.volume;
      player.muted = hit.seg.volume <= 0.001;
      player.playbackRate = hit.seg.speed;
      player.currentTime = hit.sourceTime;
      activeRef.current = index;
      setActive(index);
      headRef.current = t;
      setHead(t);
      if (play) player.play();
      else player.pause();
    },
    [playerFor],
  );

  // Follows the playing player; jumps over removed parts to the next segment.
  useEffect(() => {
    const subs = [playerA, playerB].map((player, index) =>
      player.addListener("timeUpdate", ({ currentTime }) => {
        const p = projectRef.current;
        if (!p || !playingRef.current || activeRef.current !== index) return;
        const hit = P.locate(p, headRef.current);
        if (!hit) return;
        const t = hit.from + (currentTime - hit.seg.start) / hit.seg.speed;
        if (currentTime >= hit.seg.end - 0.035 || t >= hit.to - 0.01) {
          const total = P.totalDuration(p);
          if (hit.index >= p.segments.length - 1 || hit.to >= total - 0.01) {
            showAt(0, true);
          } else {
            showAt(hit.to + 0.0005, true);
          }
          return;
        }
        headRef.current = Math.max(hit.from, t);
        setHead(headRef.current);
        if (!userScrolling.current) scrollRef.current?.scrollTo({ x: headRef.current * PX_PER_SEC, animated: false });
      }),
    );
    return () => subs.forEach((s) => s.remove());
  }, [playerA, playerB, showAt]);

  // First frame once the project is ready.
  const ready = !!project;
  useEffect(() => {
    if (ready) setTimeout(() => showAt(0, false), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function togglePlay() {
    if (!project) return;
    if (playing) {
      setPlaying(false);
      playerA.pause();
      playerB.pause();
      return;
    }
    setPlaying(true);
    playingRef.current = true;
    const total = P.totalDuration(project);
    showAt(headRef.current >= total - 0.05 ? 0 : headRef.current, true);
  }

  function stop() {
    setPlaying(false);
    playingRef.current = false;
    playerA.pause();
    playerB.pause();
  }

  function apply(next: P.StudioProject, feel: "light" | "medium" | null = null) {
    if (!history) return;
    setHistory(P.commit(history, next));
    if (feel) void Haptics.impactAsync(feel === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    // Keep the head inside the new edit and refresh the picture.
    const total = P.totalDuration(next);
    const t = Math.min(headRef.current, Math.max(0, total - 0.05));
    projectRef.current = next;
    setTimeout(() => showAt(t, playingRef.current), 0);
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!userScrolling.current || !project) return;
    const t = Math.max(0, Math.min(P.totalDuration(project), e.nativeEvent.contentOffset.x / PX_PER_SEC));
    showAt(t, false);
  }

  const total = project ? P.totalDuration(project) : 0;
  const offsets = project ? P.segmentOffsets(project) : [];
  const selectedSeg = project?.segments.find((s) => s.id === selected) ?? null;
  const currentSeg = selectedSeg ?? (project ? P.locate(project, head)?.seg ?? null : null);
  const textItem = project?.texts.find((t) => t.id === selectedText) ?? null;

  // Video area: 9:16, as large as the space allows.
  const chrome = insets.top + 56 + 44 + 168 + 76 + insets.bottom;
  const stageH = Math.max(220, Math.min(screenH - chrome, ((screenW - 48) * 16) / 9));
  const stageW = (stageH * 9) / 16;

  function split() {
    if (!project) return;
    stop();
    const r = P.splitAt(project, headRef.current);
    if (!r.rightId) {
      setError(tr("Place la tête de lecture un peu plus loin du bord de la séquence."));
      return;
    }
    setError("");
    setSelected(r.rightId);
    apply(r.project, "medium");
  }

  function remove() {
    if (!project) return;
    stop();
    if (selectedText) {
      apply(P.removeText(project, selectedText), "light");
      setSelectedText(null);
      setPanel(null);
      return;
    }
    const id = selected ?? currentSeg?.id;
    if (!id) return;
    if (project.segments.length <= 1) {
      setError(tr("Il faut garder au moins une séquence."));
      return;
    }
    setError("");
    setSelected(null);
    setPanel(null);
    apply(P.removeSegment(project, id), "medium");
  }

  async function addVideo() {
    if (!project || project.sources.length >= P.MAX_SOURCES) return;
    stop();
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        quality: 1,
        videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const seconds = (asset.duration ?? 0) / 1000;
      if (asset.type !== "video" || !(seconds > 0.3)) {
        setError(tr("Cette vidéo ne peut pas être utilisée."));
        return;
      }
      setError("");
      const next = P.addSource(project, { uri: asset.uri, duration: seconds });
      setSelected(next.segments[next.segments.length - 1].id);
      apply(next, "light");
    } catch {
      setError(tr("Cette vidéo ne peut pas être utilisée."));
    }
  }

  function newText() {
    if (!project) return;
    stop();
    const r = P.addText(project, headRef.current, { text: tr("Ton texte"), size: 0.075, color: "#ffffff", style: "box", font: "bold" });
    apply(r.project, "light");
    setSelected(null);
    setSelectedText(r.id);
    setPanel("text");
  }

  async function done() {
    if (!project) return;
    stop();
    if (P.isUntouched(project)) {
      onDone(null);
      return;
    }
    if (total > P.MAX_OUTPUT_SEC + 0.25) {
      setError(tr("Ta vidéo dure {n} s. Une Story dure 60 s maximum : coupe encore {m} s.").replace("{n}", String(Math.round(total))).replace("{m}", String(Math.ceil(total - P.MAX_OUTPUT_SEC))));
      return;
    }
    setError("");
    setExporting(0);
    try {
      const out = await exportStudioProject(P.exportSpec(project), (p) => setExporting(p));
      if (!(out.duration > 0.2)) throw new Error("studio_empty_output");
      setExporting(null);
      onDone({ uri: out.uri, mime: "video/mp4", duration: out.duration, project });
    } catch (err) {
      setExporting(null);
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancelled/.test(msg)) return;
      if (/no_space/.test(msg)) setError(tr("Pas assez d’espace sur le téléphone pour créer la vidéo. Libère de la place, puis réessaie."));
      else setError(tr("La création de la vidéo a échoué. Ton montage est gardé : réessaie."));
      if (__DEV__) console.warn("[wipp] studio export failed", msg);
    }
  }

  // ───── Trim handles on the selected segment ─────
  const dragBase = useRef<P.StudioProject | null>(null);
  const handleResponder = useCallback(
    (side: "start" | "end") =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          stop();
          dragBase.current = projectRef.current;
          setHandleDrag(true);
        },
        onPanResponderMove: (_, g) => {
          const base = dragBase.current;
          const seg = base?.segments.find((s) => s.id === selected);
          if (!base || !seg) return;
          const delta = (g.dx / PX_PER_SEC) * seg.speed;
          const next = P.updateSegment(base, seg.id, side === "start" ? { start: seg.start + delta } : { end: seg.end + delta });
          setDraft(next);
          projectRef.current = next;
          const at = P.segmentOffsets(next).find((x) => x.seg.id === seg.id);
          if (at) showAt(side === "start" ? at.from : Math.max(at.from, at.to - 0.05), false);
        },
        onPanResponderRelease: () => finishDrag(),
        onPanResponderTerminate: () => finishDrag(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, showAt],
  );
  function finishDrag() {
    setHandleDrag(false);
    const next = projectRef.current;
    setDraft(null);
    if (history && next && next !== history.present) setHistory(P.commit(history, next));
    void Haptics.selectionAsync();
  }
  const startHandle = useMemo(() => handleResponder("start"), [handleResponder]);
  const endHandle = useMemo(() => handleResponder("end"), [handleResponder]);

  if (!project) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 14 }}>
        {error ? <Text style={{ color: colors.danger, textAlign: "center", paddingHorizontal: 24 }}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
        <Press onPress={onCancel} style={{ paddingHorizontal: 18, height: 40, justifyContent: "center" }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{tr("Annuler")}</Text>
        </Press>
      </View>
    );
  }

  const visibleTexts = project.texts.filter((t) => head >= t.from && head < t.to);
  const half = screenW / 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top bar */}
      <View style={{ paddingTop: insets.top + 6, height: insets.top + 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
        <Press accessibilityLabel={tr("Annuler")} onPress={() => { stop(); onCancel(); }} style={{ height: 40, paddingHorizontal: 10, justifyContent: "center" }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{tr("Annuler")}</Text>
        </Press>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <Press accessibilityLabel={tr("Annuler la dernière action")} disabled={!history?.past.length} onPress={() => history && (stop(), setHistory(P.undo(history)), setTimeout(() => showAt(Math.min(headRef.current, P.totalDuration(P.undo(history).present) - 0.05), false), 0))} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: history?.past.length ? 1 : 0.35 }}>
            <Undo2 size={22} color={colors.fg} />
          </Press>
          <Press accessibilityLabel={tr("Rétablir")} disabled={!history?.future.length} onPress={() => history && (stop(), setHistory(P.redo(history)), setTimeout(() => showAt(Math.min(headRef.current, P.totalDuration(P.redo(history).present) - 0.05), false), 0))} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: history?.future.length ? 1 : 0.35 }}>
            <Redo2 size={22} color={colors.fg} />
          </Press>
        </View>
        <Press accessibilityLabel={tr("Terminé")} onPress={() => void done()} style={{ height: 36, paddingHorizontal: 18, borderRadius: 18, backgroundColor: colors.accent, justifyContent: "center" }}>
          <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold", fontSize: 15 }}>{tr("Terminé")}</Text>
        </Press>
      </View>

      {/* Preview 9:16 */}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: stageW, height: stageH, borderRadius: 18, overflow: "hidden", backgroundColor: "#000" }}>
          <VideoView player={playerA} style={{ position: "absolute", width: "100%", height: "100%", opacity: active === 0 ? 1 : 0 }} contentFit="contain" nativeControls={false} />
          {uriB ? <VideoView player={playerB} style={{ position: "absolute", width: "100%", height: "100%", opacity: active === 1 ? 1 : 0 }} contentFit="contain" nativeControls={false} /> : null}
          <Press accessibilityLabel={playing ? tr("Pause") : tr("Lecture")} onPress={togglePlay} style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            {!playing ? (
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
                <Play size={28} color="#fff" fill="#fff" />
              </View>
            ) : null}
          </Press>
          {visibleTexts.map((t) => (
            <DraggableText
              key={t.id}
              item={t}
              stageW={stageW}
              stageH={stageH}
              selected={t.id === selectedText}
              onSelect={() => {
                stop();
                setSelected(null);
                setSelectedText(t.id);
                setPanel("text");
              }}
              onMove={(x, y) => apply(P.updateText(project, t.id, { x, y }))}
            />
          ))}
        </View>
      </View>

      {/* Time */}
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Press accessibilityLabel={playing ? tr("Pause") : tr("Lecture")} onPress={togglePlay} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          {playing ? <Pause size={22} color={colors.fg} fill={colors.fg} /> : <Play size={22} color={colors.fg} fill={colors.fg} />}
        </Press>
        <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 15, fontVariant: ["tabular-nums"] }}>
          {clock(head)} <Text style={{ color: colors.muted }}>/ {clock(total)}</Text>
        </Text>
        {total > P.MAX_OUTPUT_SEC + 0.25 ? <Text style={{ color: colors.danger, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{tr("60 s max")}</Text> : null}
      </View>

      {/* Timeline */}
      <View style={{ height: 168 }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          scrollEnabled={!handleDrag}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onScrollBeginDrag={() => {
            stop();
            userScrolling.current = true;
          }}
          onScrollEndDrag={(e) => {
            if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.x) < 0.05) userScrolling.current = false;
          }}
          onMomentumScrollEnd={() => {
            userScrolling.current = false;
          }}
          contentContainerStyle={{ paddingHorizontal: half, paddingTop: 8 }}
        >
          <View>
            {/* Video track */}
            <View style={{ flexDirection: "row", height: 64, alignItems: "center" }}>
              {offsets.map(({ seg }) => {
                const w = Math.max(8, P.segmentLength(seg) * PX_PER_SEC);
                const src = project.sources.find((s) => s.id === seg.sourceId);
                const th = thumbs[seg.sourceId];
                const tiles = Math.max(1, Math.ceil(w / TILE));
                const isSel = seg.id === selected;
                return (
                  <Press
                    key={seg.id}
                    accessibilityLabel={tr("Séquence")}
                    onPress={() => {
                      stop();
                      setSelectedText(null);
                      setSelected(isSel ? null : seg.id);
                      if (panel === "text") setPanel(null);
                      void Haptics.selectionAsync();
                    }}
                    style={{ width: w, height: 56, marginRight: 2, borderRadius: 8, overflow: "hidden", backgroundColor: colors.surface2, borderWidth: isSel ? 3 : 0, borderColor: colors.accent }}
                  >
                    <View style={{ flexDirection: "row", flex: 1 }}>
                      {Array.from({ length: tiles }, (_, i) => {
                        const at = seg.start + ((i * TILE) / PX_PER_SEC) * seg.speed;
                        const uri = th?.uris[Math.min(th.uris.length - 1, Math.round(at / th.step))];
                        return uri ? (
                          <ThumbTile key={i} uri={uri} />
                        ) : (
                          <View key={i} style={{ width: TILE, height: "100%", backgroundColor: colors.surface }} />
                        );
                      })}
                    </View>
                    <View style={{ position: "absolute", left: 4, top: 4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: SOURCE_TINT[src?.index ?? 0], alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#0b1220", fontSize: 10, fontFamily: "Inter_700Bold" }}>{(src?.index ?? 0) + 1}</Text>
                    </View>
                    {seg.speed !== 1 ? (
                      <Text style={{ position: "absolute", right: 4, bottom: 3, color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", textShadowColor: "#000", textShadowRadius: 3 }}>{seg.speed}×</Text>
                    ) : null}
                    {isSel ? (
                      <>
                        <View {...startHandle.panHandlers} hitSlop={{ left: 14, right: 8, top: 8, bottom: 8 }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                          <View style={{ width: 2, height: 18, borderRadius: 1, backgroundColor: colors.accentFg }} />
                        </View>
                        <View {...endHandle.panHandlers} hitSlop={{ left: 8, right: 14, top: 8, bottom: 8 }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                          <View style={{ width: 2, height: 18, borderRadius: 1, backgroundColor: colors.accentFg }} />
                        </View>
                      </>
                    ) : null}
                  </Press>
                );
              })}
              {project.sources.length < P.MAX_SOURCES ? (
                <Press accessibilityLabel={tr("Ajouter une vidéo")} onPress={() => void addVideo()} style={{ width: 44, height: 44, marginLeft: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                  <Plus size={22} color={colors.fg} />
                </Press>
              ) : null}
            </View>

            {/* Sound track: one bar per segment, by volume */}
            <View style={{ flexDirection: "row", height: 28, marginTop: 6 }}>
              {offsets.map(({ seg }) => {
                const w = Math.max(8, P.segmentLength(seg) * PX_PER_SEC);
                const muted = seg.volume <= 0.001;
                return (
                  <Press
                    key={seg.id}
                    accessibilityLabel={tr("Son de la séquence")}
                    onPress={() => {
                      stop();
                      setSelectedText(null);
                      setSelected(seg.id);
                      setPanel("sound");
                    }}
                    style={{ width: w, marginRight: 2, borderRadius: 6, backgroundColor: muted ? "rgba(255,255,255,0.06)" : "rgba(48,209,160,0.22)", flexDirection: "row", alignItems: "center", overflow: "hidden", paddingHorizontal: 4, gap: 2 }}
                  >
                    {muted ? (
                      <VolumeX size={13} color={colors.muted} />
                    ) : (
                      Array.from({ length: Math.max(1, Math.floor(w / 5)) }, (_, i) => (
                        <View key={i} style={{ width: 2, borderRadius: 1, height: 4 + ((i * 7) % 13) * seg.volume, backgroundColor: "#30d1a0" }} />
                      ))
                    )}
                  </Press>
                );
              })}
            </View>

            {/* Text track */}
            <View style={{ height: 30, marginTop: 6, width: Math.max(8, total * PX_PER_SEC) }}>
              {project.texts.map((t, i) => (
                <Press
                  key={t.id}
                  accessibilityLabel={tr("Texte")}
                  onPress={() => {
                    stop();
                    setSelected(null);
                    setSelectedText(t.id);
                    setPanel("text");
                    showAt(t.from + 0.01, false);
                  }}
                  style={{ position: "absolute", left: t.from * PX_PER_SEC, width: Math.max(16, (t.to - t.from) * PX_PER_SEC), top: (i % 2) * 2, height: 26, borderRadius: 6, backgroundColor: t.id === selectedText ? "#8e6bff" : "rgba(142,107,255,0.55)", flexDirection: "row", alignItems: "center", paddingHorizontal: 6, gap: 4, overflow: "hidden" }}
                >
                  <Type size={12} color="#fff" />
                  <Text numberOfLines={1} style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{t.text}</Text>
                </Press>
              ))}
            </View>
          </View>
        </ScrollView>
        {/* Play head */}
        <View pointerEvents="none" style={{ position: "absolute", left: half - 1, top: 0, bottom: 0, width: 2, borderRadius: 1, backgroundColor: "#fff" }} />
      </View>

      {error ? <Text style={{ color: colors.danger, textAlign: "center", paddingHorizontal: 16, fontSize: 13, marginTop: -4 }}>{error}</Text> : null}

      {/* Toolbar */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.hair, backgroundColor: colors.bg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 2, minWidth: "100%", justifyContent: "space-around" }}>
          <Tool icon={<Scissors size={22} color={colors.fg} />} label={tr("Scinder")} onPress={split} />
          <Tool icon={<Trash2 size={22} color={colors.fg} />} label={tr("Supprimer")} onPress={remove} />
          <Tool icon={<Volume2 size={22} color={colors.fg} />} label={tr("Son")} onPress={() => { stop(); setSelectedText(null); if (!selected && currentSeg) setSelected(currentSeg.id); setPanel("sound"); }} />
          {caps.speed ? <Tool icon={<Gauge size={22} color={colors.fg} />} label={tr("Vitesse")} onPress={() => { stop(); setSelectedText(null); if (!selected && currentSeg) setSelected(currentSeg.id); setPanel("speed"); }} /> : null}
          <Tool icon={<Type size={22} color={colors.fg} />} label={tr("Texte")} onPress={newText} />
          {project.segments.length > 1 ? <Tool icon={<ArrowRight size={22} color={colors.fg} />} label={tr("Ordre")} onPress={() => { stop(); setSelectedText(null); if (!selected && currentSeg) setSelected(currentSeg.id); setPanel("order"); }} /> : null}
          {project.sources.length < P.MAX_SOURCES ? <Tool icon={<Plus size={22} color={colors.fg} />} label={tr("Vidéo")} onPress={() => void addVideo()} /> : null}
        </ScrollView>
      </View>

      {/* Panels */}
      {panel && (panel === "text" ? textItem : currentSeg) ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: colors.fg, fontFamily: "Inter_700Bold", fontSize: 17 }}>
                {panel === "sound" ? tr("Son") : panel === "speed" ? tr("Vitesse") : panel === "order" ? tr("Ordre des séquences") : tr("Texte")}
              </Text>
              <Press accessibilityLabel={tr("Valider")} onPress={() => setPanel(null)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                <Check size={24} color={colors.fg} />
              </Press>
            </View>
            {panel === "sound" && currentSeg ? (
              <SoundPanel
                seg={currentSeg}
                onChange={(volume, live) => {
                  const next = P.updateSegment(history!.present, currentSeg.id, { volume });
                  if (live) {
                    setDraft(next);
                    projectRef.current = next;
                    const pl = playerFor(currentSeg.sourceId).player;
                    pl.volume = volume;
                    pl.muted = volume <= 0.001;
                  } else {
                    setDraft(null);
                    apply(next);
                  }
                }}
              />
            ) : null}
            {panel === "speed" && currentSeg ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                {P.SPEEDS.map((s) => (
                  <Chip key={s} label={`${s}×`} on={currentSeg.speed === s} onPress={() => apply(P.updateSegment(project, currentSeg.id, { speed: s }), "light")} />
                ))}
              </View>
            ) : null}
            {panel === "order" && currentSeg ? (
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Chip label={tr("Plus tôt")} icon={<ArrowLeft size={16} color={colors.fg} />} on={false} onPress={() => apply(P.moveSegment(project, currentSeg.id, -1), "light")} />
                <Chip label={tr("Plus tard")} icon={<ArrowRight size={16} color={colors.fg} />} on={false} onPress={() => apply(P.moveSegment(project, currentSeg.id, 1), "light")} />
                <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }}>{tr("Déplace la séquence sélectionnée.")}</Text>
              </View>
            ) : null}
            {panel === "text" && textItem ? (
              <TextPanel
                item={textItem}
                total={total}
                onChange={(patch) => apply(P.updateText(project, textItem.id, patch))}
                onDelete={() => {
                  apply(P.removeText(project, textItem.id), "light");
                  setSelectedText(null);
                  setPanel(null);
                }}
              />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {/* Export progress */}
      <Modal visible={exporting != null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 }}>{tr("Création de ta vidéo…")}</Text>
          <View style={{ width: 220, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
            <View style={{ width: `${Math.round((exporting ?? 0) * 100)}%`, height: "100%", backgroundColor: colors.accent }} />
          </View>
          <Text style={{ color: colors.muted, fontVariant: ["tabular-nums"] }}>{Math.round((exporting ?? 0) * 100)} %</Text>
          <Press onPress={() => void cancelStudioExport()} style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", flexDirection: "row", alignItems: "center", gap: 6 }}>
            <X size={16} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{tr("Arrêter")}</Text>
          </Press>
        </View>
      </Modal>
    </View>
  );
}

function ThumbTile({ uri }: { uri: string }) {
  return <Image source={{ uri }} style={{ width: TILE, height: "100%" }} contentFit="cover" />;
}

function Tool({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Press accessibilityLabel={label} onPress={onPress} style={{ minWidth: 58, height: 56, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 4 }}>
      {icon}
      <Text style={{ color: colors.fg, fontSize: 11, fontFamily: "Inter_500Medium" }}>{label}</Text>
    </Press>
  );
}

function Chip({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Press onPress={onPress} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? colors.accent : colors.chipStrong }}>
      {icon}
      <Text style={{ color: on ? colors.accentFg : colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{label}</Text>
    </Press>
  );
}

function SoundPanel({ seg, onChange }: { seg: P.StudioSegment; onChange: (volume: number, live: boolean) => void }) {
  const on = seg.volume > 0.001;
  return (
    <View style={{ gap: 14 }}>
      <Press onPress={() => onChange(on ? 0 : 1, false)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium", fontSize: 15 }}>{tr("Conserver le son de cette séquence")}</Text>
        <View style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: on ? colors.accent : colors.chipStrong, alignItems: on ? "flex-end" : "flex-start" }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff" }} />
        </View>
      </Press>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {on ? <Volume2 size={20} color={colors.fg} /> : <VolumeX size={20} color={colors.muted} />}
        <Slider value={seg.volume} onChange={onChange} />
        <Text style={{ color: colors.fg, width: 44, textAlign: "right", fontVariant: ["tabular-nums"] }}>{Math.round(seg.volume * 100)} %</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Ce réglage ne change que la séquence sélectionnée.")}</Text>
    </View>
  );
}

function Slider({ value, onChange }: { value: number; onChange: (v: number, live: boolean) => void }) {
  const width = useRef(1);
  const left = useRef(0);
  const viewRef = useRef<View>(null);
  const last = useRef(value);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          viewRef.current?.measure((_x, _y, w, _h, pageX) => {
            width.current = w || 1;
            left.current = pageX;
          });
          const v = Math.max(0, Math.min(1, e.nativeEvent.locationX / width.current));
          last.current = v;
          onChange(v, true);
        },
        onPanResponderMove: (e) => {
          const v = Math.max(0, Math.min(1, (e.nativeEvent.pageX - left.current) / width.current));
          last.current = Math.round(v * 100) / 100;
          onChange(last.current, true);
        },
        onPanResponderRelease: () => onChange(last.current, false),
        onPanResponderTerminate: () => onChange(last.current, false),
      }),
    [onChange],
  );
  return (
    <View
      ref={viewRef}
      {...responder.panHandlers}
      onLayout={(e) => {
        width.current = e.nativeEvent.layout.width || 1;
        viewRef.current?.measure((_x, _y, _w, _h, pageX) => (left.current = pageX));
      }}
      style={{ flex: 1, height: 32, justifyContent: "center" }}
    >
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.chipStrong }}>
        <View style={{ width: `${value * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
      </View>
      <View style={{ position: "absolute", left: `${value * 100}%`, marginLeft: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" }} />
    </View>
  );
}

function TextPanel({ item, total, onChange, onDelete }: { item: P.StudioText; total: number; onChange: (patch: Partial<P.StudioText>) => void; onDelete: () => void }) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(item.text);
  const [writing, setWriting] = useState(item.text === tr("Ton texte"));
  useEffect(() => setValue(item.text), [item.id]); // eslint-disable-line react-hooks/exhaustive-deps
  function finish() {
    setWriting(false);
    const v = value.trim();
    if (v && v !== item.text) onChange({ text: v });
    else setValue(item.text);
  }
  const step = 0.5;
  const fontSize = Math.round(item.size * 400);
  return (
    <View style={{ gap: 10 }}>
      <Press accessibilityLabel={tr("Modifier le texte")} onPress={() => setWriting(true)} style={{ minHeight: 48, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface2, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Type size={18} color={colors.accent} />
        <Text numberOfLines={2} style={{ flex: 1, color: colors.fg, fontFamily: "Inter_500Medium", fontSize: 15 }}>{item.text}</Text>
        <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{tr("Modifier")}</Text>
      </Press>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 13, width: 62 }}>{tr("Début")}</Text>
        <Chip label="−" on={false} onPress={() => onChange({ from: item.from - step })} />
        <Text style={{ color: colors.fg, width: 46, textAlign: "center", fontVariant: ["tabular-nums"] }}>{clock(item.from)}</Text>
        <Chip label="+" on={false} onPress={() => onChange({ from: Math.min(item.to - 0.2, item.from + step) })} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 13, width: 62 }}>{tr("Fin")}</Text>
        <Chip label="−" on={false} onPress={() => onChange({ to: item.to - step })} />
        <Text style={{ color: colors.fg, width: 46, textAlign: "center", fontVariant: ["tabular-nums"] }}>{clock(item.to)}</Text>
        <Chip label="+" on={false} onPress={() => onChange({ to: Math.min(total, item.to + step) })} />
        <View style={{ flex: 1 }} />
        <Press accessibilityLabel={tr("Supprimer le texte")} onPress={onDelete} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.chipStrong }}>
          <Trash2 size={18} color={colors.danger} />
        </Press>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Déplace le texte avec le doigt sur la vidéo.")}</Text>

      {/* One screen to write and style the text, like Instagram: live preview at the top, options just above the keyboard. */}
      <Modal visible={writing} transparent animationType="fade" onRequestClose={finish}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Press accessibilityLabel={tr("Plus petit")} onPress={() => onChange({ size: item.size - 0.01 })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 }}>A−</Text>
              </Press>
              <Press accessibilityLabel={tr("Plus grand")} onPress={() => onChange({ size: item.size + 0.01 })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 }}>A+</Text>
              </Press>
            </View>
            <Press accessibilityLabel={tr("Terminé")} onPress={finish} style={{ height: 38, paddingHorizontal: 20, borderRadius: 19, backgroundColor: colors.accent, justifyContent: "center" }}>
              <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold", fontSize: 15 }}>{tr("Terminé")}</Text>
            </Press>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
            <TextInput
              value={value}
              onChangeText={setValue}
              autoFocus
              multiline
              placeholder={tr("Ton texte")}
              placeholderTextColor="rgba(255,255,255,0.5)"
              selectionColor={colors.accent}
              style={{
                maxWidth: "100%",
                textAlign: "center",
                color: item.color,
                fontSize,
                lineHeight: fontSize * 1.2,
                fontFamily: item.font === "bold" ? "Inter_800ExtraBold" : "Inter_600SemiBold",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: item.style === "box" ? "rgba(0,0,0,0.6)" : "transparent",
                textShadowColor: item.style === "outline" ? "#000" : "transparent",
                textShadowRadius: item.style === "outline" ? 4 : 0,
              }}
            />
          </View>
          <View style={{ paddingBottom: 10, gap: 10 }}>
            <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              <Chip label={tr("Simple")} on={item.style === "plain"} onPress={() => onChange({ style: "plain" })} />
              <Chip label={tr("Fond")} on={item.style === "box"} onPress={() => onChange({ style: "box" })} />
              <Chip label={tr("Contour")} on={item.style === "outline"} onPress={() => onChange({ style: "outline" })} />
              <Chip label={tr("Gras")} on={item.font === "bold"} onPress={() => onChange({ font: item.font === "bold" ? "regular" : "bold" })} />
            </ScrollView>
            <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              {STORY_COLORS.map((c) => (
                <Press key={c} accessibilityLabel={c} onPress={() => onChange({ color: c })} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: item.color === c ? 3 : 1, borderColor: item.color === c ? colors.accent : "rgba(255,255,255,0.4)" }} />
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/** Text shown on the preview exactly where it will be in the video; drag it with a finger. */
function DraggableText({
  item,
  stageW,
  stageH,
  selected,
  onSelect,
  onMove,
}: {
  item: P.StudioText;
  stageW: number;
  stageH: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const moved = useRef(false);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
          moved.current = false;
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) + Math.abs(g.dy) > 3) moved.current = true;
          setOffset({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: (_, g) => {
          setOffset({ x: 0, y: 0 });
          if (!moved.current) onSelect();
          else onMove(item.x + g.dx / stageW, item.y + g.dy / stageH);
        },
        onPanResponderTerminate: () => setOffset({ x: 0, y: 0 }),
      }),
    [item.x, item.y, stageW, stageH, onSelect, onMove],
  );
  const fontSize = item.size * stageW;
  const maxW = stageW * 0.86;
  return (
    <View
      {...responder.panHandlers}
      style={{ position: "absolute", left: item.x * stageW - maxW / 2 + offset.x, top: item.y * stageH + offset.y, width: maxW, alignItems: "center", transform: [{ translateY: -fontSize * 0.75 }] }}
    >
      <Text
        style={{
          color: item.color,
          fontSize,
          lineHeight: fontSize * 1.2,
          textAlign: "center",
          fontFamily: item.font === "bold" ? "Inter_800ExtraBold" : "Inter_600SemiBold",
          paddingHorizontal: item.style === "box" ? fontSize * 0.35 : 0,
          paddingVertical: item.style === "box" ? fontSize * 0.2 : 0,
          backgroundColor: item.style === "box" ? "rgba(0,0,0,0.6)" : "transparent",
          borderRadius: fontSize * 0.3,
          overflow: "hidden",
          textShadowColor: item.style === "outline" ? "#000" : "transparent",
          textShadowRadius: item.style === "outline" ? 4 : 0,
          borderWidth: selected ? 1 : 0,
          borderColor: "rgba(255,255,255,0.8)",
        }}
      >
        {item.text}
      </Text>
    </View>
  );
}

function clock(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Deletes an earlier Studio export (never a source video). */
export function forgetStudioFile(uri: string | null | undefined) {
  if (!uri || !uri.includes("wipp-studio-")) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* temporary folder is cleaned by the system */
  }
}
