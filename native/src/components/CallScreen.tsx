import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from "react";
import { ActivityIndicator, Alert, Animated, Easing, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Smile,
  ChevronDown,
  Clock,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Phone,
  PhoneOff,
  SwitchCamera,
  UserPlus,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { Avatar } from "./Avatar";
import { WippWordmark } from "./Logo";
import { Press } from "./ui";
import { palettes } from "../theme";

/** Écran immersif (photo, vidéo, caméra ou appel) : toujours en couleurs sombres, quel que soit le thème. */
const colors = palettes.dark;
import { formatDuration } from "../lib/format";
import { useT, useWippStore } from "../lib/store";
import { acceptCurrentCall, declineCurrentCall, upgradeToVideo, useCallSession, type CallPhase, type CallSession } from "../lib/calls/session";
import { tr } from "../lib/tr";
import { callNotice, sendCallMsg, useCallControls } from "../lib/calls/room-controls";
import { CollectiveReaction, HandQueue, ParticipantReactions, ReactionPicker, SpeakingRing, WippMoment } from "./CallReactions";
import { canSendMoment, canSendReaction, newNonce, type ReactionId } from "../lib/calls/reactions";
const callNoticeSent = () => callNotice(tr("Demande envoyée"));

const BG_TOP = "#070B16";
const BG_BOTTOM = "#02040A";
const GOLD = colors.accent;
const RED = "#F2433A";
const GREEN = "#2ECC5B";
const GREY = "rgba(235,238,245,0.62)";

type RTC = ComponentType<{ streamURL: string; style?: object; objectFit?: "cover" | "contain"; mirror?: boolean; zOrder?: number }>;

const COPY = {
  fr: {
    audio: "Appel audio WIPP",
    get video() { return tr("Appel vidéo WIPP"); },
    get message() { return tr("Message"); },
    remind: "Rappel",
    decline: "Refuser",
    accept: "Accepter",
    mic: "Micro",
    speaker: "Haut-parleur",
    get camera() { return tr("Caméra"); },
    more: "Plus",
    states: {
      outgoing: "Appel…",
      ringing: "Sonnerie…",
      connecting: "Connexion…",
      get connected() { return tr("Connecté"); },
      reconnecting: "Reconnexion…",
      get ended() { return tr("Appel terminé"); },
      get declined() { return tr("Refusé"); },
      get missed() { return tr("Sans réponse"); },
      get busy() { return tr("Occupé"); },
      get failed() { return tr("Échec de connexion"); },
    } as Record<CallPhase, string>,
    a11y: {
      get accept() { return tr("Accepter l’appel"); },
      get decline() { return tr("Refuser l’appel"); },
      get mute() { return tr("Couper le microphone"); },
      get unmute() { return tr("Activer le microphone"); },
      get speakerOn() { return tr("Activer le haut-parleur"); },
      get speakerOff() { return tr("Désactiver le haut-parleur"); },
      get camOn() { return tr("Activer la caméra"); },
      get camOff() { return tr("Désactiver la caméra"); },
      get flip() { return tr("Changer de caméra"); },
      get hangup() { return tr("Raccrocher"); },
      get minimize() { return tr("Réduire l’appel"); },
    },
    get moreTitle() { return tr("Options de l’appel"); },
    get toVideo() { return tr("Passer en vidéo"); },
    get flip() { return tr("Changer de caméra"); },
    get minimize() { return tr("Réduire l’appel"); },
    get cancel() { return tr("Annuler"); },
    remindIn: "Je te rappelle dans 15 minutes",
  },
  en: {
    audio: "WIPP audio call",
    video: "WIPP video call",
    get message() { return tr("Message"); },
    remind: "Remind me",
    decline: "Decline",
    accept: "Accept",
    mic: "Mic",
    speaker: "Speaker",
    camera: "Camera",
    more: "More",
    states: {
      outgoing: "Calling…",
      ringing: "Ringing…",
      connecting: "Connecting…",
      connected: "Connected",
      reconnecting: "Reconnecting…",
      ended: "Call ended",
      declined: "Declined",
      missed: "No answer",
      busy: "Busy",
      failed: "Connection failed",
    } as Record<CallPhase, string>,
    a11y: {
      accept: "Accept call",
      decline: "Decline call",
      mute: "Mute microphone",
      unmute: "Unmute microphone",
      speakerOn: "Turn speaker on",
      speakerOff: "Turn speaker off",
      camOn: "Turn camera on",
      camOff: "Turn camera off",
      flip: "Switch camera",
      hangup: "Hang up",
      minimize: "Minimize call",
    },
    moreTitle: "Call options",
    toVideo: "Switch to video",
    flip: "Switch camera",
    minimize: "Minimize call",
    cancel: "Cancel",
    remindIn: "I'll call you back in 15 minutes",
  },
};

/** Subtle golden halo pulsing around the avatar while it rings. */
function Halo({ size, active }: { size: number; active: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: GOLD,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }],
      }}
    />
  );
}

/** Activity bars under the timer (an animation tied to the call state, not the real audio). */
function Waveform({ active }: { active: boolean }) {
  const bars = 28;
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active, t]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 34, gap: 3 }}>
      {Array.from({ length: bars }, (_, i) => {
        const center = 1 - Math.abs(i - bars / 2) / (bars / 2);
        const base = 0.25 + center * 0.75;
        const phase = (i * 0.37) % 1;
        const scale = active
          ? t.interpolate({ inputRange: [0, phase, Math.min(1, phase + 0.5), 1], outputRange: [base * 0.45, base, base * 0.35, base * 0.45] })
          : 0.2;
        return (
          <Animated.View
            key={i}
            style={{ width: 2.5, height: 34, borderRadius: 2, backgroundColor: center > 0.45 ? GOLD : "rgba(255,216,77,0.35)", transform: [{ scaleY: scale as never }] }}
          />
        );
      })}
    </View>
  );
}

function RoundAction({
  label,
  a11y,
  onPress,
  active,
  children,
  translucent,
}: {
  label: string;
  a11y: string;
  onPress: () => void;
  active?: boolean;
  children: React.ReactNode;
  translucent?: boolean;
}) {
  // Calls with 3+ people: compact row, no labels, so the bottom tiles stay visible.
  const small = useContext(CompactControls);
  return (
    <Press onPress={onPress} accessibilityLabel={a11y} style={{ alignItems: "center", width: small ? 52 : 76 }}>
      <View
        style={{
          width: small ? 46 : 58,
          height: small ? 46 : 58,
          borderRadius: small ? 23 : 29,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? "rgba(255,216,77,0.22)" : translucent ? "rgba(20,24,34,0.55)" : "rgba(255,255,255,0.08)",
          borderWidth: active ? 1 : 0,
          borderColor: GOLD,
        }}
      >
        {children}
      </View>
      {small ? null : <Text numberOfLines={1} style={{ marginTop: 6, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>{label}</Text>}
    </Press>
  );
}

const CompactControls = createContext(false);

function BigButton({ color, label, a11y, onPress, children }: { color: string; label?: string; a11y: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Press onPress={onPress} accessibilityLabel={a11y} style={{ alignItems: "center" }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: color, alignItems: "center", justifyContent: "center", shadowColor: color, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
        {children}
      </View>
      {label ? <Text style={{ marginTop: 10, color: "#fff", fontSize: 15, fontFamily: "Inter_500Medium" }}>{label}</Text> : null}
    </Press>
  );
}

/** Animated WIPP logo (Grok video, 1.4× faster, sound removed, black background removed, endless loop). */
const PAUSE_LOGO = require("../../assets/call-reactions/logo-pause.webp");

/** Shown to the other person while my camera is paused (I left the app for a moment). */
function BeRightBack({ name, avatar, top }: { name: string; avatar?: string; top: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const glow = t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" }}>
      <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <View style={{ alignItems: "center", marginTop: -top / 2 }}>
        <Image source={PAUSE_LOGO} style={{ width: 170, height: 170 }} contentFit="contain" autoplay />
      </View>
      {/* Their photo, big, inside the softly pulsing circle. */}
      <View style={{ width: 210, height: 210, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
        <Animated.View style={{ position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(255,216,77,0.14)", borderWidth: 2, borderColor: "rgba(255,216,77,0.55)", opacity: glow, transform: [{ scale }] }} />
        <Avatar user={{ displayName: name, avatar }} size={172} />
      </View>
      <View style={{ marginTop: 14, alignItems: "center", gap: 6 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" }}>{tr("Je reviens…")}</Text>
        <Text style={{ color: GREY, fontSize: 14, textAlign: "center", paddingHorizontal: 40 }}>{tr("{0} revient dans un instant.", name)}</Text>
      </View>
    </View>
  );
}

/** iPhone: the other person's video keeps playing in a floating window when WIPP goes to the background. */
const CALL_PIP = { iosPIP: { enabled: true, startAutomatically: true, stopAutomatically: true, preferredSize: { width: 9, height: 16 } } } as object;

/** Raised hand: the WIPP hand (Grok animation, transparent), waving in the middle of the tile while the hand is up. */
const RAISED_HAND = require("../../assets/call-reactions/main-levee.webp");
function WavingHand({ size }: { size: number }) {
  return <Image source={RAISED_HAND} style={{ width: size * 1.25, height: size * 1.25 }} contentFit="contain" autoplay />;
}

export type GroupTile = { key: string; identity?: string; local: boolean; name: string; avatar?: string; url: string | null; micOn: boolean; speaking: boolean; level?: number };

/** Group call grid: 1–2 people stacked, then 2 columns (up to 8). Gold ring = speaking. */
function GroupMosaic({ tiles, RTCView, viewEpoch, onTile, onMute, onAskMic }: { tiles: GroupTile[]; RTCView: RTC; viewEpoch: number; onTile?: (tile: GroupTile) => void; /** Organizer: one tap mutes this person. */ onMute?: (tile: GroupTile) => void; /** Organizer: ask this person to turn their mic back on. */ onAskMic?: (tile: GroupTile) => void }) {
  // Up to 8 people fill the screen; more (group calls up to 50) scroll, 2 or 3 per row.
  const many = tiles.length > 8;
  const shown = tiles;
  const hands = useCallControls((s) => s.hands);
  const claps = useCallControls((s) => s.claps);
  const host = useCallControls((s) => s.host);
  const mods = useCallControls((s) => s.mods);
  const [, tick] = useState(0);
  // Applause fades after 3 s: refresh while some is showing.
  useEffect(() => {
    if (!claps.length) return;
    const id = setTimeout(() => tick((n) => n + 1), 3100);
    return () => clearTimeout(id);
  }, [claps]);
  const cols = shown.length <= 2 ? 1 : shown.length > 18 ? 3 : 2;
  const rows = Math.ceil(shown.length / cols);
  const tileSize = many ? { width: `${100 / cols}%` as const, aspectRatio: 0.82 } : { width: `${100 / cols}%` as const, height: `${100 / rows}%` as const };
  const grid = (
    <View style={{ flex: many ? undefined : 1, flexDirection: "row", flexWrap: "wrap" }}>
      {shown.map((tile) => (
        <Pressable key={tile.key} onPress={onTile ? () => onTile(tile) : undefined} style={{ ...tileSize, padding: 4 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 2,
              borderColor: tile.speaking ? GOLD : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {tile.url ? (
              <RTCView key={`tile-${viewEpoch}-${tile.url}`} streamURL={tile.url} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} objectFit="cover" mirror={tile.local} zOrder={1} />
            ) : (
              <SpeakingRing speaking={tile.speaking} level={tile.level} size={many || rows > 2 ? 56 : 84}>
                <Avatar user={{ displayName: tile.name, avatar: tile.avatar }} size={many || rows > 2 ? 56 : 84} />
              </SpeakingRing>
            )}
            <View style={{ position: "absolute", left: 8, right: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 4 }}>
                {tile.name}
              </Text>
              {tile.identity && (tile.identity === host || mods.includes(tile.identity)) ? (
                <Text style={{ fontSize: 11, color: GOLD, fontFamily: "Inter_600SemiBold", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 4 }}>{tile.identity === host ? tr("Organisateur") : `🛡 ${tr("Modo")}`}</Text>
              ) : null}
              {onMute && !tile.local && tile.micOn ? (
                <Press accessibilityLabel={tr("Couper son micro")} onPress={() => onMute(tile)} style={{ marginLeft: "auto", height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.6)", flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Mic size={14} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{tr("Couper")}</Text>
                </Press>
              ) : null}
              {onAskMic && !tile.local && !tile.micOn ? (
                <Press accessibilityLabel={tr("Demander d’activer son micro")} onPress={() => onAskMic(tile)} style={{ marginLeft: "auto", height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: "rgba(255,216,77,0.9)", flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Mic size={14} color="#000" />
                  <Text style={{ color: "#000", fontSize: 11, fontFamily: "Inter_700Bold" }}>{tr("Demander")}</Text>
                </Press>
              ) : null}
              {!tile.micOn ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                  <MicOff size={12} color="#fff" />
                </View>
              ) : null}
            </View>
            {tile.identity && hands.includes(tile.identity) ? (
              <>
                <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" }}>
                  <WavingHand size={rows > 2 ? 64 : 96} />
                </View>
                <View style={{ position: "absolute", top: 8, left: 8, minWidth: 28, paddingHorizontal: 8, height: 28, borderRadius: 14, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#000", fontSize: 13, fontFamily: "Inter_700Bold" }}>{hands.indexOf(tile.identity) + 1}</Text>
                </View>
              </>
            ) : null}
            <ParticipantReactions identity={tile.identity} size={many || rows > 2 ? 70 : 96} />
          </View>
        </Pressable>
      ))}
    </View>
  );
  return many ? <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>{grid}</ScrollView> : grid;
}

export function CallScreen({
  session,
  peer,
  sec,
  terminal,
  remoteUrl,
  remoteMuted,
  localUrl,
  swapped,
  setSwapped,
  viewEpoch,
  groupTiles,
  people,
  onMinimize,
  onHangup,
  RTCView,
}: {
  session: CallSession;
  peer: { displayName: string; username?: string; avatar?: string };
  sec: number;
  terminal: boolean;
  remoteUrl: string | null;
  remoteMuted: boolean;
  localUrl: string | null;
  swapped: boolean;
  setSwapped: (fn: (v: boolean) => boolean) => void;
  viewEpoch: number;
  /** Group call: everyone in the room (me first). */
  groupTiles?: GroupTile[];
  /** Everyone in the room (one-to-one too): who is speaking, for reactions and the speaking ring. */
  people?: { identity: string; local: boolean; speaking: boolean; level?: number }[];
  onMinimize: () => void;
  onHangup: () => void;
  RTCView: RTC;
}) {
  const patch = useCallSession((s) => s.patch);
  const t = useT();
  const c = COPY[t("all") === "All" ? "en" : "fr"];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [more, setMore] = useState(false);
  const [adding, setAdding] = useState(false);
  // Calls with 3+ people: organizer tools, raised hand, applause.
  const host = useCallControls((s) => s.host);
  const hands = useCallControls((s) => s.hands);
  const notice = useCallControls((s) => s.notice);
  const camAsk = useCallControls((s) => s.camAsk);
  const micAsk = useCallControls((s) => s.micAsk);
  const myIdentity = groupTiles?.find((t) => t.local)?.identity ?? null;
  const iAmHost = Boolean(host && myIdentity && host === myIdentity);
  const mods = useCallControls((s) => s.mods);
  // Organizer or moderator: same tools (only the organizer names moderators).
  const iModerate = iAmHost || Boolean(myIdentity && mods.includes(myIdentity));
  const myHand = Boolean(myIdentity && hands.includes(myIdentity));
  const remotePerson = people?.find((p) => !p.local);
  const localPerson = people?.find((p) => p.local);
  const [reacting, setReacting] = useState(false);
  const react = (r: ReactionId) => {
    if (!canSendReaction()) return;
    sendCallMsg({ t: "react", r, n: newNonce(), at: Date.now() });
    // Older WIPP versions only know the applause.
    if (r === "bravo") sendCallMsg({ t: "clap" });
  };
  const [hostTile, setHostTile] = useState<GroupTile | null>(null);
  const [, noticeTick] = useState(0);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => noticeTick((n) => n + 1), 4100);
    return () => clearTimeout(id);
  }, [notice]);
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const incoming = session.dir === "in" && session.phase === "ringing";
  const video = session.kind === "video";
  const connected = session.phase === "connected";
  const remoteVid = remoteUrl && !remoteMuted ? remoteUrl : null;
  const localVid = localUrl && video && !session.camOff ? localUrl : null;
  // Group call in progress: mosaic of everyone instead of the 1-to-1 layout.
  const mosaic = Boolean((session.group || (groupTiles?.length ?? 0) > 2) && (connected || session.phase === "reconnecting") && groupTiles && groupTiles.length > 0);
  // Each camera is independent: the other person's video shows as soon as it arrives (even if
  // mine is off), and my own preview shows as soon as my camera is on (even if theirs is off).
  const videoLive = !mosaic && connected && (!!remoteVid || !!localVid);
  const flip = swapped && !!remoteVid && !!localVid;
  // Video call still ringing: my own camera already fills the screen, like a mirror, behind the caller card.
  const preview = !mosaic && session.dir !== "in" && session.phase === "outgoing" && !!localVid;
  const main = videoLive ? (remoteVid ? (flip ? localVid : remoteVid) : localVid) : preview ? localVid : null;
  const mini = videoLive && remoteVid ? (flip ? remoteVid : localVid) : null;
  const status = connected ? formatDuration(sec) : (session.note && terminal ? session.note : c.states[session.phase]);

  // On live video, controls fade away after a few seconds; a tap brings them back.
  const showControls = () => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (videoLive) hideTimer.current = setTimeout(() => setControls(false), 4500);
  };
  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoLive]);

  const declineAndMessage = () => {
    void declineCurrentCall();
    if (session.userId.startsWith("srvuser:")) {
      const chatId = useWippStore.getState().openOrCreateDm(session.userId);
      useWippStore.getState().push({ name: "conversation", chatId });
    }
  };
  const declineAndRemind = () => {
    void declineCurrentCall();
    void import("expo-notifications")
      .then((N) =>
        N.scheduleNotificationAsync({
          content: { title: "WIPP", body: tr("Rappeler {0}", peer.displayName), data: { type: "remind_call", userId: session.userId } },
          trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 15 * 60 },
        }),
      )
      .catch(() => undefined);
  };

  const logo = <WippWordmark size={videoLive ? 18 : 30} variant="dark" />;
  const avatarSize = Math.min(208, Math.round(width * 0.5));

  return (
    <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100, backgroundColor: BG_BOTTOM }}>
      {main ? (
        <Pressable onPress={showControls} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          <RTCView key={`main-${viewEpoch}-${main}`} streamURL={main} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} objectFit="cover" mirror={main === localVid} zOrder={0} {...(main === remoteVid ? CALL_PIP : {})} />
          {preview ? <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.35)" }} /> : null}
        </Pressable>
      ) : (
        <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      )}

      {/* The other person left the app: animated WIPP logo + « Je reviens… » instead of a frozen picture. */}
      {!mosaic && connected && video && remoteUrl && remoteMuted ? <BeRightBack name={peer.displayName} avatar={peer.avatar} top={insets.top} /> : null}
      {/* Top bar */}
      {(!videoLive || controls) ? (
        <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 6, left: 14, right: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {!incoming ? (
            <Press onPress={onMinimize} accessibilityLabel={c.a11y.minimize} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}>
              <ChevronDown size={22} color="#fff" />
            </Press>
          ) : <View style={{ width: 40 }} />}
          {videoLive ? (
            <View style={{ alignItems: "center" }}>
              {logo}
              <Text style={{ marginTop: 2, color: "#fff", fontSize: 13, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 }}>{status}</Text>
            </View>
          ) : <View />}
          {videoLive && !session.camOff ? (
            <Press onPress={() => patch({ facing: session.facing === "user" ? "environment" : "user" })} accessibilityLabel={c.a11y.flip} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }}>
              <SwitchCamera size={20} color="#fff" />
            </Press>
          ) : <View style={{ width: 40 }} />}
        </View>
      ) : null}

      {mosaic && groupTiles ? (
        <View style={{ position: "absolute", top: insets.top + 56, left: 8, right: 8, bottom: insets.bottom + 66 }}>
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            <Text numberOfLines={1} style={{ color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{peer.displayName}</Text>
            <Text style={{ color: GREY, fontSize: 13, fontVariant: ["tabular-nums"] }}>
              {status} · {groupTiles.length} {tr("participant")}{groupTiles.length > 1 ? "s" : ""}
            </Text>
          </View>
          <GroupMosaic tiles={groupTiles} RTCView={RTCView} viewEpoch={viewEpoch} onMute={iModerate ? (t) => {
            if (!t.identity || (!iAmHost && t.identity === host)) return;
            sendCallMsg({ t: "mute", to: t.identity });
            callNotice(tr("Tu as coupé le micro de {0}", t.name));
          } : undefined} onAskMic={iModerate ? (t) => {
            if (!t.identity) return;
            sendCallMsg({ t: "mic-ask", to: t.identity });
            callNotice(tr("Demande envoyée à {0}", t.name));
          } : undefined} onTile={iModerate ? (t) => {
            if (t.local || !t.identity || (!iAmHost && t.identity === host)) return;
            if (hands.includes(t.identity)) {
              sendCallMsg({ t: "floor", to: t.identity });
              callNotice(tr("Tu donnes la parole à {0}", t.name));
            } else setHostTile(t);
          } : undefined} />
        </View>
      ) : null}

      {/* Identity block (everything except live video) */}
      {!videoLive && !mosaic ? (
        <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 54, left: 0, right: 0, alignItems: "center" }}>
          {logo}
          {incoming || session.phase === "outgoing" ? (
            <Text style={{ marginTop: 12, color: GOLD, fontSize: 18, fontFamily: "Inter_600SemiBold" }}>{video ? c.video : c.audio}</Text>
          ) : null}
          <View style={{ marginTop: incoming ? 28 : 34, alignItems: "center", justifyContent: "center" }}>
            {video && incoming ? (
              <View style={{ width: Math.min(270, width * 0.66), height: Math.min(214, height * 0.25), borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,216,77,0.45)" }}>
                <Avatar user={{ displayName: peer.displayName, avatar: peer.avatar }} size={Math.min(270, width * 0.66)} square />
              </View>
            ) : (
              <>
                <Halo size={avatarSize + 26} active={incoming || session.phase === "outgoing"} />
                <SpeakingRing speaking={Boolean(connected && remotePerson?.speaking)} level={remotePerson?.level} size={avatarSize + 8}>
                  <View style={{ padding: 3, borderRadius: avatarSize, borderWidth: 1, borderColor: "rgba(255,216,77,0.7)" }}>
                    <Avatar user={{ displayName: peer.displayName, avatar: peer.avatar }} size={avatarSize} />
                  </View>
                </SpeakingRing>
                <ParticipantReactions identity={remotePerson?.identity} size={avatarSize * 0.6} />
              </>
            )}
          </View>
          <Text numberOfLines={1} style={{ marginTop: 20, color: "#fff", fontSize: 28, fontFamily: "Inter_600SemiBold", paddingHorizontal: 24 }}>{peer.displayName}</Text>
          {peer.username ? <Text style={{ marginTop: 4, color: GREY, fontSize: 16 }}>@{peer.username}</Text> : null}
          {!incoming ? <Text style={{ marginTop: 12, color: connected ? "#fff" : GREY, fontSize: 18, fontVariant: ["tabular-nums"] }}>{status}</Text> : null}
          {!incoming && !video && !terminal ? (
            <View style={{ marginTop: 14 }}>
              <Waveform active={connected} />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* My camera is off while the other person's video shows: say it clearly (it is NOT on). */}
      {videoLive && remoteVid && !localVid && !mosaic ? (
        <View style={{ position: "absolute", right: 16, bottom: insets.bottom + (controls ? 220 : 40), width: 104, height: 148, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", gap: 6, padding: 8 }}>
          <VideoOff size={22} color={GOLD} />
          <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>{tr("Ta caméra est éteinte")}</Text>
        </View>
      ) : null}

      {/* Local camera, floating bottom-right on live video */}
      {mini && !mosaic ? (
        <Press onPress={() => setSwapped((v) => !v)} style={{ position: "absolute", right: 16, bottom: insets.bottom + (controls ? 220 : 40), width: 104, height: 148, borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)", backgroundColor: "#000", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 10 }}>
          <RTCView key={`mini-${viewEpoch}-${mini}`} streamURL={mini} style={{ width: 104, height: 148 }} objectFit="cover" mirror={mini === localVid} zOrder={1} {...(mini === remoteVid ? CALL_PIP : {})} />
        </Press>
      ) : null}

      {/* Controls */}
      {incoming ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 40, paddingHorizontal: 48 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 36, paddingHorizontal: 6 }}>
            <Press onPress={declineAndMessage} accessibilityLabel={c.message} style={{ alignItems: "center", gap: 6 }}>
              <MessageCircle size={26} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14 }}>{c.message}</Text>
            </Press>
            <Press onPress={declineAndRemind} accessibilityLabel={c.remindIn} style={{ alignItems: "center", gap: 6 }}>
              <Clock size={26} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14 }}>{c.remind}</Text>
            </Press>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <BigButton color={RED} label={c.decline} a11y={c.a11y.decline} onPress={() => void declineCurrentCall()}>
              <PhoneOff size={32} color="#fff" />
            </BigButton>
            <BigButton color={GREEN} label={c.accept} a11y={c.a11y.accept} onPress={() => void acceptCurrentCall()}>
              {video ? <Video size={32} color="#fff" /> : <Phone size={32} color="#fff" />}
            </BigButton>
          </View>
        </View>
      ) : !videoLive || controls ? (
        <CompactControls.Provider value={mosaic}>
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: mosaic ? insets.bottom + 8 : insets.bottom + 28, alignItems: "center", ...(mosaic ? { flexDirection: "row", justifyContent: "center", gap: 2 } : {}) }}>
          {!terminal ? (
            <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: mosaic ? 0 : 26 }}>
              <RoundAction label={c.mic} a11y={session.muted ? c.a11y.unmute : c.a11y.mute} active={session.muted} translucent={videoLive} onPress={() => patch({ muted: !session.muted })}>
                {session.muted ? <MicOff size={22} color={GOLD} /> : <Mic size={22} color="#fff" />}
              </RoundAction>
              {video || (connected && !session.group) ? (
                <RoundAction
                  label={c.camera}
                  a11y={!video || session.camOff ? c.a11y.camOn : c.a11y.camOff}
                  active={!video || session.camOff}
                  translucent={videoLive}
                  onPress={() => (video ? patch({ camOff: !session.camOff }) : void upgradeToVideo())}
                >
                  {!video || session.camOff ? <VideoOff size={22} color={GOLD} /> : <Video size={22} color="#fff" />}
                </RoundAction>
              ) : null}
              <RoundAction label={c.speaker} a11y={session.speaker ? c.a11y.speakerOff : c.a11y.speakerOn} active={session.speaker} translucent={videoLive} onPress={() => patch({ speaker: !session.speaker })}>
                {session.speaker ? <Volume2 size={22} color={GOLD} /> : <VolumeX size={22} color="#fff" />}
              </RoundAction>
              {connected ? (
                <RoundAction label={tr("Réactions")} a11y={tr("Envoyer une réaction")} translucent={videoLive} onPress={() => setReacting(true)}>
                  <Smile size={22} color="#fff" />
                </RoundAction>
              ) : null}
              <RoundAction label={c.more} a11y={c.moreTitle} translucent={videoLive} onPress={() => setMore(true)}>
                <MoreHorizontal size={22} color="#fff" />
              </RoundAction>
            </View>
          ) : null}
          {mosaic ? (
            <Press onPress={onHangup} accessibilityLabel={c.a11y.hangup} style={{ width: 54, height: 46, borderRadius: 23, backgroundColor: RED, alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
              <PhoneOff size={22} color="#fff" />
            </Press>
          ) : (
            <BigButton color={RED} a11y={c.a11y.hangup} onPress={onHangup}>
              <PhoneOff size={30} color="#fff" />
            </BigButton>
          )}
        </View>
        </CompactControls.Provider>
      ) : null}

      {/* Reactions: the other person's over the video (one-to-one video), mine top right, collective in the middle. */}
      {!mosaic && videoLive ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: height * 0.22, height: height * 0.35 }}>
          <ParticipantReactions identity={remotePerson?.identity} size={Math.min(170, width * 0.42)} />
        </View>
      ) : null}
      {!mosaic && connected ? (
        <View pointerEvents="none" style={{ position: "absolute", right: 12, top: insets.top + 60, width: 110, height: 140 }}>
          <ParticipantReactions identity={localPerson?.identity} size={80} />
        </View>
      ) : null}
      <CollectiveReaction size={Math.min(260, width * 0.62)} />
      <WippMoment width={width} height={height} />
      {mosaic && hands.length ? (
        <View style={{ position: "absolute", left: 10, top: insets.top + 60, zIndex: 40 }}>
          <HandQueue
            hands={hands}
            nameOf={(id) => groupTiles?.find((t) => t.identity === id)?.name ?? tr("Quelqu’un")}
            canGive={iModerate}
            onGive={(id) => {
              sendCallMsg({ t: "floor", to: id });
              callNotice(tr("Tu donnes la parole à {0}", groupTiles?.find((t) => t.identity === id)?.name ?? ""));
            }}
          />
        </View>
      ) : null}
      <ReactionPicker visible={reacting} onClose={() => setReacting(false)} onPick={react} bottomInset={insets.bottom} />

      {/* "Plus": only options the call really supports */}
      <Modal visible={more} transparent animationType="fade" onRequestClose={() => setMore(false)}>
        <Pressable onPress={() => setMore(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#0E1320", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: insets.bottom + 18, gap: 4 }}>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 8 }}>{c.moreTitle}</Text>
            {!video && connected && !session.group ? (
              <Press onPress={() => { setMore(false); void upgradeToVideo(); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Video size={20} color={GOLD} />
                <Text style={{ color: "#fff", fontSize: 15 }}>{c.toVideo}</Text>
              </Press>
            ) : null}
            {video && !session.camOff ? (
              <Press onPress={() => { setMore(false); patch({ facing: session.facing === "user" ? "environment" : "user" }); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <SwitchCamera size={20} color={GOLD} />
                <Text style={{ color: "#fff", fontSize: 15 }}>{c.flip}</Text>
              </Press>
            ) : null}
            {mosaic ? (
              <Press onPress={() => { setMore(false); sendCallMsg({ t: "hand", up: !myHand }); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, width: 20, textAlign: "center" }}>✋</Text>
                <Text style={{ color: "#fff", fontSize: 15 }}>{myHand ? tr("Baisser la main") : tr("Lever la main")}</Text>
              </Press>
            ) : null}
            {mosaic ? (
              <Press onPress={() => { setMore(false); react("bravo"); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, width: 20, textAlign: "center" }}>👏</Text>
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("Applaudir")}</Text>
              </Press>
            ) : null}
            {connected ? (
              <Press
                onPress={() => {
                  setMore(false);
                  if (!canSendMoment()) {
                    callNotice(tr("Un WIPP Moment toutes les 30 secondes au maximum."));
                    return;
                  }
                  sendCallMsg({ t: "moment", n: newNonce(), at: Date.now() });
                }}
                style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <Text style={{ fontSize: 18, width: 20, textAlign: "center" }}>🎊</Text>
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("WIPP Moment")}</Text>
              </Press>
            ) : null}
            {connected && !session.group && session.callId ? (
              <Press onPress={() => { setMore(false); setTimeout(() => setAdding(true), 400); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <UserPlus size={20} color={GOLD} />
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("Ajouter une personne")}</Text>
              </Press>
            ) : null}
            <Press onPress={() => { setMore(false); onMinimize(); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
              <ChevronDown size={20} color={GOLD} />
              <Text style={{ color: "#fff", fontSize: 15 }}>{c.minimize}</Text>
            </Press>
            <Press onPress={() => setMore(false)} style={{ paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: GREY, fontSize: 15 }}>{c.cancel}</Text>
            </Press>
          </View>
        </Pressable>
      </Modal>
      {notice && Date.now() - notice.at < 4000 ? (
        <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16, alignItems: "center" }}>
          <View style={{ backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: "#fff", fontSize: 14, textAlign: "center" }}>{notice.text}</Text>
          </View>
        </View>
      ) : null}
      {/* The organizer asks me to turn my camera on: my choice. */}
      <Modal visible={micAsk && session.muted} transparent animationType="fade" onRequestClose={() => useCallControls.setState({ micAsk: false })}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 28 }}>
          <View style={{ width: "100%", backgroundColor: "#0E1320", borderRadius: 20, padding: 20, gap: 14 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>{tr("L’organisateur te propose de reprendre la parole")}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Press onPress={() => useCallControls.setState({ micAsk: false })} style={{ flex: 1, height: 46, borderRadius: 23, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("Pas maintenant")}</Text>
              </Press>
              <Press onPress={() => { useCallControls.setState({ micAsk: false }); patch({ muted: false }); }} style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#000", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{tr("Activer mon micro")}</Text>
              </Press>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={camAsk} transparent animationType="fade" onRequestClose={() => useCallControls.setState({ camAsk: false })}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", backgroundColor: "#0E1320", borderRadius: 20, padding: 20, gap: 14 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>{tr("L’organisateur te demande d’activer ta caméra")}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Press onPress={() => useCallControls.setState({ camAsk: false })} style={{ flex: 1, height: 46, borderRadius: 23, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("Pas maintenant")}</Text>
              </Press>
              <Press
                onPress={() => {
                  useCallControls.setState({ camAsk: false });
                  if (video) patch({ camOff: false });
                  else void upgradeToVideo();
                }}
                style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#000", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{tr("Activer")}</Text>
              </Press>
            </View>
          </View>
        </View>
      </Modal>
      {/* Organizer: actions on one person. */}
      <Modal visible={Boolean(hostTile)} transparent animationType="fade" onRequestClose={() => setHostTile(null)}>
        <Pressable onPress={() => setHostTile(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#0E1320", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: insets.bottom + 18, gap: 4 }}>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 8 }}>{hostTile?.name}</Text>
            {hostTile?.identity && hands.includes(hostTile.identity) ? (
              <Press onPress={() => { if (hostTile?.identity) sendCallMsg({ t: "floor", to: hostTile.identity }); setHostTile(null); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, width: 20, textAlign: "center" }}>🎤</Text>
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("Donner la parole")}</Text>
              </Press>
            ) : null}
            {hostTile?.micOn ? (
              <Press onPress={() => { if (hostTile?.identity) sendCallMsg({ t: "mute", to: hostTile.identity }); setHostTile(null); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <MicOff size={20} color={GOLD} />
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("Couper son micro")}</Text>
              </Press>
            ) : null}
            {hostTile && !hostTile.micOn ? (
              <Press onPress={() => { if (hostTile?.identity) sendCallMsg({ t: "mic-ask", to: hostTile.identity }); setHostTile(null); callNoticeSent(); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Mic size={20} color={GOLD} />
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("Demander d’activer son micro")}</Text>
              </Press>
            ) : null}
            {!hostTile?.url ? (
              <Press onPress={() => { if (hostTile?.identity) sendCallMsg({ t: "cam-ask", to: hostTile.identity }); setHostTile(null); callNoticeSent(); }} style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Video size={20} color={GOLD} />
                <Text style={{ color: "#fff", fontSize: 15 }}>{tr("Demander d’activer sa caméra")}</Text>
              </Press>
            ) : null}
            {iAmHost && hostTile?.identity && hostTile.identity !== host ? (
              <Press
                onPress={() => {
                  const id = hostTile?.identity;
                  if (!id) return;
                  const on = !mods.includes(id);
                  sendCallMsg({ t: "mod", to: id, on });
                  callNotice(on ? tr("{0} est maintenant modérateur", hostTile?.name ?? "") : tr("{0} n’est plus modérateur", hostTile?.name ?? ""));
                  setHostTile(null);
                }}
                style={{ paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <Text style={{ fontSize: 18, width: 20, textAlign: "center" }}>🛡</Text>
                <Text style={{ color: "#fff", fontSize: 15 }}>{hostTile?.identity && mods.includes(hostTile.identity) ? tr("Retirer modérateur") : tr("Nommer modérateur")}</Text>
              </Press>
            ) : null}
            <Press onPress={() => setHostTile(null)} style={{ paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: GREY, fontSize: 15 }}>{c.cancel}</Text>
            </Press>
          </View>
        </Pressable>
      </Modal>
      {adding && session.callId ? <AddToCallSheet callId={session.callId} exclude={[session.userId]} onClose={() => setAdding(false)} bottomInset={insets.bottom} /> : null}
    </View>
  );
}

/** Contacts to add to a one-to-one call in progress (up to 10 people in the call). */
function AddToCallSheet({ callId, exclude, onClose, bottomInset }: { callId: string; exclude: string[]; onClose: () => void; bottomInset: number }) {
  const users = useWippStore((s) => s.users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);
  // Keyed by store id (some entries have no id field): real contacts only, never a crash on a missing name.
  const contacts = Object.entries(users)
    .filter(([key, u]) => Boolean(u && key.startsWith("srvuser:") && u.connected && !exclude.includes(key)))
    .map(([key, u]) => ({ ...u!, id: key, label: String(u!.displayName || (u!.username ? `@${u!.username}` : "") || tr("Contact")) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const add = async (id: string) => {
    setBusyId(id);
    try {
      const { addToCall } = await import("../lib/calls/livekit-client");
      await addToCall(callId, id);
      setInvited((list) => [...list, id]);
    } catch (err) {
      Alert.alert(tr("Ajouter une personne"), err instanceof Error && err.message ? err.message : tr("Impossible d’ajouter cette personne pour le moment."));
    } finally {
      setBusyId(null);
    }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable onPress={() => undefined} style={{ maxHeight: "70%", backgroundColor: "#0E1320", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: bottomInset + 18 }}>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{tr("Ajouter une personne")}</Text>
          <Text style={{ color: GREY, fontSize: 13, marginTop: 4, marginBottom: 10 }}>{tr("Jusqu’à 10 personnes dans l’appel. La personne reçoit un appel WIPP.")}</Text>
          <ScrollView>
            {contacts.length === 0 ? <Text style={{ color: GREY, fontSize: 14, paddingVertical: 16 }}>{tr("Aucun autre contact à ajouter.")}</Text> : null}
            {contacts.map((u) => {
              const done = invited.includes(u.id);
              return (
                <Press key={u.id} disabled={done || busyId !== null} onPress={() => void add(u.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
                  <Avatar user={u} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_500Medium" }} numberOfLines={1}>{u.label}</Text>
                    {u.username ? <Text style={{ color: GREY, fontSize: 12 }} numberOfLines={1}>@{u.username}</Text> : null}
                  </View>
                  {busyId === u.id ? <ActivityIndicator color={GOLD} /> : <Text style={{ color: done ? GREY : GOLD, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{done ? tr("Appel en cours…") : tr("Ajouter")}</Text>}
                </Press>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
