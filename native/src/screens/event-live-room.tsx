/**
 * Salle WIPP en direct (conférence / masterclass), rattachée à un événement.
 * - Vidéo de l'organisateur en plein écran ; les spectateurs regardent sans publier caméra ni micro.
 * - Commentaires superposés à la vidéo (style live), réactions flottantes, applaudissements collectifs.
 * - Commentaires et réactions = messages de données LiveKit : rien n'est enregistré, pas de replay.
 * - Toute action de modération passe par le serveur WIPP (permissions LiveKit, exclusion).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Easing, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Room, RoomEvent, Track, VideoQuality, type Participant, type RemoteParticipant } from "livekit-client";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff, Flag, Hand, Heart, HelpCircle, LayoutGrid, LogOut, Maximize2, MonitorUp, Mic, MicOff, MoreHorizontal, RefreshCw, Send, SwitchCamera, Users, Video, VideoOff, X } from "lucide-react-native";
import { Press } from "../components/ui";
import { Avatar } from "../components/Avatar";
import { QuestionsSheet, SpotlightCard, useLiveQuestions } from "../components/LiveQuestions";
import { LiveEndScreen } from "../components/LiveEndScreen";
import { ScreenFullscreen, ScreenPicker, ScreenStage, SharingBanner, useFrameSize, type ScreenShare } from "../components/LiveScreenShare";
import { StageGrid, StageInviteCard, StageSheet, stageHeight, useLiveStage, type StageLayout, type StageTile } from "../components/LiveStage";
import { errorText } from "../lib/error-fr";
import { useWippStore } from "../lib/store";
import { palettes } from "../theme";
import type { LiveToken } from "../lib/event-live";

const colors = palettes.dark;
const logoGold = require("../../assets/auth/wipp-logo-gold.png");

// The native WebRTC renderer cannot be imported by React Native Web.
const RTCView = Platform.OS === "web" ? View : (require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc")).RTCView;
function streamURL(track: { mediaStream?: unknown } | null | undefined) {
  const stream = track?.mediaStream as { toURL?: () => string } | undefined;
  return stream?.toURL?.() ?? null;
}

/** Standard reactions for now; WIPP animations will replace them (same codes). */
export const LIVE_REACTIONS = [
  { code: "clap", emoji: "👏", label: "Applaudir" },
  { code: "love", emoji: "❤️", label: "J’adore" },
  { code: "like", emoji: "👍", label: "J’aime" },
  { code: "dislike", emoji: "👎", label: "Je n’aime pas" },
  { code: "laugh", emoji: "😂", label: "Rire" },
  { code: "wow", emoji: "😮", label: "Surprise" },
  { code: "fire", emoji: "🔥", label: "Excellent" },
] as const;
const EMOJI = Object.fromEntries(LIVE_REACTIONS.map((r) => [r.code, r.emoji])) as Record<string, string>;

type Comment = { id: string; name: string; text: string; pid?: string; identity: string; at?: number };
type Floater = { id: number; emoji: string; x: number; anim: Animated.Value };
type Person = { identity: string; name: string; role: string; pid?: string; av?: string };

const COMMENT_MAX = 200;
const COMMENT_GAP_MS = 2000; // anti-spam (the server enforces it too)
const REACTION_GAP_MS = 350;

function roleOf(p: Participant) {
  try {
    return (JSON.parse(p.metadata || "{}") as { role?: string; pid?: string; av?: string }) ?? {};
  } catch {
    return {};
  }
}

export function EventLiveRoomScreen({ eventId }: { eventId: string }) {
  const pop = useWippStore((s) => s.pop);
  const insets = useSafeAreaInsets();
  const roomRef = useRef<Room | null>(null);
  const [info, setInfo] = useState<LiveToken | null>(null);
  const [phase, setPhase] = useState<"connecting" | "connected" | "reconnecting" | "ended" | "failed">("connecting");
  const [failNote, setFailNote] = useState("");
  // Étape C: everyone on stage (organizer + speakers), laid out by StageGrid.
  const [tiles, setTiles] = useState<StageTile[]>([]);
  // Étape D: the shared screen (one at a time), if any.
  const [screen, setScreen] = useState<ScreenShare | null>(null);
  const pickerRef = useRef<{ open: () => Promise<void> } | null>(null);
  const wasSharing = useRef(false);
  const [screenFull, setScreenFull] = useState(false);
  const shareFrame = useFrameSize();
  // Share track the server said is over (host stopped): ignored even if LiveKit has not removed it yet.
  const deadShare = useRef<string | null>(null);
  const refreshRef = useRef<() => void>(() => undefined);
  // Share track for which the best quality was already asked (once per track).
  const askedHigh = useRef<string | null>(null);
  const [shareTick, setShareTick] = useState(0);
  // Immersive scene (viewer, portrait screen share): the title and the controls sit over the picture and hide
  // by themselves; one tap brings them back.
  const [chrome, setChrome] = useState(true);
  const [typing, setTyping] = useState(false);
  const chromeHint = useRef(false);
  const inputRef = useRef<TextInput>(null);
  // Leaving the stage by myself (no « retiré(e) » message then).
  const selfLeft = useRef(false);
  const prevRole = useRef<string | null>(null);
  const [myRole, setMyRole] = useState<"organizer" | "speaker" | "viewer" | null>(null);
  const st = useLiveStage(eventId);
  const handToast = useRef<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [clapWave, setClapWave] = useState(0);
  const [draft, setDraft] = useState("");
  const [showComments, setShowComments] = useState(true);
  const [settings, setSettings] = useState({ commentsOn: true, reactionsOn: true, questionsOn: true, qaMode: false });
  const [sheet, setSheet] = useState<"none" | "people" | "options" | "reactions" | "questions" | "stage" | "layout">("none");
  const [askFocus, setAskFocus] = useState(false);
  // Étape B: questions kept by the server; « q » / « spot » signals refresh them for everyone.
  const qa = useLiveQuestions(eventId);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const lastComment = useRef(0);
  const camWanted = useRef(false);
  // The organizer ended it: no reconnection attempt, straight to the end screen.
  const endedRef = useRef(false);
  const [qaAnnounce, setQaAnnounce] = useState(0);
  // Organizer gone (battery, network…): since when, as the server saw it; the live ends 5 min later.
  const [hostGone, setHostGone] = useState<{ since: number; graceMs: number } | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const prevQa = useRef<boolean | null>(null);
  const micWanted = useRef(false);
  const lastReaction = useRef(0);
  const claps = useRef<number[]>([]);
  const floaterId = useRef(0);
  const isOrganizer = info?.role === "organizer";
  const win = useWindowDimensions();
  const role = myRole ?? info?.role ?? "viewer";
  const publisher = role === "organizer" || role === "speaker";

  // ——— connect ———
  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const refresh = () => {
      if (cancelled) return;
      const all = [room.localParticipant as Participant, ...room.remoteParticipants.values()];
      setPeople(
        all.map((p) => {
          const meta = roleOf(p);
          return { identity: p.identity, name: p.name || "WIPP", role: meta.role ?? "viewer", pid: meta.pid, av: meta.av };
        }),
      );
      // Stage: organizer first, then speakers (anyone allowed to publish), with or without a camera.
      const onStage = all.filter((p) => {
        const role = roleOf(p).role;
        return role === "organizer" || role === "speaker" || Boolean(p.getTrackPublication(Track.Source.Camera)?.track);
      });
      onStage.sort((a, b) => (roleOf(a).role === "organizer" ? -1 : roleOf(b).role === "organizer" ? 1 : 0));
      setTiles(
        onStage.map((p) => {
          const cam = p.getTrackPublication(Track.Source.Camera);
          const mic = p.getTrackPublication(Track.Source.Microphone);
          const meta = roleOf(p);
          return {
            identity: p.identity,
            pid: meta.pid,
            local: p === room.localParticipant,
            name: p.name || "WIPP",
            avatar: meta.av,
            url: cam?.track && !cam.isMuted ? streamURL(cam.track) : null,
            mirror: p === room.localParticipant,
            micOn: Boolean(mic?.track && !mic.isMuted),
            speaking: p.isSpeaking,
            organizer: meta.role === "organizer",
          };
        }),
      );
      // Screen share: a separate track; whoever publishes one is shown big (only the host can).
      // A share track counts only while it is really alive: not ended by iOS, not declared over by the
      // server. Otherwise the viewer would keep a big black screen after the host stopped.
      const liveShare = (p: Participant) => {
        const pub = p.getTrackPublication(Track.Source.ScreenShare);
        const ms = (pub?.track as unknown as { mediaStreamTrack?: { readyState?: string } } | undefined)?.mediaStreamTrack;
        if (!pub?.track || pub.isMuted || ms?.readyState === "ended") return null;
        if (deadShare.current && pub.trackSid === deadShare.current) return null;
        return pub;
      };
      // Host: the iOS broadcast ended without LiveKit noticing → unpublish it ourselves.
      const myPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      const myMs = (myPub?.track as unknown as { mediaStreamTrack?: { readyState?: string } } | undefined)?.mediaStreamTrack;
      if (myPub?.track && myMs?.readyState === "ended") void room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
      const sharer = all.find((p) => liveShare(p));
      const sp = sharer ? liveShare(sharer) : undefined;
      // Viewer: always ask the server for the sharpest version of the shared screen (text must stay readable),
      // whatever the size of the view — the camera tiles keep their automatic quality.
      if (sp && sharer !== room.localParticipant && askedHigh.current !== sp.trackSid) {
        askedHigh.current = sp.trackSid;
        try {
          (sp as unknown as { setVideoQuality?: (q: VideoQuality) => void }).setVideoQuality?.(VideoQuality.HIGH);
        } catch {
          /* quality stays automatic */
        }
      }
      // Real size of the received track (to check the text is sharp, not an enlarged small image).
      const dims = (sp as unknown as { dimensions?: { width: number; height: number } } | undefined)?.dimensions;
      setScreen(
        sharer && sp?.track && !sp.isMuted
          ? { url: streamURL(sp.track), identity: sharer.identity, local: sharer === room.localParticipant, width: dims?.width, height: dims?.height }
          : null,
      );
      // My own role follows what the server wrote in my LiveKit metadata (taken down → viewer at once).
      const mine = roleOf(room.localParticipant).role;
      if (mine === "organizer" || mine === "speaker" || mine === "viewer") setMyRole(mine);
    };
    for (const ev of [
      RoomEvent.Connected,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ParticipantMetadataChanged,
      RoomEvent.ActiveSpeakersChanged,
      RoomEvent.ParticipantPermissionsChanged,
    ]) {
      room.on(ev, refresh);
    }
    refreshRef.current = refresh;
    // Safety net: a missed LiveKit event never leaves a stale (black) share on screen for more than 2 s.
    const sweep = setInterval(refresh, 2000);
    room.on(RoomEvent.Reconnecting, () => !cancelled && setPhase("reconnecting"));
    room.on(RoomEvent.Reconnected, () => !cancelled && setPhase("connected"));
    // Connection fully lost (not just a short cut LiveKit resumes by itself): ask the server whether the
    // live is still on and come back with a fresh token. Only a real end shows « terminé ».
    room.on(RoomEvent.Disconnected, (reason) => {
      if (cancelled) return;
      if (endedRef.current) {
        setPhase("ended");
        return;
      }
      void (async () => {
        const { getLive, liveToken } = await import("../lib/event-live");
        for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
          try {
            const info = await getLive(eventId);
            if (info.state !== "live" || info.myStatus === "banned") break;
            setPhase("reconnecting");
            const tok = await liveToken(eventId);
            await room.connect(tok.url, tok.token);
            if (cancelled) return;
            setPhase("connected");
            refresh();
            // Back after a cut: questions, card on screen and stage roles come back as the server keeps them.
            void qa.reload();
            void st.reload();
            const pubs = tok.role === "organizer" || tok.role === "speaker";
            if (pubs && camWanted.current) await room.localParticipant.setCameraEnabled(true).catch(() => undefined);
            if (pubs && micWanted.current) await room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
            return;
          } catch (err) {
            // Excluded or no longer allowed: stop trying.
            if ((err as { status?: number }).status === 403) {
              setFailNote("L’organisateur t’a retiré(e) de ce direct.");
              setPhase("failed");
              return;
            }
            setPhase("reconnecting");
            await new Promise((ok) => setTimeout(ok, 3000 + attempt * 2000));
          }
        }
        if (!cancelled) setPhase("ended");
        void reason;
      })();
    });
    room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
      if (topic && topic !== "wipp-live") return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
        onData(msg, participant as RemoteParticipant | undefined);
      } catch {
        /* ignore malformed data */
      }
    });

    void (async () => {
      try {
        const { liveToken } = await import("../lib/event-live");
        const tok = await liveToken(eventId);
        if (cancelled) return;
        setInfo(tok);
        setSettings({ commentsOn: tok.settings.commentsOn, reactionsOn: tok.settings.reactionsOn, questionsOn: tok.settings.questionsOn, qaMode: Boolean(tok.settings.qaMode) });
        // Phone audio session (iOS / Android only; the web version has none).
        if (Platform.OS !== "web") {
          const { AudioSession, AndroidAudioTypePresets } = await import("@livekit/react-native");
          await AudioSession.configureAudio({
            android: { audioTypeOptions: AndroidAudioTypePresets.media, preferredOutputList: ["speaker", "bluetooth", "headset"] },
            ios: { defaultOutput: "speaker" },
          });
          await AudioSession.startAudioSession();
        }
        await room.connect(tok.url, tok.token);
        if (cancelled) return;
        setPhase("connected");
        refresh();
        void qa.reload();
        void st.reload();
        if (tok.role === "organizer" || tok.role === "speaker") askToPublish(room);
      } catch (err) {
        if (!cancelled) {
          setFailNote(errorText(err, "Impossible de rejoindre le direct."));
          setPhase("failed");
        }
      }
    })();
    return () => {
      cancelled = true;
      clearInterval(sweep);
      if (room.localParticipant.isScreenShareEnabled) {
        void import("../lib/event-live").then(({ setSharingState }) => setSharingState(eventId, false)).catch(() => undefined);
      }
      void room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
      void room.disconnect();
      if (Platform.OS !== "web") void import("@livekit/react-native").then((m) => m.AudioSession.stopAudioSession()).catch(() => undefined);
    };
  }, [eventId]);

  /** Camera and microphone only after an explicit yes. */
  function askToPublish(room: Room) {
    Alert.alert("Passer à l’antenne", "Activer ta caméra et ton micro pour le direct ?", [
      { text: "Plus tard", style: "cancel" },
      {
        text: "Activer",
        onPress: () => {
          void (async () => {
            try {
              // Speaking: switch to the call audio mode (echo cancellation), loudspeaker on.
              const { AudioSession, AndroidAudioTypePresets } = await import("@livekit/react-native");
              await AudioSession.configureAudio({
                android: { audioTypeOptions: AndroidAudioTypePresets.communication, preferredOutputList: ["speaker", "bluetooth", "headset"] },
                ios: { defaultOutput: "speaker" },
              }).catch(() => undefined);
              await room.localParticipant.setCameraEnabled(true);
              await room.localParticipant.setMicrophoneEnabled(true);
              setCamOn(true);
              setMicOn(true);
              camWanted.current = true;
              micWanted.current = true;
            } catch {
              Alert.alert("Direct", "Autorise la caméra et le micro pour WIPP dans les réglages du téléphone.");
            }
          })();
        },
      },
    ]);
  }

  function onData(msg: Record<string, unknown>, from?: RemoteParticipant) {
    const t = msg.t;
    // Comments only count when they come from the server (already checked there).
    if (t === "c" && msg.from === "server" && typeof msg.text === "string") {
      addComment({
        id: String(msg.id ?? Math.random()),
        name: String(msg.name ?? "WIPP"),
        text: msg.text.slice(0, COMMENT_MAX),
        pid: typeof msg.pid === "string" ? msg.pid : undefined,
        identity: String(msg.identity ?? ""),
      });
    } else if (t === "r" && typeof msg.e === "string" && EMOJI[msg.e]) {
      showReaction(msg.e);
    } else if (t === "delete" && msg.from === "server") {
      setComments((cur) => cur.filter((c) => c.id !== msg.id));
    } else if (t === "settings" && msg.from === "server") {
      setSettings({ commentsOn: Boolean(msg.commentsOn), reactionsOn: Boolean(msg.reactionsOn), questionsOn: Boolean(msg.questionsOn), qaMode: Boolean(msg.qaMode) });
      qa.soon();
    } else if (t === "sharing" && msg.from === "server") {
      // The host started / stopped sharing: stopped → drop the share now, whatever LiveKit still holds.
      const room = roomRef.current;
      if (msg.on) deadShare.current = null;
      else if (room) {
        for (const p of room.remoteParticipants.values()) {
          const sid = p.getTrackPublication(Track.Source.ScreenShare)?.trackSid;
          if (sid) deadShare.current = sid;
        }
      }
      refreshRef.current();
    } else if (t === "spot" && msg.from === "server") {
      const q = (msg.q ?? null) as import("../lib/event-live").LiveQuestion | null;
      qa.setData((cur) => (cur ? { ...cur, spotlight: q } : cur));
      qa.soon();
    } else if (t === "q" && msg.from === "server") {
      qa.soon();
    } else if (t === "stage" && msg.from === "server") {
      st.soon();
      // Organizer: one discreet note per new raised hand (no repeats).
      if (typeof msg.hand === "string" && !handToast.current.has(msg.hand)) {
        handToast.current.add(msg.hand);
        if (roomRef.current && roleOf(roomRef.current.localParticipant).role === "organizer") {
          const who = [...roomRef.current.remoteParticipants.values()].find((x) => x.identity === msg.hand)?.name ?? "Quelqu’un";
          setToast(`✋ ${who} lève la main`);
          setTimeout(() => setToast(null), 3000);
        }
      }
    } else if (t === "ended" && msg.from === "server") {
      endedRef.current = true;
      setPhase("ended");
      void roomRef.current?.disconnect();
    }
  }

  function addComment(c: Comment) {
    // Keep the last 30: older ones scroll away (nothing is stored).
    setComments((cur) => [...cur.slice(-29), { ...c, at: Date.now() }]);
  }

  function showReaction(code: string) {
    const anim = new Animated.Value(0);
    const id = ++floaterId.current;
    setFloaters((cur) => [...cur.slice(-14), { id, emoji: EMOJI[code], x: Math.random() * 30, anim }]);
    Animated.timing(anim, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      setFloaters((cur) => cur.filter((f) => f.id !== id));
    });
    if (code === "clap") {
      const now = Date.now();
      claps.current = [...claps.current.filter((x) => now - x < 3000), now];
      // Many claps at once: one light collective wave.
      if (claps.current.length >= 5) {
        claps.current = [];
        setClapWave((n) => n + 1);
      }
    }
  }

  async function send(payload: Record<string, unknown>) {
    const room = roomRef.current;
    if (!room || phase !== "connected") return false;
    try {
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)), { reliable: true, topic: "wipp-live" });
      return true;
    } catch {
      Alert.alert("Direct", "Envoi impossible pour le moment.");
      return false;
    }
  }

  async function sendComment() {
    const text = draft.trim().slice(0, COMMENT_MAX);
    if (!text || phase !== "connected") return;
    if (!settings.commentsOn && !isOrganizer) {
      Alert.alert("Direct", "L’organisateur a désactivé les commentaires.");
      return;
    }
    if (Date.now() - lastComment.current < COMMENT_GAP_MS) return;
    lastComment.current = Date.now();
    setDraft("");
    try {
      // The server checks it (filter, anti-spam, on/off) and sends it to everyone, me included.
      const { postLiveComment } = await import("../lib/event-live");
      await postLiveComment(eventId, text);
    } catch (err) {
      setDraft(text);
      Alert.alert("Direct", errorText(err, "Commentaire non envoyé."));
    }
  }

  async function react(code: string) {
    if (!settings.reactionsOn && !isOrganizer) return;
    if (Date.now() - lastReaction.current < REACTION_GAP_MS) return;
    lastReaction.current = Date.now();
    showReaction(code);
    await send({ t: "r", e: code });
  }

  function commentMenu(c: Comment) {
    const actions: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
    if (isOrganizer) {
      actions.push({
        text: "Supprimer le commentaire",
        style: "destructive",
        onPress: () => {
          setComments((cur) => cur.filter((x) => x.id !== c.id));
          void import("../lib/event-live").then(({ deleteLiveComment }) => deleteLiveComment(eventId, c.id)).catch(() => undefined);
        },
      });
      if (c.identity !== roomRef.current?.localParticipant.identity) actions.push({ text: "Exclure cette personne", style: "destructive", onPress: () => exclude(c.identity, c.name) });
    }
    if (c.pid) actions.push({ text: "Signaler", onPress: () => report(c.pid!, c.id) });
    actions.push({ text: "Annuler", style: "cancel" });
    Alert.alert(c.name, c.text, actions);
  }

  function report(pid: string, contentId: string) {
    void import("../lib/safety").then(({ REPORT_REASONS, submitContentReport }) => {
      Alert.alert("Signaler", undefined, [
        ...REPORT_REASONS.map((reason) => ({
          text: reason,
          onPress: () => {
            void submitContentReport({ contentType: "profile", contentId: `live:${eventId}:${contentId}`, targetProfileId: pid, reason }).then(
              () => Alert.alert("Signalement envoyé", "Merci. L’équipe WIPP va l’examiner."),
              (err) => Alert.alert("Signalement", errorText(err, "Signalement impossible.")),
            );
          },
        })),
        { text: "Annuler", style: "cancel" as const },
      ]);
    });
  }

  function exclude(identity: string, name: string) {
    Alert.alert("Exclure", `Exclure ${name} de ce direct ? Cette personne ne pourra plus revenir.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Exclure",
        style: "destructive",
        onPress: () => {
          void import("../lib/event-live")
            .then(({ banFromLive }) => banFromLive(eventId, identity))
            .then(() => setComments((cur) => cur.filter((x) => x.identity !== identity)))
            .catch((err) => Alert.alert("Direct", errorText(err, "Exclusion impossible.")));
        },
      },
    ]);
  }

  async function toggleSetting(key: "commentsOn" | "reactionsOn" | "questionsOn" | "qaMode") {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      const { setLiveSettings } = await import("../lib/event-live");
      await setLiveSettings(eventId, { [key]: next[key] });
    } catch (err) {
      setSettings(settings);
      Alert.alert("Direct", errorText(err, "Réglage impossible."));
    }
  }

  // Heartbeat (viewers and speakers): every 30 s the server checks the organizer is still here and
  // ends the live after 5 min without him. We show the countdown and switch to the end screen.
  useEffect(() => {
    if (phase !== "connected" && phase !== "reconnecting") return;
    if (info?.role === "organizer") return;
    let stop = false;
    const beat = async () => {
      try {
        const { getLive } = await import("../lib/event-live");
        const l = await getLive(eventId);
        if (stop) return;
        if (l.state !== "live") {
          endedRef.current = true;
          setPhase("ended");
          void roomRef.current?.disconnect();
          return;
        }
        setHostGone(l.hostAbsentSince ? { since: Date.parse(l.hostAbsentSince), graceMs: l.hostGraceMs ?? 300_000 } : null);
      } catch {
        /* offline: LiveKit reconnection handles it */
      }
    };
    void beat();
    const id = setInterval(() => void beat(), 30_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [phase, info?.role, eventId]);
  // The organizer is back in the room: hide the message at once (no need to wait for the next beat).
  useEffect(() => {
    if (hostGone && tiles.some((t) => t.organizer)) setHostGone(null);
  }, [tiles, hostGone]);
  useEffect(() => {
    if (!hostGone) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hostGone]);

  // Back to the audience (by me or the organizer): LiveKit has stopped my tracks; reset the buttons.
  useEffect(() => {
    if (role === "viewer" && (camOn || micOn)) {
      setCamOn(false);
      setMicOn(false);
      camWanted.current = false;
      micWanted.current = false;
    }
  }, [role]);

  async function stage(body: Parameters<typeof import("../lib/event-live").stageAction>[1]) {
    try {
      const { stageAction } = await import("../lib/event-live");
      st.setStage(await stageAction(eventId, body));
      return true;
    } catch (err) {
      Alert.alert("Scène", errorText(err, "Action impossible."));
      return false;
    }
  }

  // Taken off the stage by the organizer: say it clearly (the person stays in the live as a viewer).
  useEffect(() => {
    const was = prevRole.current;
    prevRole.current = role;
    if (was !== "speaker" || role !== "viewer") return;
    if (selfLeft.current) {
      selfLeft.current = false;
      return;
    }
    if (endedRef.current || phase !== "connected") return;
    Alert.alert("Tu n’es plus sur scène", "L’organisateur t’a retiré(e) de la scène. Ton micro et ta caméra sont coupés ; tu restes dans le direct comme spectateur.");
  }, [role]);

  /** Tap a comment: answer its author (« @Nom » at the start of the comment, shown in colour). */
  function replyTo(c: Comment) {
    if (!settings.commentsOn && !isOrganizer) return;
    setDraft(`@${c.name} `.slice(0, COMMENT_MAX));
    setChrome(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  }

  /** The comment text, with a leading « @Nom » (a reply) in colour. */
  function commentBody(text: string) {
    if (!text.startsWith("@")) return text;
    const names = [...new Set([...comments.map((c) => c.name), ...people.map((p) => p.name)])].sort((a, b) => b.length - a.length);
    const hit = names.find((n) => text.startsWith(`@${n}`));
    const mention = hit ? `@${hit}` : (/^@\S+/.exec(text)?.[0] ?? "");
    if (!mention) return text;
    return (
      <>
        <Text style={{ color: "#7cc4ff", fontFamily: "Inter_600SemiBold" }}>{mention}</Text>
        {text.slice(mention.length)}
      </>
    );
  }

  async function joinStage() {
    if (!(await stage({ action: "answer", accept: true }))) return;
    setMyRole("speaker");
    // Let LiveKit deliver the new rights, then ask for consent: nothing turns on until the person says yes.
    await new Promise((ok) => setTimeout(ok, 700));
    if (roomRef.current) askToPublish(roomRef.current);
  }

  function leaveStageSelf() {
    Alert.alert("Quitter la scène", "Ton micro et ta caméra seront coupés. Tu restes dans le direct comme spectateur.", [
      { text: "Rester", style: "cancel" },
      {
        text: "Quitter la scène",
        onPress: () => {
          void (async () => {
            selfLeft.current = true;
            await roomRef.current?.localParticipant.setCameraEnabled(false).catch(() => undefined);
            await roomRef.current?.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
            if (await stage({ action: "leave" })) setMyRole("viewer");
            else selfLeft.current = false;
          })();
        },
      },
    ]);
  }

  /** Organizer: the « ⋯ » on a speaker's video. Rights are taken back by the server (never turned on remotely). */
  function speakerMenu(t: StageTile) {
    const pid = t.pid ?? st.stage?.speakers.find((x) => x.identity === t.identity)?.pid;
    if (!pid) return;
    const info = st.stage?.speakers.find((x) => x.pid === pid);
    const featured = st.stage?.featured === t.identity;
    // Two on stage: the split screen already shows both big, so « Mettre en avant » is not offered.
    const canFeature = featured || tiles.length > 2;
    Alert.alert(t.name, "Intervenant sur scène", [
      ...(canFeature ? [{ text: featured ? "Revenir à la grille" : "Mettre en avant", onPress: () => void stage({ action: "feature", identity: featured ? null : t.identity }) }] : []),
      { text: info?.micRevoked ? "Rendre le micro" : "Couper le micro", onPress: () => void stage({ action: "media", pid, micRevoked: !info?.micRevoked }) },
      { text: info?.camRevoked ? "Rendre la caméra" : "Couper la caméra", onPress: () => void stage({ action: "media", pid, camRevoked: !info?.camRevoked }) },
      {
        text: "Retirer de la scène",
        style: "destructive",
        onPress: () =>
          Alert.alert("Retirer de la scène", `${t.name} redeviendra spectateur. Son micro et sa caméra seront coupés.`, [
            { text: "Annuler", style: "cancel" },
            { text: "Retirer", style: "destructive", onPress: () => void stage({ action: "leave", pid }) },
          ]),
      },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  /** Host: explain, then the iOS system sheet (« Démarrer la diffusion »), then publish the screen. */
  function startScreenShare() {
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      Alert.alert("Partage d’écran", "Le partage d’écran fonctionne dans l’app WIPP sur iPhone et Android.");
      return;
    }
    Alert.alert(
      "Partager ton écran",
      "Tout ce qui s’affiche sur ton écran sera visible par les spectateurs : présentation, site, app… et aussi tes notifications. Pense à activer « Ne pas déranger ». Rien n’est enregistré.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Continuer",
          onPress: () => {
            void (async () => {
              const room = roomRef.current;
              if (!room) return;
              try {
                // iPhone: the system sheet, then the extension connects once the user taps « Démarrer la diffusion ».
                // Android: nothing to open here — publishing shows the system « Commencer la diffusion » window.
                if (Platform.OS === "ios") await pickerRef.current?.open();
                // One sharp version only (no half-size copy), sharpness before frame rate, a moderate bitrate:
                // slides and text stay readable, and the connection is not overloaded.
                await room.localParticipant.setScreenShareEnabled(true, undefined, {
                  simulcast: false,
                  screenShareEncoding: { maxBitrate: 1_800_000, maxFramerate: 15 },
                  degradationPreference: "maintain-resolution",
                });
                wasSharing.current = true;
                void keepShareSharp(room);
              } catch (err) {
                Alert.alert("Partage d’écran", errorText(err, "Le partage d’écran n’a pas pu démarrer. Tu peux réessayer, le direct continue."));
              }
            })();
          },
        },
      ],
    );
  }

  /**
   * LiveKit assumes a 1280 × 720 landscape source; the iPhone screen is portrait (≈ 664 × 1440 sent by the
   * extension). Make sure the encoder sends it at its real size, never scaled down by a wrong assumption.
   */
  async function keepShareSharp(room: Room) {
    type Enc = { scaleResolutionDownBy?: number; maxBitrate?: number; maxFramerate?: number; active?: boolean };
    // Android captures the screen at full definition (e.g. 1080 × 2400): keep the long side around 1440 px,
    // like the iPhone, so it stays smooth at this bitrate. iPhone: already 664 × 1440, sent as it is.
    const androidScale = () => {
      if (Platform.OS !== "android") return 1;
      const ms = (room.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track as unknown as { mediaStreamTrack?: { getSettings?: () => { width?: number; height?: number } } } | undefined)?.mediaStreamTrack;
      const set = ms?.getSettings?.() ?? {};
      const disp = Dimensions.get("screen");
      const long = Math.max(Number(set.width ?? 0), Number(set.height ?? 0)) || Math.max(disp.width, disp.height) * disp.scale;
      return Math.max(1, long / 1440);
    };
    type Sender = { getParameters: () => { encodings?: Enc[]; degradationPreference?: string }; setParameters: (p: unknown) => Promise<unknown> };
    for (let i = 0; i < 6; i++) {
      await new Promise((ok) => setTimeout(ok, 700));
      const sender = (room.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track as unknown as { sender?: Sender } | undefined)?.sender;
      if (!sender) continue;
      try {
        const params = sender.getParameters();
        const encs = params.encodings ?? [];
        if (!encs.length) continue;
        encs.forEach((e, idx) => {
          e.scaleResolutionDownBy = androidScale();
          e.maxFramerate = 15;
          if (idx === encs.length - 1) e.maxBitrate = 1_800_000;
        });
        params.degradationPreference = "maintain-resolution";
        await sender.setParameters(params);
        return;
      } catch {
        /* the sender is not ready yet: try again */
      }
    }
  }

  // Immersive scene: the controls hide by themselves after 4 s (not while typing or with a panel open).
  const immersiveOn = Boolean(screen && !screen.local && !(shareFrame.size && shareFrame.size.width > shareFrame.size.height));
  useEffect(() => {
    if (immersiveOn) setChrome(true);
  }, [immersiveOn]);
  useEffect(() => {
    if (!immersiveOn || !chrome || typing || draft.length > 0 || sheet !== "none") return;
    const t = setTimeout(() => {
      setChrome(false);
      if (!chromeHint.current) {
        chromeHint.current = true;
        setToast("Touche l’écran pour afficher les commandes");
        setTimeout(() => setToast(null), 2800);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [immersiveOn, chrome, typing, draft.length > 0, sheet]);

  // Sharing: comments float over the bottom of the screen and fade away after a few seconds.
  useEffect(() => {
    if (!screen || !comments.length) return;
    const t = setInterval(() => setShareTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [Boolean(screen), comments.length]);

  async function stopScreenShare() {
    wasSharing.current = false;
    await roomRef.current?.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
  }

  // The sharing ended: leave the viewer's full-screen view by itself.
  useEffect(() => {
    if (!screen) setScreenFull(false);
  }, [screen]);

  // Sharing stopped by iOS (red bar, control centre, interruption): tell the host, the live goes on.
  useEffect(() => {
    if (!isOrganizer) return;
    const mine = screen?.local ?? false;
    if (!mine && wasSharing.current) {
      wasSharing.current = false;
      setToast("Partage d’écran arrêté");
      setTimeout(() => setToast(null), 2500);
    }
    if (mine) wasSharing.current = true;
    // Tell the server, so it can alert the host (pushes) while he is in another app.
    void import("../lib/event-live").then(({ setSharingState }) => setSharingState(eventId, mine)).catch(() => undefined);
  }, [screen?.local, isOrganizer]);

  function flipCamera() {
    const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track as unknown as { mediaStreamTrack?: { _switchCamera?: () => void } } | undefined;
    track?.mediaStreamTrack?._switchCamera?.();
  }

  // « Lancer les questions-réponses »: a short, soft announcement for everyone.
  useEffect(() => {
    if (prevQa.current === false && settings.qaMode) setQaAnnounce((n) => n + 1);
    prevQa.current = settings.qaMode;
  }, [settings.qaMode]);

  async function spotAction(action: "done" | "unshow") {
    const q = qa.data?.spotlight;
    if (!q) return;
    try {
      const { moderateLiveQuestion } = await import("../lib/event-live");
      await moderateLiveQuestion(eventId, q.id, action);
      void qa.reload();
    } catch (err) {
      Alert.alert("Question", errorText(err, "Action impossible."));
    }
  }

  /** « Suivante »: the current one is marked treated, then the most supported waiting question goes on screen. */
  async function spotNext() {
    const cur = qa.data?.spotlight;
    const next = (qa.data?.questions ?? []).filter((q) => q.status === "pending" && q.id !== cur?.id).sort((a, b) => b.votes - a.votes || a.createdAt - b.createdAt)[0];
    try {
      const { moderateLiveQuestion } = await import("../lib/event-live");
      if (cur) await moderateLiveQuestion(eventId, cur.id, "done");
      if (next) await moderateLiveQuestion(eventId, next.id, "show");
      else Alert.alert("Questions", "Il n’y a plus de question en attente.");
      void qa.reload();
    } catch (err) {
      Alert.alert("Question", errorText(err, "Action impossible."));
    }
  }

  function endForAll() {
    Alert.alert("Terminer le direct", "Terminer la conférence pour tout le monde ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Terminer",
        style: "destructive",
        onPress: () => {
          void import("../lib/event-live")
            .then(({ endLive }) => endLive(eventId))
            .then(() => {
              endedRef.current = true;
              setPhase("ended");
              void roomRef.current?.disconnect();
            })
            .catch((err) => Alert.alert("Direct", errorText(err, "Impossible de terminer.")));
        },
      },
    ]);
  }

  function leave() {
    if (isOrganizer && phase === "connected") {
      Alert.alert("Quitter", "Si tu pars sans terminer, le direct s’arrêtera automatiquement dans 5 minutes si tu ne reviens pas.", [
        { text: "Rester", style: "cancel" },
        { text: "Quitter sans terminer", onPress: () => pop() },
        { text: "Terminer pour tous", style: "destructive", onPress: endForAll },
      ]);
      return;
    }
    pop();
  }

  const viewers = Math.max(0, people.filter((p) => p.role === "viewer").length);
  const title = useWippStore((s) => s.lifestyle.find((e) => e.id === eventId)?.title ?? "Direct");
  const ordered = useMemo(() => [...people].sort((a, b) => (a.role === "organizer" ? -1 : b.role === "organizer" ? 1 : a.name.localeCompare(b.name))), [people]);

  // ——— Layout: 1 person = full screen with floating comments (unchanged);
  // 2+ people = videos in a box under the top bar, comments in their own space below. ———
  const layoutPick: StageLayout = st.stage?.layout ?? "shared";
  const featuredOn = Boolean(st.stage?.featured && tiles.some((t) => t.identity === st.stage?.featured));
  // « Invités intégrés »: the host is full screen (like alone), guests float on top, comments float too.
  // « Invités intégrés »: the host is full screen (whole phone), guests float top right, comments float over the video.
  const fullHost = tiles.length >= 3 && layoutPick === "inset" && !featuredOn;
  const sharing = Boolean(screen);
  const multi = (tiles.length > 1 && !fullHost) || sharing;
  const controlsH = Math.max(insets.bottom, 10) + 8 + 44 + 10 + 62 + (settings.qaMode && !isOrganizer && settings.questionsOn ? 52 : 0);
  const spotlightH = qa.data?.spotlight ? 150 : 0;
  // Sharing: the screen goes down to the comment field; nothing is reserved for comments (they float over it).
  // A landscape source (slides) only needs the top of the stage: the comments get the room below as a list.
  const shareLandscape = Boolean(screen && !screen.local && shareFrame.size && shareFrame.size.width > shareFrame.size.height);
  const shareTop = insets.top + 48;
  const sharePicH = shareLandscape && shareFrame.size ? Math.round((win.width * shareFrame.size.height) / shareFrame.size.width) : 0;
  // Immersive scene: a portrait screen has the same shape as the viewer's phone, so it fills the whole
  // screen edge to edge (nothing cropped, nothing stretched); the interface floats over it.
  const immersive = Boolean(screen && !screen.local && !shareLandscape);
  const chromeOn = !immersive || chrome || typing || draft.length > 0 || sheet !== "none";
  const recentComments = sharing && !shareLandscape ? comments.filter((c) => Date.now() - (c.at ?? 0) < 7000).slice(-3) : [];
  void shareTick;
  const stageH = immersive ? win.height : sharing ? Math.round(win.height - controlsH) : fullHost ? win.height : multi ? stageHeight(win.height, controlsH) : 0;
  const box = multi ? { bottom: stageH } : null;
  const commentsMax = shareLandscape ? Math.max(70, stageH - shareTop - sharePicH - 110 - spotlightH) : box ? Math.max(70, win.height - stageH - 10 - spotlightH - controlsH) : qa.data?.spotlight ? 150 : 230;
  const layout: StageLayout = layoutPick;

  if (phase === "ended") {
    return (
      <LiveEndScreen
        eventId={eventId}
        onBack={() => {
          // Back to the events: leave the room and the event sheet behind it.
          const st = useWippStore.getState();
          st.pop();
          if (useWippStore.getState().stack.at(-1)?.name === "lifestyle") useWippStore.getState().pop();
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Stage */}
      {screen ? (
        <ScreenStage screen={screen} tiles={tiles} width={win.width} stageH={stageH} topSafe={insets.top} frame={shareFrame.size} onDimensionsChange={shareFrame.onDimensionsChange} immersive={immersive} bottomPad={controlsH} onTap={immersive ? () => setChrome((v) => !v) : undefined} />
      ) : tiles.some((t) => t.url) || tiles.length > 1 ? (
        <StageGrid
          tiles={tiles}
          featured={st.stage?.featured ?? null}
          layout={layout}
          width={win.width}
          stageH={stageH}
          topSafe={insets.top}
          onMenu={isOrganizer ? speakerMenu : undefined}
        />
      ) : (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", fontSize: 15, lineHeight: 21 }}>
            {phase === "connecting"
              ? "Connexion au direct…"
              : phase === "failed"
                ? failNote
                : publisher && !camOn
                    ? "Ta caméra est éteinte. Active-la pour passer à l’antenne."
                    : "L’organisateur va bientôt apparaître."}
          </Text>
          {publisher && !camOn && phase === "connected" ? (
            <Press onPress={() => roomRef.current && askToPublish(roomRef.current)} style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.accent }}>
              <Text style={{ color: colors.accentFg, fontFamily: "Inter_700Bold" }}>Activer caméra et micro</Text>
            </Press>
          ) : null}
        </View>
      )}

      {/* Top bar */}
      {chromeOn ? (
        <>
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.65)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 110 }} />
      <View style={{ position: "absolute", top: insets.top + 6, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Image source={logoGold} style={{ width: 62, height: 24 }} contentFit="contain" />
        {phase === "connected" || phase === "reconnecting" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: "#e5383b" }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>EN DIRECT</Text>
          </View>
        ) : null}
        {settings.qaMode ? (
          <Press accessibilityLabel="Questions-réponses" onPress={() => setSheet("questions")} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(212,160,23,0.9)" }}>
            <HelpCircle size={12} color="#0b1220" />
            <Text style={{ color: "#0b1220", fontSize: 10, fontFamily: "Inter_700Bold" }}>Q&R</Text>
          </Press>
        ) : null}
        <Press accessibilityLabel="Participants" onPress={() => setSheet("people")} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <Eye size={13} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{viewers}</Text>
        </Press>
        {sharing ? (
          <Text numberOfLines={1} style={{ flex: 1, color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
            {title}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {screen && !screen.local && screen.url && shareLandscape ? (
          <Press accessibilityLabel={shareLandscape ? "Plein écran paysage" : "Plein écran"} onPress={() => setScreenFull(true)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <Maximize2 size={19} color="#d4a017" />
          </Press>
        ) : null}
        {isOrganizer && tiles.length >= 3 ? (
          <Press accessibilityLabel="Disposition de la scène" onPress={() => setSheet("layout")} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <LayoutGrid size={20} color="#d4a017" />
          </Press>
        ) : null}
        <Press accessibilityLabel="Options" onPress={() => setSheet("options")} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <MoreHorizontal size={22} color="#fff" />
        </Press>
        <Press accessibilityLabel="Quitter le direct" onPress={leave} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <X size={22} color="#fff" />
        </Press>
      </View>
        </>
      ) : null}
      <Text numberOfLines={1} style={{ display: sharing ? "none" : "flex", position: "absolute", top: insets.top + 46, left: 14, right: 60, color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 }}>
        {title}
      </Text>
      {phase === "reconnecting" ? (
        <View style={{ position: "absolute", top: insets.top + 72, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.6)" }}>
          <RefreshCw size={13} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12 }}>Reconnexion…</Text>
        </View>
      ) : null}

      {qa.data?.spotlight ? (
        <SpotlightCard
          q={qa.data.spotlight}
          top={sharing ? shareTop + (shareLandscape ? sharePicH + 100 : 8) : box ? box.bottom + 8 : fullHost ? insets.top + 58 + Math.min(win.height - insets.top - 72, win.height * 0.4) + 8 : insets.top + 74}
          organizer={isOrganizer}
          onDone={() => void spotAction("done")}
          onHide={() => void spotAction("unshow")}
          onNext={() => void spotNext()}
        />
      ) : null}

      {/* Floating reactions (right side, never block touches) */}
      <View pointerEvents="none" style={{ position: "absolute", right: 10, bottom: insets.bottom + 120, width: 70, height: box && !immersive ? Math.max(120, win.height - box.bottom - insets.bottom - 130) : 320 }}>
        {floaters.map((f) => (
          <Animated.Text
            key={f.id}
            style={{
              position: "absolute",
              bottom: 0,
              right: f.x,
              fontSize: 30,
              opacity: f.anim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
              transform: [{ translateY: f.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }, { scale: f.anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1.1, 0.9] }) }],
            }}
          >
            {f.emoji}
          </Animated.Text>
        ))}
      </View>
      <ClapWave wave={clapWave} />
      <ScreenPicker ref={pickerRef} />
      {screen && screenFull && !screen.local ? <ScreenFullscreen screen={screen} frame={shareFrame.size} onDimensionsChange={shareFrame.onDimensionsChange} onClose={() => setScreenFull(false)} /> : null}
      {screen?.local ? <SharingBanner top={insets.top + 46} onStop={() => void stopScreenShare()} /> : null}
      {hostGone && !isOrganizer ? (
        <View pointerEvents="none" style={{ position: "absolute", top: "40%", left: 24, right: 24, alignItems: "center" }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18, backgroundColor: "rgba(6,10,24,0.9)", borderWidth: 1, borderColor: "rgba(212,160,23,0.7)" }}>
            <Text style={{ color: "#fff", fontSize: 15, textAlign: "center", fontFamily: "Inter_700Bold" }}>L’organisateur a perdu la connexion</Text>
            <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.75)", fontSize: 13, textAlign: "center", lineHeight: 18 }}>
              {(() => {
                const left = Math.max(0, Math.ceil((hostGone.since + hostGone.graceMs - nowTick) / 1000));
                const mm = Math.floor(left / 60);
                const ss = String(left % 60).padStart(2, "0");
                return `Le direct reprendra dès son retour. Sinon, il se terminera automatiquement dans ${mm}:${ss}.`;
              })()}
            </Text>
          </View>
        </View>
      ) : null}
      <QaAnnounce n={qaAnnounce} />

      {/* Bottom: comments over the video, then the bar */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
        {multi && !(immersive && chromeOn) ? null : <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.8)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: immersive ? 230 : 360 }} />}
        {showComments && sharing && !shareLandscape ? (
          <View pointerEvents="box-none" style={{ paddingLeft: 10, paddingRight: 70, paddingBottom: chromeOn ? 4 : Math.max(insets.bottom, 10) + 6, gap: 4, alignItems: "flex-start" }}>
            {recentComments.map((c) => (
              <Pressable key={c.id} onPress={() => replyTo(c)} onLongPress={() => commentMenu(c)} style={{ maxWidth: "100%", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: "rgba(8,12,24,0.62)" }}>
                <Text numberOfLines={2} style={{ color: "#fff", fontSize: 13, lineHeight: 17 }}>
                  <Text style={{ color: "#e9c46a", fontFamily: "Inter_700Bold" }}>{c.name} </Text>
                  {commentBody(c.text)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : showComments ? (
          <View style={{ maxHeight: commentsMax, paddingLeft: 12, paddingRight: 90 }} pointerEvents="box-none">
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              inverted={false}
              onContentSizeChange={(_, __) => undefined}
              renderItem={({ item }) => (
                <Pressable onPress={() => replyTo(item)} onLongPress={() => commentMenu(item)} style={{ paddingVertical: 4 }}>
                  <Text style={{ color: "#e9c46a", fontSize: 12, fontFamily: "Inter_700Bold", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 }}>{item.name}</Text>
                  <Text style={{ color: "#fff", fontSize: 14, lineHeight: 19, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 }}>{commentBody(item.text)}</Text>
                </Pressable>
              )}
              ref={(list) => {
                if (list && comments.length) setTimeout(() => list.scrollToEnd({ animated: true }), 30);
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : null}
        {chromeOn ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10) }}>
          {settings.qaMode && !isOrganizer && settings.questionsOn ? (
            <Press
              onPress={() => {
                setAskFocus(true);
                setSheet("questions");
              }}
              style={{ alignSelf: "center", marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, height: 42, borderRadius: 21, backgroundColor: "#d4a017", shadowColor: "#d4a017", shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 }}
            >
              <HelpCircle size={18} color="#0b1220" />
              <Text style={{ color: "#0b1220", fontSize: 15, fontFamily: "Inter_700Bold" }}>Poser une question</Text>
            </Press>
          ) : null}
          {settings.commentsOn || isOrganizer ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 22, paddingLeft: 16, paddingRight: 6, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={(v) => setDraft(v.slice(0, COMMENT_MAX))}
                placeholder="Écrire un commentaire…"
                placeholderTextColor="rgba(255,255,255,0.55)"
                returnKeyType="send"
                onFocus={() => setTyping(true)}
                onBlur={() => setTyping(false)}
                onSubmitEditing={() => void sendComment()}
                style={{ flex: 1, color: "#fff", fontSize: 14 }}
              />
              <Press accessibilityLabel="Envoyer" onPress={() => void sendComment()} style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                <Send size={18} color={colors.accent} />
              </Press>
            </View>
          ) : (
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, textAlign: "center", paddingVertical: 10 }}>Les commentaires sont désactivés.</Text>
          )}
          <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-around" }}>
            <BarButton label="Réagir" onPress={() => setSheet(sheet === "reactions" ? "none" : "reactions")} disabled={!settings.reactionsOn && !isOrganizer}>
              <Heart size={20} color="#ff4d6d" fill="#ff4d6d" />
            </BarButton>
            {publisher ? (
              <>
                <BarButton label={micOn ? "Micro" : "Micro coupé"} onPress={() => {
                  const room = roomRef.current;
                  if (!room) return;
                  void room.localParticipant.setMicrophoneEnabled(!micOn).then(() => {
                    micWanted.current = !micOn;
                    setMicOn(!micOn);
                  });
                }}>
                  {micOn ? <Mic size={20} color="#fff" /> : <MicOff size={20} color="#ff6b6b" />}
                </BarButton>
                <BarButton label={camOn ? "Caméra" : "Caméra off"} onPress={() => {
                  const room = roomRef.current;
                  if (!room) return;
                  void room.localParticipant.setCameraEnabled(!camOn).then(() => {
                    camWanted.current = !camOn;
                    setCamOn(!camOn);
                  });
                }}>
                  {camOn ? <Video size={20} color="#fff" /> : <VideoOff size={20} color="#ff6b6b" />}
                </BarButton>
              </>
            ) : (
              <BarButton
                label={st.stage?.me.handRaised ? "Main levée" : "Lever la main"}
                highlight={Boolean(st.stage?.me.handRaised)}
                onPress={() => void stage({ action: "hand", up: !st.stage?.me.handRaised })}
              >
                <Hand size={20} color={st.stage?.me.handRaised ? "#d4a017" : "#fff"} />
              </BarButton>
            )}
            <BarButton
              label="Questions"
              badge={(qa.data?.questions ?? []).filter((q) => q.status === "pending").length}
              highlight={settings.qaMode}
              onPress={() => {
                setAskFocus(false);
                setSheet("questions");
                void qa.reload();
              }}
            >
              <HelpCircle size={20} color={settings.qaMode ? "#d4a017" : "#fff"} />
            </BarButton>
            <BarButton label="Participants" onPress={() => setSheet("people")}>
              <Users size={20} color="#fff" />
            </BarButton>
            <BarButton label="Plus" badge={isOrganizer ? st.stage?.hands.length : undefined} onPress={() => setSheet("options")}>
              <MoreHorizontal size={20} color="#fff" />
            </BarButton>
          </View>
        </View>
        ) : null}
        {sheet === "reactions" ? (
          <View style={{ position: "absolute", left: 12, right: 12, bottom: Math.max(insets.bottom, 10) + 120, flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, borderRadius: 28, backgroundColor: "rgba(10,12,20,0.92)", borderWidth: 1, borderColor: "rgba(212,160,23,0.4)" }}>
            {LIVE_REACTIONS.map((r) => (
              <Press key={r.code} accessibilityLabel={r.label} onPress={() => void react(r.code)} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
              </Press>
            ))}
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {sheet === "questions" ? (
        <QuestionsSheet
          eventId={eventId}
          data={qa.data}
          organizer={isOrganizer}
          focusAsk={askFocus}
          onClose={() => setSheet("none")}
          onChanged={() => void qa.reload()}
          onReport={(q) => report(q.authorId, q.id)}
        />
      ) : null}

      {/* Participants */}
      {sheet === "people" ? (
        <Sheet onClose={() => setSheet("none")} title={`Participants (${people.length})`}>
          <FlatList
            data={ordered}
            keyExtractor={(p) => p.identity}
            initialNumToRender={20}
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() => {
                  if (item.identity === roomRef.current?.localParticipant.identity) return;
                  const actions: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
                  if (isOrganizer && item.role === "viewer" && item.pid) actions.push({ text: "Inviter sur scène", onPress: () => void stage({ action: "invite", pid: item.pid! }) });
                  if (isOrganizer) actions.push({ text: "Exclure", style: "destructive", onPress: () => exclude(item.identity, item.name) });
                  if (item.pid) actions.push({ text: "Signaler", onPress: () => report(item.pid!, item.identity) });
                  actions.push({ text: "Annuler", style: "cancel" });
                  Alert.alert(item.name, undefined, actions);
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}
              >
                <View style={{ borderRadius: 20, borderWidth: 1.5, borderColor: item.role === "organizer" ? colors.accent : "transparent" }}>
                  <Avatar user={{ displayName: item.name, avatar: item.av }} size={38} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{item.name}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>{item.role === "organizer" ? "Organisateur" : item.role === "speaker" ? "Intervenant" : "Spectateur"}</Text>
                </View>
                {item.identity !== roomRef.current?.localParticipant.identity && (isOrganizer || item.pid) ? <Flag size={16} color="rgba(255,255,255,0.4)" /> : null}
              </Pressable>
            )}
          />
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 8 }}>Appui long sur une personne pour {isOrganizer ? "l’exclure ou la signaler" : "la signaler"}.</Text>
        </Sheet>
      ) : null}

      {sheet === "stage" && isOrganizer ? (
        <StageSheet
          eventId={eventId}
          stage={st.stage}
          onClose={() => setSheet("none")}
          onChanged={(s2) => st.setStage(s2)}
          onInviteSomeone={() => setSheet("people")}
        />
      ) : null}
      {st.stage?.me.invitedAt && role === "viewer" ? (
        <StageInviteCard invitedAt={st.stage.me.invitedAt} onJoin={() => void joinStage()} onRefuse={() => void stage({ action: "answer", accept: false })} />
      ) : null}
      {toast ? (
        <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 74, alignSelf: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(6,10,24,0.88)", borderWidth: 1, borderColor: "rgba(212,160,23,0.6)" }}>
          <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{toast}</Text>
        </View>
      ) : null}

      {sheet === "layout" && isOrganizer ? (
        <Sheet onClose={() => setSheet("none")} title="Disposition de la scène">
          <View style={{ flexDirection: "row", gap: 10, paddingVertical: 6 }}>
            {(
              [
                ["shared", "Scène partagée"],
                ["dominant", "Host dominant"],
                ["inset", "Invités intégrés"],
              ] as const
            ).map(([id, label]) => (
              <Press
                key={id}
                onPress={() => {
                  setSheet("none");
                  void stage({ action: "layout", layout: id });
                }}
                style={{ flex: 1, alignItems: "center", gap: 8, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: layout === id ? "#d4a017" : "rgba(255,255,255,0.12)", backgroundColor: layout === id ? "rgba(212,160,23,0.12)" : "transparent" }}
              >
                <LayoutThumb kind={id} />
                <Text style={{ color: layout === id ? "#d4a017" : "#fff", fontSize: 12, textAlign: "center", fontFamily: "Inter_600SemiBold" }}>{label}</Text>
              </Press>
            ))}
          </View>
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 6 }}>Tous les spectateurs voient la même disposition.</Text>
        </Sheet>
      ) : null}

      {/* Options */}
      {sheet === "options" ? (
        <Sheet onClose={() => setSheet("none")} title={isOrganizer ? "Options organisateur" : "Options"}>
          <ScrollView>
            {isOrganizer ? (
              <>
                <Press
                  onPress={() => {
                    setSheet("none");
                    if (screen?.local) void stopScreenShare();
                    else startScreenShare();
                  }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}
                >
                  <MonitorUp size={18} color="#d4a017" />
                  <Text style={{ flex: 1, marginLeft: 10, color: "#fff", fontSize: 15 }}>{screen?.local ? "Arrêter le partage d’écran" : "Partager l’écran"}</Text>
                </Press>
                <Press onPress={() => setSheet("stage")} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                  <Hand size={18} color="#d4a017" />
                  <Text style={{ flex: 1, marginLeft: 10, color: "#fff", fontSize: 15 }}>Scène et demandes de parole</Text>
                  {st.stage?.hands.length ? (
                    <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: "#e5383b", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{st.stage.hands.length}</Text>
                    </View>
                  ) : null}
                </Press>
                <OptionRow
                  label="Mode interactif (jusqu’à 5 sur scène)"
                  value={st.stage?.mode === "interactive"}
                  onPress={() => {
                    const next = st.stage?.mode === "interactive" ? "conference" : "interactive";
                    if (next === "conference" && st.stage?.speakers.length) {
                      Alert.alert("Mode Conférence", "Les intervenants redescendront parmi les spectateurs.", [
                        { text: "Annuler", style: "cancel" },
                        { text: "Continuer", onPress: () => void stage({ action: "mode", mode: next }) },
                      ]);
                    } else void stage({ action: "mode", mode: next });
                  }}
                />
                <Press onPress={flipCamera} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                  <Text style={{ color: "#fff", fontSize: 15 }}>Retourner la caméra</Text>
                </Press>
                <OptionRow label="Afficher les commentaires" value={showComments} onPress={() => setShowComments((v) => !v)} />
                <OptionRow label="Commentaires" value={settings.commentsOn} onPress={() => void toggleSetting("commentsOn")} />
                <OptionRow label="Réactions" value={settings.reactionsOn} onPress={() => void toggleSetting("reactionsOn")} />
                <OptionRow label="Questions ouvertes" value={settings.questionsOn} onPress={() => void toggleSetting("questionsOn")} />
                <OptionRow label="Lancer les questions-réponses" value={settings.qaMode} onPress={() => void toggleSetting("qaMode")} />
                <Press onPress={endForAll} style={{ marginTop: 18, height: 48, borderRadius: 14, backgroundColor: "#e5383b", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Terminer la conférence pour tous</Text>
                </Press>
              </>
            ) : (
              <>
                {role === "speaker" ? (
                  <>
                    <Press onPress={flipCamera} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                      <Text style={{ color: "#fff", fontSize: 15 }}>Retourner la caméra</Text>
                    </Press>
                    <Press onPress={leaveStageSelf} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                      <LogOut size={17} color="#ff6b6b" />
                      <Text style={{ color: "#ff6b6b", fontSize: 15 }}>Quitter la scène</Text>
                    </Press>
                  </>
                ) : null}
                <OptionRow label="Afficher les commentaires" value={showComments} onPress={() => setShowComments((v) => !v)} />
                <Press onPress={() => pop()} style={{ marginTop: 18, height: 48, borderRadius: 14, backgroundColor: "#e5383b", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Quitter le direct</Text>
                </Press>
              </>
            )}
          </ScrollView>
        </Sheet>
      ) : null}
    </View>
  );
}

function BarButton({ label, onPress, children, disabled, badge, highlight }: { label: string; onPress: () => void; children: React.ReactNode; disabled?: boolean; badge?: number; highlight?: boolean }) {
  return (
    <Press accessibilityLabel={label} disabled={disabled} onPress={() => { Keyboard.dismiss(); onPress(); }} style={{ alignItems: "center", gap: 4, minWidth: 48, opacity: disabled ? 0.4 : 1 }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: highlight ? "rgba(212,160,23,0.22)" : "rgba(255,255,255,0.12)", borderWidth: highlight ? 1 : 0, borderColor: "#d4a017", alignItems: "center", justifyContent: "center" }}>
        {children}
        {badge ? (
          <View style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#e5383b", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" }}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10 }}>{label}</Text>
    </Press>
  );
}

function OptionRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
      <Text style={{ flex: 1, color: "#fff", fontSize: 15 }}>{label}</Text>
      <View style={{ width: 46, height: 28, borderRadius: 14, padding: 3, backgroundColor: value ? colors.accent : "rgba(255,255,255,0.2)", alignItems: value ? "flex-end" : "flex-start" }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" }} />
      </View>
    </Press>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Press accessibilityLabel="Fermer" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />
      <View style={{ maxHeight: "70%", paddingHorizontal: 18, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16), borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: "#0b0f1a", borderTopWidth: 1, borderColor: "rgba(212,160,23,0.35)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ flex: 1, color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" }}>{title}</Text>
          <Press accessibilityLabel="Fermer" onPress={onClose} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <X size={20} color="#fff" />
          </Press>
        </View>
        {children}
      </View>
    </View>
  );
}

/** Small drawing of each scene layout for the picker. */
function LayoutThumb({ kind }: { kind: StageLayout }) {
  const box = { width: 64, height: 46, borderRadius: 6, backgroundColor: "#1b2133", overflow: "hidden" as const };
  const cell = { backgroundColor: "rgba(212,160,23,0.55)", borderRadius: 2 };
  if (kind === "shared") {
    return (
      <View style={[box, { flexDirection: "row", gap: 2, padding: 2 }]}>
        <View style={[cell, { flex: 1 }]} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={[cell, { flex: 1 }]} />
          <View style={[cell, { flex: 1 }]} />
        </View>
      </View>
    );
  }
  if (kind === "dominant") {
    return (
      <View style={[box, { padding: 2, justifyContent: "flex-end" }]}>
        <View style={[cell, { position: "absolute", top: 2, left: 2, right: 2, bottom: 2, opacity: 0.45 }]} />
        <View style={{ flexDirection: "row", gap: 3, justifyContent: "center", marginBottom: 3 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[cell, { width: 12, height: 12, backgroundColor: "#d4a017" }]} />
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={[box, { padding: 2 }]}>
      <View style={[cell, { position: "absolute", top: 2, left: 2, right: 2, bottom: 2, opacity: 0.45 }]} />
      <View style={{ position: "absolute", top: 5, right: 5, width: 27, flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[cell, { width: 12, height: 12, backgroundColor: "#d4a017" }]} />
        ))}
      </View>
    </View>
  );
}

/** « C'est le moment de vos questions ! » — fades in, stays ~3 s, fades out. */
function QaAnnounce({ n }: { n: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!n) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(anim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [n]);
  if (!n) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: "38%", left: 24, right: 24, alignItems: "center", opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
      <View style={{ paddingHorizontal: 22, paddingVertical: 16, borderRadius: 20, backgroundColor: "rgba(6,10,24,0.86)", borderWidth: 1, borderColor: "rgba(212,160,23,0.8)" }}>
        <Text style={{ color: "#fff", fontSize: 19, textAlign: "center", fontFamily: "Inter_700Bold" }}>🎤 C’est le moment de vos questions !</Text>
      </View>
    </Animated.View>
  );
}

/** Many people clapping together: a short, light wave of claps across the bottom. */
function ClapWave({ wave }: { wave: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!wave) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [wave]);
  if (!wave) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "40%",
        alignItems: "center",
        opacity: anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.7, 1.1, 1] }) }],
      }}
    >
      <Text style={{ fontSize: 44 }}>👏👏👏</Text>
      <Text style={{ marginTop: 4, color: "#fff", fontFamily: "Inter_700Bold", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 6 }}>Applaudissements !</Text>
    </Animated.View>
  );
}
