import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  PanResponder,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, ChevronRight, Pause, Play, Type, X } from "lucide-react-native";
import { Press } from "../components/ui";
import { overlayFromLayers, type StoryLayer } from "../lib/story-overlay";
import { StoryLayerEditor } from "../components/StoryLayerEditor";
import { coverScaleForContain, storyCropRect } from "../lib/story-frame";
import { materializeLibraryVideo, trimVideoSegment } from "wipp-video-trim";
import { useWippStore } from "../lib/store";
import { palettes } from "../theme";

/** Écran immersif (photo, vidéo, caméra ou appel) : toujours en couleurs sombres, quel que soit le thème. */
const colors = palettes.dark;
import { errorText } from "../lib/error-fr";

const MAX_VIDEO_SEC = 60;
const MIN_VIDEO_SEC = 1;

type Phase =
  | { name: "gallery" }
  | { name: "text" }
  | { name: "trim"; uri: string; mime: string; duration: number }
  | { name: "edit"; uri: string; kind: "image" | "video"; mime: string; width?: number; height?: number };

const AUDIENCE_LABEL = {
  contacts: "Mes contacts",
  close: "Proches",
  only_me: "Moi seul",
} as const;

export function NewStoryScreen() {
  const pop = useWippStore((s) => s.pop);
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ name: "gallery" });
  const [text, setText] = useState("");
  const [audience, setAudience] = useState<"contacts" | "only_me" | "close">("contacts");
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [publishLabel, setPublishLabel] = useState("");
  /** Texts and stickers placed on the photo / video. */
  const [layers, setLayers] = useState<StoryLayer[]>([]);
  const overlay = overlayFromLayers(layers);
  const frame = useRef({ scale: 1, x: 0, y: 0, canvasW: 0, canvasH: 0, imageW: 0, imageH: 0 });
  const uploadedPath = useRef<string | null>(null);

  async function publish() {
    if (busy || (phase.name !== "edit" && phase.name !== "text")) return;
    if (phase.name === "text" && !text.trim()) {
      setError("Écris ta story avant de la publier.");
      return;
    }
    setError("");
    setBusy(true);
    const started = Date.now();
    let uploadMs = 0;
    let rpcMs = 0;
    try {
      const { publishStory, refreshStoriesInStore, uploadPrivateMedia, uploadPrivateMediaFile, myProfileId } = await import("../lib/lot7/api");
      let kind: "text" | "image" | "video" = "text";
      let mediaUrl = uploadedPath.current ?? undefined;
      let mime = "image/jpeg";
      let uri = "";
      let finalBytes = 0;
      if (phase.name === "edit") {
        kind = phase.kind;
        mime = phase.mime;
        uri = phase.uri;
        if (phase.kind === "image") {
          setPublishLabel("Publication…");
          const crop = storyCropRect({
            imageWidth: frame.current.imageW || phase.width || 0,
            imageHeight: frame.current.imageH || phase.height || 0,
            canvasWidth: frame.current.canvasW,
            canvasHeight: frame.current.canvasH,
            scale: frame.current.scale,
            translateX: frame.current.x,
            translateY: frame.current.y,
          });
          if (crop) {
            const framed = await manipulateAsync(uri, [{ crop }], { compress: 0.85, format: SaveFormat.JPEG });
            uri = framed.uri;
            mime = "image/jpeg";
            uploadedPath.current = null;
            mediaUrl = undefined;
          }
          const res = await fetch(uri);
          const bytes = new Uint8Array(await res.arrayBuffer());
          if (!mediaUrl) {
            const { storyObjectPath } = await import("../lib/calls/rules");
            mediaUrl = await uploadPrivateMedia(storyObjectPath(await myProfileId(), `styup_${Date.now()}`), bytes, mime);
            uploadedPath.current = mediaUrl;
          }
        } else if (!mediaUrl) {
          finalBytes = localFileBytes(uri);
          setPublishLabel("Publication… 0%");
          const uploadStarted = Date.now();
          const { storyObjectPath } = await import("../lib/calls/rules");
          mediaUrl = await uploadPrivateMediaFile(
            storyObjectPath(await myProfileId(), `styup_${Date.now()}`),
            uri,
            mime,
            (sent, total) => {
              const ratio = total > 0 ? sent / total : 0;
              setPublishLabel(`Publication… ${Math.round(ratio * 100)}%`);
            },
          );
          uploadMs = Date.now() - uploadStarted;
          uploadedPath.current = mediaUrl;
        }
      }
      setPublishLabel("Publication…");
      const rpcStarted = Date.now();
      await publishStory({
        kind,
        body: text.trim(),
        mediaUrl,
        audience,
        overlay: phase.name === "edit" ? overlay : null,
      });
      rpcMs = Date.now() - rpcStarted;
      setPublishLabel("Publié");
      const refreshStarted = Date.now();
      await refreshStoriesInStore(useWippStore.getState().serverProfileId);
      if (__DEV__ && kind === "video") {
        console.warn("[wipp] story video publish", {
          finalBytes,
          uploadMs,
          rpcMs,
          refreshMs: Date.now() - refreshStarted,
          totalMs: Date.now() - started,
        });
      }
      pop();
    } catch (err) {
      const message = errorText(err, "Publication impossible");
      void import("../lib/crash-log").then(({ logAppError }) => logAppError(err, false, `story ${phase.name === "edit" ? phase.kind : "text"}`));
      if (overlay && /could not find|schema cache|p_overlay|function/i.test(message)) {
        setError("Le texte sur la vidéo attend une mise à jour du serveur. La story n’a pas été publiée.");
      } else {
        setError("La publication n’a pas abouti. Réessaie.");
      }
      if (__DEV__) console.warn("[wipp] story publish failed", { message, uploadMs, rpcMs, totalMs: Date.now() - started });
    } finally {
      setBusy(false);
      setPublishLabel("");
    }
  }

  function openAsset(asset: { uri: string; kind: "image" | "video"; mime: string; duration?: number; width?: number; height?: number }) {
    uploadedPath.current = null;
    setLayers([]);
    if (asset.kind === "video") {
      setPhase({ name: "trim", uri: asset.uri, mime: asset.mime, duration: asset.duration ?? 0 });
      return;
    }
    setPhase({ name: "edit", uri: asset.uri, kind: asset.kind, mime: asset.mime, width: asset.width, height: asset.height });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      {phase.name === "gallery" ? <StoryGallery insetsTop={insets.top} onClose={pop} onText={() => setPhase({ name: "text" })} onAsset={openAsset} /> : null}
      {phase.name === "text" ? (
        <TextStoryCanvas text={text} onChange={setText} />
      ) : null}
      {phase.name === "edit" && phase.kind === "image" ? (
        <View style={{ flex: 1 }}>
          <PhotoStage uri={phase.uri} width={phase.width} height={phase.height} frame={frame} />
          <StoryLayerEditor layers={layers} onChange={setLayers} topInset={insets.top} />
        </View>
      ) : null}
      {phase.name === "edit" && phase.kind === "video" ? (
        <View style={{ flex: 1 }}>
          <VideoStage uri={phase.uri} />
          <StoryLayerEditor layers={layers} onChange={setLayers} topInset={insets.top} />
        </View>
      ) : null}
      {phase.name === "trim" ? (
        <VideoTrim
          uri={phase.uri}
          mime={phase.mime}
          duration={phase.duration}
          onCancel={() => setPhase({ name: "gallery" })}
          onConfirm={(uri, mime) => {
            uploadedPath.current = null;
            setLayers([]);
            setPhase({ name: "edit", uri, kind: "video", mime });
          }}
        />
      ) : null}
      {phase.name === "text" || phase.name === "edit" ? (
        <>
          <Press accessibilityLabel="Fermer" onPress={pop} style={{ position: "absolute", top: insets.top + 8, left: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center", zIndex: 4 }}>
            <X size={26} color="#fff" />
          </Press>
          <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16, gap: 10, zIndex: 4 }} pointerEvents="box-none">
            {error ? <Text style={{ color: colors.danger, textAlign: "center" }}>{error}</Text> : null}
            {phase.name === "edit" ? (
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Légende"
                placeholderTextColor="rgba(255,255,255,0.75)"
                style={{ height: 44, borderRadius: 22, paddingHorizontal: 16, color: "#fff", backgroundColor: "rgba(0,0,0,0.45)", fontFamily: "Inter_500Medium" }}
              />
            ) : null}
            <Press accessibilityLabel="Choisir qui peut voir" onPress={() => setAudienceOpen(true)} style={{ height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.55)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{AUDIENCE_LABEL[audience]}</Text>
              <ChevronRight size={18} color="#fff" />
            </Press>
            <Press disabled={busy} accessibilityLabel="Ajouter à ma story" onPress={() => void publish()} style={{ height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 }}>
              <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{busy ? publishLabel || "Publication…" : "Ajouter à ma story"}</Text>
            </Press>
          </View>
        </>
      ) : null}
      <Modal visible={audienceOpen} transparent animationType="slide" onRequestClose={() => setAudienceOpen(false)}>
        <Press onPress={() => setAudienceOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.navy, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 20, gap: 8 }}>
            <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 17, marginBottom: 8 }}>Qui peut voir</Text>
            {(["contacts", "close", "only_me"] as const).map((value) => (
              <Press key={value} onPress={() => { setAudience(value); setAudienceOpen(false); }} style={{ height: 48, borderRadius: 12, backgroundColor: audience === value ? colors.surface2 : "transparent", justifyContent: "center", paddingHorizontal: 12 }}>
                <Text style={{ color: colors.fg, fontSize: 16 }}>{AUDIENCE_LABEL[value]}</Text>
              </Press>
            ))}
          </View>
        </Press>
      </Modal>
    </View>
  );
}

function TextStoryCanvas({ text, onChange }: { text: string; onChange: (value: string) => void }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
        <TextInput
          value={text}
          onChangeText={onChange}
          placeholder="Écris ta story"
          placeholderTextColor="rgba(247,249,252,0.45)"
          multiline
          autoFocus
          blurOnSubmit={false}
          textAlign="center"
          style={{ width: "100%", color: colors.paper, fontSize: 32, fontFamily: "Inter_600SemiBold" }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

function PhotoStage({
  uri,
  width,
  height,
  frame,
}: {
  uri: string;
  width?: number;
  height?: number;
  frame: MutableRefObject<{ scale: number; x: number; y: number; canvasW: number; canvasH: number; imageW: number; imageH: number }>;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const imageW = width || frame.current.imageW;
  const imageH = height || frame.current.imageH;

  useEffect(() => {
    if (!imageW || !imageH || !box.w || !box.h) return;
    const next = coverScaleForContain(imageW, imageH, box.w, box.h);
    scale.value = next;
    savedScale.value = next;
    frame.current = { ...frame.current, scale: next, imageW, imageH, canvasW: box.w, canvasH: box.h };
  }, [imageW, imageH, box.w, box.h, scale, savedScale, frame]);

  function remember() {
    frame.current = {
      ...frame.current,
      scale: scale.value,
      x: tx.value,
      y: ty.value,
      imageW: imageW || frame.current.imageW,
      imageH: imageH || frame.current.imageH,
    };
  }

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      const next = Math.min(4, Math.max(0.6, savedScale.value * event.scale));
      scale.value = next;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(remember)();
    });
  const pan = Gesture.Pan()
    .maxPointers(1)
    .onUpdate((event) => {
      tx.value = savedX.value + event.translationX;
      ty.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      savedX.value = tx.value;
      savedY.value = ty.value;
      runOnJS(remember)();
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.navy, overflow: "hidden" }}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setBox({ w, h });
        frame.current = { ...frame.current, canvasW: w, canvasH: h };
      }}
    >
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
        <Animated.View style={[{ flex: 1 }, style]}>
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            onLoad={(event) => {
              const source = event.source;
              if (source?.width && source?.height) {
                frame.current = { ...frame.current, imageW: source.width, imageH: source.height };
              }
            }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function VideoStage({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (clip) => {
    clip.loop = true;
    clip.muted = false;
    clip.volume = 1;
    clip.play();
  });
  useEffect(() => {
    void enableStoryAudio();
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />
    </View>
  );
}

function enableStoryAudio() {
  return import("expo-av").then(({ Audio }) =>
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: false }),
  );
}

function VideoTrim({
  uri,
  mime,
  duration,
  onCancel,
  onConfirm,
}: {
  uri: string;
  mime: string;
  duration: number;
  onCancel: () => void;
  onConfirm: (uri: string, mime: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(Math.min(MAX_VIDEO_SEC, duration));
  const [head, setHead] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const width = useRef(1);
  const startRef = useRef(start);
  const lengthRef = useRef(length);
  const durationRef = useRef(duration);
  const playingRef = useRef(true);
  const seekAt = useRef(0);
  startRef.current = start;
  lengthRef.current = length;
  durationRef.current = duration;
  playingRef.current = playing;
  const drag = useRef({ start: 0, length: Math.min(MAX_VIDEO_SEC, duration), mode: "window" as "window" | "start" | "end" });
  const player = useVideoPlayer(uri, (clip) => {
    clip.loop = false;
    clip.muted = false;
    clip.volume = 1;
    clip.play();
  });
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    void enableStoryAudio();
  }, []);

  useEffect(() => {
    let alive = true;
    const count = 8;
    void Promise.all(
      Array.from({ length: count }, (_, index) =>
        VideoThumbnails.getThumbnailAsync(uri, { time: Math.max(0, Math.floor((duration * index) / Math.max(count - 1, 1)) * 1000) }).then((shot) => shot.uri).catch(() => ""),
      ),
    ).then((frames) => {
      if (alive) setThumbs(frames.filter(Boolean));
    });
    return () => {
      alive = false;
    };
  }, [uri, duration]);

  useEffect(() => {
    player.timeUpdateEventInterval = 0.1;
    player.muted = false;
    player.volume = 1;
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      setHead(currentTime);
      const at = startRef.current;
      const span = lengthRef.current;
      if (!playingRef.current) return;
      if (currentTime >= at + span - 0.04 || currentTime < at - 0.08) {
        player.currentTime = at;
      }
    });
    return () => sub.remove();
  }, [player]);

  function seek(seconds: number) {
    const now = Date.now();
    if (now - seekAt.current < 70) return;
    seekAt.current = now;
    const total = Math.max(durationRef.current, 0);
    playerRef.current.currentTime = Math.max(0, Math.min(seconds, total));
    setHead(seconds);
  }

  function apply(nextStart: number, nextLength: number, preview: "start" | "end") {
    const total = Math.max(durationRef.current, 0);
    const span = Math.min(MAX_VIDEO_SEC, Math.max(MIN_VIDEO_SEC, nextLength));
    const at = Math.max(0, Math.min(nextStart, Math.max(0, total - span)));
    setStart(at);
    setLength(Math.min(span, Math.max(MIN_VIDEO_SEC, total - at)));
    seek(preview === "end" ? at + span - 0.05 : at);
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the finger on the strip (the screen must not steal the drag).
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const total = Math.max(durationRef.current, 0.01);
        const x = event.nativeEvent.locationX;
        const left = (startRef.current / total) * width.current;
        const right = ((startRef.current + lengthRef.current) / total) * width.current;
        const fromLeft = Math.abs(x - left);
        const fromRight = Math.abs(x - right);
        const mode = fromLeft <= 44 && fromLeft <= fromRight ? "start" : fromRight <= 44 ? "end" : "window";
        drag.current = { start: startRef.current, length: lengthRef.current, mode };
      },
      onPanResponderMove: (_event, gesture) => {
        const total = Math.max(durationRef.current, 0.01);
        const delta = (gesture.dx / Math.max(width.current, 1)) * total;
        const origin = drag.current;
        if (origin.mode === "start") {
          const end = origin.start + origin.length;
          const nextStart = origin.start + delta;
          apply(nextStart, end - nextStart, "start");
        } else if (origin.mode === "end") {
          apply(origin.start, origin.length + delta, "end");
        } else {
          apply(origin.start + delta, origin.length, "start");
        }
      },
      onPanResponderRelease: (event, gesture) => {
        if (Math.abs(gesture.dx) > 8) return;
        const time = (event.nativeEvent.locationX / Math.max(width.current, 1)) * durationRef.current;
        seekAt.current = 0;
        seek(time);
        playerRef.current.pause();
        playingRef.current = false;
        setPlaying(false);
      },
    }),
  ).current;

  function togglePlay() {
    const clip = playerRef.current;
    if (playing) {
      clip.pause();
      setPlaying(false);
      return;
    }
    const at = startRef.current;
    const span = lengthRef.current;
    if (clip.currentTime < at || clip.currentTime >= at + span - 0.05) clip.currentTime = at;
    clip.play();
    setPlaying(true);
  }

  async function confirm() {
    if (busy) return;
    const end = start + length;
    if (!(start >= 0 && end > start && end <= duration + 0.25 && end - start <= MAX_VIDEO_SEC + 0.05)) {
      setError("Le passage choisi n’est pas valide.");
      return;
    }
    const keepsWholeClip = duration <= MAX_VIDEO_SEC && start < 0.2 && Math.abs(end - duration) < 0.35;
    setBusy(true);
    setError("");
    player.pause();
    setPlaying(false);
    const sourceBytes = localFileBytes(uri);
    try {
      const trimmed = await trimVideoSegment(uri, start, end);
      if (!(trimmed.duration > 0.2 && trimmed.duration <= MAX_VIDEO_SEC + 0.5)) {
        throw new Error(`output_duration ${trimmed.duration}`);
      }
      if (Math.abs(trimmed.duration - (end - start)) > 3) {
        throw new Error(`output_duration ${trimmed.duration}`);
      }
      if (__DEV__) {
        console.warn("[wipp] video export", {
          sourceBytes,
          finalBytes: trimmed.bytes ?? localFileBytes(trimmed.uri),
          requested: Math.round((end - start) * 10) / 10,
          outputDuration: Math.round(trimmed.duration * 10) / 10,
        });
      }
      if (trimmed.uri !== uri && uri.includes("wipp-src-")) {
        try {
          const source = new File(uri);
          if (source.exists) source.delete();
        } catch {
          /* le fichier temporaire sera purgé par iOS */
        }
      }
      onConfirm(trimmed.uri, videoMime(trimmed.ext || trimmed.uri));
    } catch (err) {
      if (keepsWholeClip) {
        if (__DEV__) console.warn("[wipp] story encode skipped", { sourceBytes, message: errorText(err, String(err)) });
        onConfirm(uri, mime);
        return;
      }
      if (__DEV__) {
        console.warn("[wipp] video trim failed", {
          scheme: uri.split(":")[0],
          file: uri.split("/").pop(),
          duration,
          start,
          end,
          requested: end - start,
          message: errorText(err, String(err)),
        });
      }
      setError("Le découpage de cette vidéo a échoué.");
    } finally {
      setBusy(false);
    }
  }

  const left = duration > 0 ? (start / duration) * 100 : 0;
  const size = duration > 0 ? (length / duration) * 100 : 100;
  const headLeft = duration > 0 ? Math.min(100, Math.max(0, (head / duration) * 100)) : 0;
  const short = duration <= MAX_VIDEO_SEC;
  const label = short && start < 0.2 && Math.abs(start + length - duration) < 0.35 ? "Utiliser cette vidéo" : "Utiliser ce passage";

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />
      <Press accessibilityLabel={playing ? "Pause" : "Lecture"} onPress={togglePlay} style={{ position: "absolute", top: "38%", alignSelf: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
        {playing ? <Pause size={28} color="#fff" /> : <Play size={28} color="#fff" />}
      </Press>
      <Press accessibilityLabel="Fermer" onPress={onCancel} style={{ position: "absolute", top: insets.top + 8, left: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <X size={26} color="#fff" />
      </Press>
      <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, gap: 12, backgroundColor: "rgba(0,0,0,0.72)" }}>
        <Text style={{ color: "#fff", textAlign: "center", fontFamily: "Inter_600SemiBold" }}>
          {formatClock(start)} — {formatClock(start + length)}
        </Text>
        <Text style={{ color: colors.muted, textAlign: "center" }}>
          {Math.round(length)} s{short ? "" : ` · maximum ${MAX_VIDEO_SEC} s`}
        </Text>
        <View
          onLayout={(event) => {
            width.current = event.nativeEvent.layout.width;
          }}
          {...responder.panHandlers}
          style={{ height: 64, borderRadius: 8, overflow: "hidden", backgroundColor: colors.surface2, justifyContent: "center" }}
        >
          {/* pointerEvents none: the finger position is measured on the whole strip, not on one thumbnail. */}
          <View pointerEvents="none" style={{ flexDirection: "row", height: "100%" }}>
            {(thumbs.length ? thumbs : Array.from({ length: 8 }, () => "")).map((thumb, index) =>
              thumb ? (
                <Image key={`${thumb}-${index}`} source={{ uri: thumb }} style={{ flex: 1, height: "100%" }} contentFit="cover" />
              ) : (
                <View key={index} style={{ flex: 1, height: "100%", backgroundColor: index % 2 ? "#1a2436" : "#121a2b" }} />
              ),
            )}
          </View>
          <View pointerEvents="none" style={{ position: "absolute", left: `${left}%`, width: `${Math.max(size, 2)}%`, top: 0, bottom: 0, borderWidth: 3, borderColor: colors.accent, backgroundColor: "rgba(255,216,77,0.18)" }}>
            <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, backgroundColor: colors.accent }} />
            <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 14, backgroundColor: colors.accent }} />
          </View>
          <View pointerEvents="none" style={{ position: "absolute", left: `${headLeft}%`, top: 0, bottom: 0, width: 2, backgroundColor: "#fff" }} />
        </View>
        {duration > MIN_VIDEO_SEC + 1 ? (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {[10, 15, 30, 45, 60]
              .filter((sec) => sec <= Math.min(MAX_VIDEO_SEC, Math.ceil(duration)))
              .map((sec) => {
                const on = Math.abs(length - Math.min(sec, duration)) < 0.5;
                return (
                  <Press
                    key={sec}
                    accessibilityLabel={`Garder ${sec} secondes`}
                    onPress={() => apply(startRef.current, sec, "start")}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? colors.accent : "rgba(255,255,255,0.12)" }}
                  >
                    <Text style={{ color: on ? colors.accentFg : "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{sec} s</Text>
                  </Press>
                );
              })}
          </View>
        ) : null}
        {error ? <Text style={{ color: colors.danger, textAlign: "center" }}>{error}</Text> : null}
        <Press disabled={busy} onPress={() => void confirm()} style={{ height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", opacity: busy ? 0.7 : 1 }}>
          {busy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={colors.accentFg} />
              <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold" }}>Préparation de la vidéo…</Text>
            </View>
          ) : (
            <Text style={{ color: colors.accentFg, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{label}</Text>
          )}
        </Press>
      </View>
    </View>
  );
}

function StoryGallery({
  insetsTop,
  onClose,
  onText,
  onAsset,
}: {
  insetsTop: number;
  onClose: () => void;
  onText: () => void;
  onAsset: (asset: { uri: string; kind: "image" | "video"; mime: string; duration?: number; width?: number; height?: number }) => void;
}) {
  const { width } = useWindowDimensions();
  const cell = Math.floor((width - 4) / 3);
  const [tab, setTab] = useState<"photos" | "albums">("photos");
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [album, setAlbum] = useState<MediaLibrary.Album | null>(null);
  const [limited, setLimited] = useState(false);
  const [notice, setNotice] = useState("");
  const [preparing, setPreparing] = useState(false);

  async function load(nextAlbum?: MediaLibrary.Album | null) {
    const perm = await MediaLibrary.requestPermissionsAsync(false, ["photo", "video"]);
    if (!perm.granted) {
      setNotice("Autorise l’accès aux photos pour afficher ta pellicule. Tu peux aussi prendre une photo.");
      return;
    }
    setLimited(perm.accessPrivileges === "limited");
    setNotice("");
    if (tab === "albums" && !nextAlbum && !album) {
      setAlbums(await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true }));
      setAssets([]);
      return;
    }
    const page = await MediaLibrary.getAssetsAsync({
      first: 90,
      mediaType: ["photo", "video"],
      sortBy: "creationTime",
      album: nextAlbum ?? album ?? undefined,
    });
    setAssets(page.assets);
  }

  useEffect(() => {
    void load().catch(() => setNotice("La photothèque n’a pas pu s’ouvrir."));
  }, [tab]);

  async function choose(asset: MediaLibrary.Asset) {
    if (asset.mediaType === "video") {
      if (preparing) return;
      setPreparing(true);
      setNotice("");
      try {
        const local = await materializeLibraryVideo(asset.id);
        onAsset({
          uri: local.uri,
          kind: "video",
          mime: videoMime(local.ext || local.uri),
          duration: local.duration,
          width: asset.width,
          height: asset.height,
        });
      } catch (err) {
        if (__DEV__) {
          console.warn("[wipp] video prepare failed", {
            scheme: String(asset.uri).split(":")[0],
            duration: asset.duration,
            message: errorText(err, String(err)),
          });
        }
        setNotice("Cette vidéo n’est pas encore disponible sur l’iPhone. Réessaie.");
      } finally {
        setPreparing(false);
      }
      return;
    }
    const info = await MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: true });
    const uri = info.localUri || asset.uri;
    onAsset({
      uri,
      kind: "image",
      mime: "image/jpeg",
      width: asset.width,
      height: asset.height,
    });
  }

  async function camera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.85, videoMaxDuration: MAX_VIDEO_SEC });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const seconds = asset.duration ? asset.duration / 1000 : 0;
    onAsset({
      uri: asset.uri,
      kind: asset.type === "video" ? "video" : "image",
      mime: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      duration: seconds,
      width: asset.width,
      height: asset.height,
    });
  }

  const cells: Array<{ id: string; camera?: boolean; asset?: MediaLibrary.Asset }> =
    tab === "albums" && !album ? [] : [{ id: "camera", camera: true }, ...assets.map((asset) => ({ id: asset.id, asset }))];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: insetsTop + 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" }}>
        <Press accessibilityLabel="Fermer" onPress={onClose} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <X size={26} color="#fff" />
        </Press>
        <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 18 }}>
          {(["photos", "albums"] as const).map((item) => (
            <Press key={item} onPress={() => { setAlbum(null); setTab(item); }}>
              <Text style={{ color: tab === item ? "#fff" : colors.muted, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                {item === "photos" ? "Photos" : "Albums"}
              </Text>
            </Press>
          ))}
        </View>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ paddingVertical: 12 }}>
        <Press onPress={onText} style={{ marginLeft: 16, width: 92, height: 72, borderRadius: 16, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Type size={22} color={colors.accent} />
          <Text style={{ color: colors.paper, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Texte</Text>
        </Press>
      </View>
      {notice ? <Text style={{ color: colors.muted, paddingHorizontal: 16, marginBottom: 8 }}>{notice}</Text> : null}
      {limited ? (
        <Press onPress={() => void MediaLibrary.presentPermissionsPickerAsync(["photo", "video"]).then(() => load(album))} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: colors.accent }}>Modifier la sélection</Text>
        </Press>
      ) : null}
      {tab === "albums" && !album ? (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Press onPress={() => { setAlbum(item); void load(item); }} style={{ height: 56, paddingHorizontal: 16, justifyContent: "center" }}>
              <Text style={{ color: colors.paper, fontSize: 16 }}>{item.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{item.assetCount}</Text>
            </Press>
          )}
        />
      ) : (
        <FlatList
          data={cells}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) =>
            item.camera ? (
              <Press onPress={() => void camera()} style={{ width: cell, height: cell, margin: 1, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
                <Camera size={28} color="#fff" />
              </Press>
            ) : item.asset ? (
              <Press onPress={() => void choose(item.asset!)} style={{ width: cell, height: cell, margin: 1 }}>
                <Image source={{ uri: item.asset.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                {item.asset.mediaType === "video" ? (
                  <Text style={{ position: "absolute", right: 6, bottom: 6, color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{formatClock(item.asset.duration)}</Text>
                ) : null}
              </Press>
            ) : null
          }
        />
      )}
      {preparing ? (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator color="#fff" />
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Préparation de la vidéo…</Text>
        </View>
      ) : null}
    </View>
  );
}

function videoMime(value: string) {
  const ext = value.split("?")[0].split(".").pop()?.toLowerCase() ?? value.toLowerCase();
  return ext === "mp4" || ext === "m4v" ? "video/mp4" : "video/quicktime";
}

function localFileBytes(uri: string) {
  try {
    return new File(uri).info().size ?? 0;
  } catch {
    return 0;
  }
}

function formatClock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
