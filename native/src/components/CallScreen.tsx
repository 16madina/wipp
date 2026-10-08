import { useEffect, useRef, useState, type ComponentType } from "react";
import { Animated, Easing, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronDown,
  Clock,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Phone,
  PhoneOff,
  SwitchCamera,
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
    video: "Appel vidéo WIPP",
    message: "Message",
    remind: "Rappel",
    decline: "Refuser",
    accept: "Accepter",
    mic: "Micro",
    speaker: "Haut-parleur",
    camera: "Caméra",
    more: "Plus",
    states: {
      outgoing: "Appel…",
      ringing: "Sonnerie…",
      connecting: "Connexion…",
      connected: "Connecté",
      reconnecting: "Reconnexion…",
      ended: "Appel terminé",
      declined: "Refusé",
      missed: "Sans réponse",
      busy: "Occupé",
      failed: "Échec de connexion",
    } as Record<CallPhase, string>,
    a11y: {
      accept: "Accepter l’appel",
      decline: "Refuser l’appel",
      mute: "Couper le microphone",
      unmute: "Activer le microphone",
      speakerOn: "Activer le haut-parleur",
      speakerOff: "Désactiver le haut-parleur",
      camOn: "Activer la caméra",
      camOff: "Désactiver la caméra",
      flip: "Changer de caméra",
      hangup: "Raccrocher",
      minimize: "Réduire l’appel",
    },
    moreTitle: "Options de l’appel",
    toVideo: "Passer en vidéo",
    flip: "Changer de caméra",
    minimize: "Réduire l’appel",
    cancel: "Annuler",
    remindIn: "Je te rappelle dans 15 minutes",
  },
  en: {
    audio: "WIPP audio call",
    video: "WIPP video call",
    message: "Message",
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
  return (
    <Press onPress={onPress} accessibilityLabel={a11y} style={{ alignItems: "center", width: 76 }}>
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? "rgba(255,216,77,0.22)" : translucent ? "rgba(20,24,34,0.55)" : "rgba(255,255,255,0.08)",
          borderWidth: active ? 1 : 0,
          borderColor: GOLD,
        }}
      >
        {children}
      </View>
      <Text numberOfLines={1} style={{ marginTop: 6, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>{label}</Text>
    </Press>
  );
}

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

export type GroupTile = { key: string; local: boolean; name: string; avatar?: string; url: string | null; micOn: boolean; speaking: boolean };

/** Group call grid: 1–2 people stacked, then 2 columns (up to 8). Gold ring = speaking. */
function GroupMosaic({ tiles, RTCView, viewEpoch }: { tiles: GroupTile[]; RTCView: RTC; viewEpoch: number }) {
  const shown = tiles.slice(0, 8);
  const cols = shown.length <= 2 ? 1 : 2;
  const rows = Math.ceil(shown.length / cols);
  return (
    <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
      {shown.map((tile) => (
        <View key={tile.key} style={{ width: `${100 / cols}%`, height: `${100 / rows}%`, padding: 4 }}>
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
              <Avatar user={{ displayName: tile.name, avatar: tile.avatar }} size={rows > 2 ? 56 : 84} />
            )}
            <View style={{ position: "absolute", left: 8, right: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 4 }}>
                {tile.name}
              </Text>
              {!tile.micOn ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                  <MicOff size={12} color="#fff" />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
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
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const incoming = session.dir === "in" && session.phase === "ringing";
  const video = session.kind === "video";
  const connected = session.phase === "connected";
  const remoteVid = remoteUrl && !remoteMuted ? remoteUrl : null;
  const localVid = localUrl && video && !session.camOff ? localUrl : null;
  // Group call in progress: mosaic of everyone instead of the 1-to-1 layout.
  const mosaic = Boolean(session.group && (connected || session.phase === "reconnecting") && groupTiles && groupTiles.length > 0);
  // Each camera is independent: the other person's video shows as soon as it arrives (even if
  // mine is off), and my own preview shows as soon as my camera is on (even if theirs is off).
  const videoLive = !mosaic && connected && (!!remoteVid || !!localVid);
  const flip = swapped && !!remoteVid && !!localVid;
  const main = videoLive ? (remoteVid ? (flip ? localVid : remoteVid) : localVid) : null;
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
          content: { title: "WIPP", body: `Rappeler ${peer.displayName}`, data: { type: "remind_call", userId: session.userId } },
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
          <RTCView key={`main-${viewEpoch}-${main}`} streamURL={main} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} objectFit="cover" mirror={main === localVid} zOrder={0} />
        </Pressable>
      ) : (
        <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      )}

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
        <View style={{ position: "absolute", top: insets.top + 56, left: 8, right: 8, bottom: insets.bottom + 190 }}>
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            <Text numberOfLines={1} style={{ color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{peer.displayName}</Text>
            <Text style={{ color: GREY, fontSize: 13, fontVariant: ["tabular-nums"] }}>
              {status} · {groupTiles.length} participant{groupTiles.length > 1 ? "s" : ""}
            </Text>
          </View>
          <GroupMosaic tiles={groupTiles} RTCView={RTCView} viewEpoch={viewEpoch} />
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
                <View style={{ padding: 3, borderRadius: avatarSize, borderWidth: 1, borderColor: "rgba(255,216,77,0.7)" }}>
                  <Avatar user={{ displayName: peer.displayName, avatar: peer.avatar }} size={avatarSize} />
                </View>
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
          <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>Ta caméra est éteinte</Text>
        </View>
      ) : null}

      {/* Local camera, floating bottom-right on live video */}
      {mini && !mosaic ? (
        <Press onPress={() => setSwapped((v) => !v)} style={{ position: "absolute", right: 16, bottom: insets.bottom + (controls ? 220 : 40), width: 104, height: 148, borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)", backgroundColor: "#000", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 10 }}>
          <RTCView key={`mini-${viewEpoch}-${mini}`} streamURL={mini} style={{ width: 104, height: 148 }} objectFit="cover" mirror={mini === localVid} zOrder={1} />
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
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 28, alignItems: "center" }}>
          {!terminal ? (
            <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 26 }}>
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
              <RoundAction label={c.more} a11y={c.moreTitle} translucent={videoLive} onPress={() => setMore(true)}>
                <MoreHorizontal size={22} color="#fff" />
              </RoundAction>
            </View>
          ) : null}
          <BigButton color={RED} a11y={c.a11y.hangup} onPress={onHangup}>
            <PhoneOff size={30} color="#fff" />
          </BigButton>
        </View>
      ) : null}

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
    </View>
  );
}
