import { useEffect, useRef, useState } from "react";
import { Animated, AppState, PanResponder, Platform, Pressable, View, Text, useWindowDimensions } from "react-native";
import { Room, RoomEvent, Track, type RemoteTrack, type LocalVideoTrack } from "livekit-client";
import { Audio } from "expo-av";
import { Camera } from "expo-camera";
import { Mic, MicOff, Phone, PhoneOff, SwitchCamera, Video, VideoOff, Volume2 } from "lucide-react-native";
import { Avatar } from "./Avatar";
import { Press } from "./ui";
import { formatDuration } from "../lib/format";
import { useWippStore } from "../lib/store";
import { colors } from "../theme";
import {
  acceptCurrentCall,
  declineCurrentCall,
  endCurrentCall,
  pollIncoming,
  upgradeToVideo,
  useCallSession,
  type CallPhase,
} from "../lib/calls/session";
import { playBusyTone, playCallerWaiting, playIncomingRing, stopCallTones } from "../lib/calls/tones";
import { dismissSystemRinging, endSystemCall, setupCallKeep, showSystemIncoming } from "../lib/calls/callkeep";

// The native WebRTC renderer cannot be imported by React Native Web.
const RTCView = Platform.OS === "web"
  ? View
  : (require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc")).RTCView;

function streamURL(track: { mediaStream?: unknown } | null) {
  const stream = track?.mediaStream as { toURL?: () => string } | undefined;
  return stream?.toURL?.() ?? null;
}

function terminalPhases(phase: CallPhase) {
  return phase === "ended" || phase === "declined" || phase === "missed" || phase === "busy" || phase === "failed";
}

function leaveCall() {
  void stopCallTones();
  const state = useWippStore.getState();
  if (state.stack.at(-1)?.name === "active-call") state.pop();
  useCallSession.getState().clear();
}

function phaseLabel(phase: CallPhase, note?: string) {
  if (note && phase !== "connected" && phase !== "connecting") return note;
  if (phase === "outgoing" || phase === "ringing") return phase === "outgoing" ? "Appel sortant" : "Appel entrant";
  if (phase === "connecting") return "Connexion…";
  if (phase === "reconnecting") return "Reconnexion…";
  if (phase === "connected") return "En ligne";
  if (phase === "declined") return "Refusé";
  if (phase === "missed") return "Manqué";
  if (phase === "busy") return "Occupé";
  if (phase === "failed") return note || "Échec";
  return "Terminé";
}

export function CallOverlay() {
  const session = useCallSession((s) => s.session);
  const patch = useCallSession((s) => s.patch);
  const user = useWippStore((s) => (session ? s.users[session.userId] : undefined));
  const serverConnected = useWippStore((s) => s.serverConnected);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const lastTap = useRef(0);
  const win = useWindowDimensions();
  const pipPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pipDrag = useRef(
    PanResponder.create({
      // Small moves stay a tap (reopen the call); bigger ones drag the mini player.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        pipPos.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pipPos.x, dy: pipPos.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pipPos.flattenOffset();
      },
    }),
  ).current;
  const [sec, setSec] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const shownSystem = useRef<string | null>(null);

  useEffect(() => {
    void setupCallKeep(
      (callId) => {
        const live = useCallSession.getState().session;
        if (live?.callId === callId) void acceptCurrentCall();
      },
      (callId) => {
        const live = useCallSession.getState().session;
        if (live?.callId === callId) void endCurrentCall();
      },
    );
  }, []);

  useEffect(() => {
    if (!session) {
      void stopCallTones();
      return;
    }
    if (session.phase === "outgoing") void playCallerWaiting();
    else if (session.phase === "ringing" && session.dir === "in") void playIncomingRing();
    else if (session.phase === "busy") void playBusyTone();
    else void stopCallTones();
  }, [session?.phase, session?.dir]);

  useEffect(() => {
    if (!session) return;
    if (!terminalPhases(session.phase)) return;
    const wait = session.phase === "busy" ? 4200 : 1200;
    const id = setTimeout(() => leaveCall(), wait);
    return () => clearTimeout(id);
  }, [session?.phase, session?.callId]);

  useEffect(() => {
    if (!serverConnected) return;
    void pollIncoming();
    const id = setInterval(() => void pollIncoming(), 4000);
    return () => clearInterval(id);
  }, [serverConnected]);

  // Safety net: if the server says the call is over (other side hung up), close it here too.
  useEffect(() => {
    if (!session?.callId || session.group || (session.phase !== "connected" && session.phase !== "reconnecting")) return;
    const id = session.callId;
    const tick = setInterval(() => {
      void import("../lib/calls/livekit-client").then(async ({ callStatus }) => {
        try {
          const st = (await callStatus(id)).invite.status;
          const live = useCallSession.getState().session;
          if (live?.callId !== id) return;
          if (st === "ended" || st === "cancelled" || st === "missed" || st === "rejected") {
            void roomRef.current?.disconnect();
            useCallSession.getState().patch({ phase: "ended", url: undefined, token: undefined });
          }
        } catch {
          /* offline: LiveKit events still apply */
        }
      });
    }, 4000);
    return () => clearInterval(tick);
  }, [session?.callId, session?.phase, session?.group]);

  useEffect(() => {
    if (!session || session.phase !== "connected" || !session.startedAt) return;
    const id = setInterval(() => setSec(Math.floor((Date.now() - session.startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [session?.phase, session?.startedAt]);

  useEffect(() => {
    if (session?.phase === "ringing" && session.dir === "in" && session.callId && shownSystem.current !== session.callId) {
      shownSystem.current = session.callId;
      showSystemIncoming(session.callId, session.kind === "video", session.displayName);
    }
    if ((session?.phase === "connecting" || session?.phase === "connected") && session.dir === "in" && session.callId) {
      dismissSystemRinging(session.callId);
    }
    if (!session || session.phase === "ended" || session.phase === "declined" || session.phase === "missed") {
      if (session?.callId) endSystemCall(session.callId);
    }
  }, [session?.phase, session?.callId, session?.dir, session?.kind]);

  useEffect(() => {
    if (!session?.url || !session.token) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const bind = (track: RemoteTrack | LocalVideoTrack, local: boolean) => {
      if (track.kind !== Track.Kind.Video) return;
      const url = streamURL(track);
      if (local) setLocalUrl(url);
      else setRemoteUrl(url);
    };
    room.on(RoomEvent.TrackSubscribed, (track, pub) => {
      bind(track, false);
      if (track.kind === Track.Kind.Video) setRemoteMuted(pub.isMuted);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Video) setRemoteUrl(null);
    });
    // Camera turned off/on without unpublishing: hide the frozen frame on the other side.
    room.on(RoomEvent.TrackMuted, (pub, participant) => {
      if (pub.kind === Track.Kind.Video && participant !== room.localParticipant) setRemoteMuted(true);
    });
    room.on(RoomEvent.TrackUnmuted, (pub, participant) => {
      if (pub.kind !== Track.Kind.Video) return;
      // Unmuting can restart the capture with a new stream: rebind the view.
      if (participant === room.localParticipant) {
        if (pub.track) bind(pub.track as LocalVideoTrack, true);
        return;
      }
      setRemoteMuted(false);
      if (pub.track) bind(pub.track as RemoteTrack, false);
    });
    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.track) bind(pub.track as LocalVideoTrack, true);
    });
    room.on(RoomEvent.Reconnecting, () => patch({ phase: "reconnecting" }));
    room.on(RoomEvent.Reconnected, () => patch({ phase: "connected" }));
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) patch({ phase: "ended", url: undefined, token: undefined });
    });
    // One-to-one call: when the other person leaves the room, the call is over for us too.
    room.on(RoomEvent.ParticipantDisconnected, () => {
      if (!cancelled && !session.group && room.remoteParticipants.size === 0) {
        void room.disconnect();
        patch({ phase: "ended", url: undefined, token: undefined });
      }
    });
    void (async () => {
      const mic = await Audio.requestPermissionsAsync();
      if (!mic.granted) {
        patch({ phase: "failed", note: "Micro refusé." });
        return;
      }
      const { AudioSession, AndroidAudioTypePresets } = await import("@livekit/react-native");
      await AudioSession.configureAudio({
        android: { audioTypeOptions: AndroidAudioTypePresets.communication, preferredOutputList: ["speaker", "earpiece", "bluetooth"] },
        ios: { defaultOutput: session.speaker ? "speaker" : "earpiece" },
      });
      await AudioSession.startAudioSession();
      await room.connect(session.url!, session.token!);
      if (cancelled) return;
      await room.localParticipant.setMicrophoneEnabled(!session.muted);
      patch({ phase: "connected", startedAt: Date.now() });
      if (session.group && session.callId) {
        const { setGroupState } = await import("../lib/calls/livekit-client");
        void setGroupState(session.callId, "joined");
      }
    })().catch(() => {
      if (!cancelled) patch({ phase: "failed", note: "Connexion média impossible." });
    });
    return () => {
      cancelled = true;
      setRemoteUrl(null);
      setLocalUrl(null);
      setRemoteMuted(false);
      setSwapped(false);
      void room.disconnect();
      void import("@livekit/react-native").then((m) => m.AudioSession.stopAudioSession()).catch(() => undefined);
    };
  }, [session?.url, session?.token]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || session?.phase !== "connected") return;
    void room.localParticipant.setMicrophoneEnabled(!session.muted);
  }, [session?.muted, session?.phase]);

  // Camera on/off inside the same room: no reconnect, the other side gets mute/unmute events.
  useEffect(() => {
    const room = roomRef.current;
    if (!room || session?.phase !== "connected") return;
    const want = session.kind === "video" && !session.camOff;
    let stale = false;
    void (async () => {
      if (want) {
        const cam = await Camera.requestCameraPermissionsAsync();
        if (!cam.granted) {
          patch({ camOff: true, note: "Caméra refusée. L’audio continue." });
          return;
        }
      }
      const pub = await room.localParticipant.setCameraEnabled(want, {
        facingMode: useCallSession.getState().session?.facing === "environment" ? "environment" : "user",
      });
      if (stale) return;
      const track = pub?.track ?? room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
      setLocalUrl(want && track ? streamURL(track) : null);
    })().catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [session?.camOff, session?.kind, session?.phase]);

  // iOS stops the camera in the background: restart it and rebind the preview when we come back.
  useEffect(() => {
    const revive = () => {
      const room = roomRef.current;
      const live = useCallSession.getState().session;
      if (!room || live?.phase !== "connected" || live.kind !== "video" || live.camOff) return;
      const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
      if (!track) return;
      // Only when iOS really stopped the capture; restarting a live camera freezes the call.
      if (track.mediaStreamTrack?.readyState !== "ended") {
        setLocalUrl(streamURL(track));
        return;
      }
      void track
        .restartTrack({ facingMode: live.facing === "environment" ? "environment" : "user" })
        .then(() => setLocalUrl(streamURL(track)))
        .catch(() => undefined);
    };
    let prev = AppState.currentState;
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active" && prev === "background") revive();
      prev = st;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || session?.phase !== "connected" || session.camOff) return;
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
    if (!track) return;
    void track
      .restartTrack({ facingMode: session.facing === "environment" ? "environment" : "user" })
      .then(() => setLocalUrl(streamURL(track)))
      .catch(() => undefined);
  }, [session?.facing]);

  useEffect(() => {
    if (!session || session.phase !== "connected") return;
    void import("@livekit/react-native").then(async ({ AudioSession }) => {
      const outputs = await AudioSession.getAudioOutputs();
      const want = session.speaker ? "speaker" : "earpiece";
      const match = outputs.find((item) => item.toLowerCase().includes(want));
      if (match) await AudioSession.selectAudioOutput(match);
    }).catch(() => undefined);
  }, [session?.speaker, session?.phase]);

  if (!session) return null;
  const title = user?.displayName || session.displayName;
  const terminal = ["ended", "declined", "missed", "busy", "failed"].includes(session.phase);

  if (session.pip && !terminal) {
    const w = session.kind === "video" ? 132 : 220;
    const h = session.kind === "video" && remoteUrl ? 176 : 64;
    // Keep the mini player on screen: start top-right, clamp to the window while dragging.
    const x = pipPos.x.interpolate({ inputRange: [-(win.width - w - 24), 0], outputRange: [-(win.width - w - 24), 0], extrapolate: "clamp" });
    const y = pipPos.y.interpolate({ inputRange: [0, win.height - h - 120], outputRange: [0, win.height - h - 120], extrapolate: "clamp" });
    return (
      <Animated.View
        {...pipDrag.panHandlers}
        style={{ position: "absolute", top: 56, right: 12, zIndex: 100, elevation: 100, width: w, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, transform: [{ translateX: x }, { translateY: y }] }}
      >
        <Press onPress={() => patch({ pip: false })}>
          {session.kind === "video" && remoteUrl && !remoteMuted ? (
            <RTCView streamURL={remoteUrl} style={{ width: 132, height: 176 }} objectFit="cover" zOrder={1} />
          ) : (
            <View style={{ padding: 12 }}>
              <Text numberOfLines={1} style={{ color: colors.paper, fontFamily: "Inter_600SemiBold" }}>{title}</Text>
              <Text style={{ color: "rgba(247,249,252,0.7)", fontSize: 12 }}>{formatDuration(sec)}</Text>
            </View>
          )}
        </Press>
      </Animated.View>
    );
  }

  // The caller also has an empty "active-call" page under the overlay: close it so the app is usable again.
  const minimize = () => {
    const state = useWippStore.getState();
    if (state.stack.at(-1)?.name === "active-call") state.pop();
    patch({ pip: true });
  };
  const remoteVid = remoteUrl && !remoteMuted ? remoteUrl : null;
  const localVid = localUrl && session.kind === "video" && !session.camOff ? localUrl : null;
  const flip = swapped && !!remoteVid && !!localVid;
  const main = flip ? localVid : remoteVid;
  const mini = flip ? remoteVid : localVid;
  const onVideo = !!main;
  const dim = onVideo ? "rgba(247,249,252,0.85)" : "rgba(247,249,252,0.6)";
  const doubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) setSwapped((v) => !v);
    lastTap.current = now;
  };
  const roundBtn = { width: 56, height: 56, borderRadius: 28, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: onVideo ? "rgba(0,0,0,0.45)" : colors.surface };
  const iconColor = onVideo ? "#fff" : colors.fg;

  return (
    <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100, backgroundColor: colors.navy }}>
      {/* Full-screen video, double tap swaps who is big and who is small. */}
      <Pressable onPress={doubleTap} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" }}>
        {main ? (
          <RTCView streamURL={main} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} objectFit="cover" mirror={flip} zOrder={0} />
        ) : (
          <View style={{ alignItems: "center" }}>
            <Avatar user={user} size={112} />
            {remoteUrl && remoteMuted ? <Text style={{ marginTop: 12, color: dim }}>Caméra coupée</Text> : null}
          </View>
        )}
      </Pressable>
      {mini ? (
        <Press onPress={() => setSwapped((v) => !v)} style={{ position: "absolute", top: 110, right: 16, width: 108, height: 160, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "#000" }}>
          <RTCView streamURL={mini} style={{ width: 108, height: 160 }} objectFit="cover" mirror={!flip} zOrder={1} />
        </Press>
      ) : null}
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: 56, paddingHorizontal: 20, alignItems: "center" }}>
        <Press onPress={minimize} style={{ alignSelf: "flex-start" }}>
          <Text style={{ color: dim }}>Réduire</Text>
        </Press>
        <Text style={{ marginTop: onVideo ? 4 : 0, fontSize: onVideo ? 20 : 24, fontFamily: "Inter_600SemiBold", color: colors.paper, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: onVideo ? 4 : 0 }}>{title}</Text>
        <Text style={{ marginTop: 4, color: dim, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: onVideo ? 4 : 0 }}>
          {session.kind === "video" ? "Appel vidéo" : "Appel audio"}
          {session.group ? " · groupe" : ""}
          {" · "}
          {phaseLabel(session.phase, session.note)}
          {session.phase === "connected" ? ` · ${formatDuration(sec)}` : ""}
        </Text>
      </View>
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 48, alignItems: "center" }}>
        {session.phase === "ringing" && session.dir === "in" ? (
          <View style={{ flexDirection: "row", gap: 28 }}>
            <Press onPress={() => void declineCurrentCall()} accessibilityLabel="Refuser" style={{ alignItems: "center", gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" }}>
                <PhoneOff size={22} color="#fff" />
              </View>
              <Text style={{ color: colors.paper, fontFamily: "Inter_600SemiBold" }}>Refuser</Text>
            </Press>
            <Press onPress={() => void acceptCurrentCall()} accessibilityLabel="Accepter" style={{ alignItems: "center", gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#1f8f4e", alignItems: "center", justifyContent: "center" }}>
                <Phone size={22} color="#fff" />
              </View>
              <Text style={{ color: colors.paper, fontFamily: "Inter_600SemiBold" }}>Accepter</Text>
            </Press>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Press onPress={() => patch({ muted: !session.muted })} accessibilityLabel="Micro" style={roundBtn}>
              {session.muted ? <MicOff size={22} color={iconColor} /> : <Mic size={22} color={iconColor} />}
            </Press>
            <Press onPress={() => patch({ speaker: !session.speaker })} accessibilityLabel="Haut-parleur" style={roundBtn}>
              <Volume2 size={22} color={session.speaker ? colors.accent : iconColor} />
            </Press>
            <Press
              accessibilityLabel="Caméra"
              onPress={() => {
                if (session.kind === "audio") void upgradeToVideo();
                else patch({ camOff: !session.camOff });
              }}
              style={roundBtn}
            >
              {session.camOff || session.kind === "audio" ? <VideoOff size={22} color={iconColor} /> : <Video size={22} color={iconColor} />}
            </Press>
            {session.kind === "video" && !session.camOff ? (
              <Press onPress={() => patch({ facing: session.facing === "user" ? "environment" : "user" })} accessibilityLabel="Retourner la caméra" style={roundBtn}>
                <SwitchCamera size={22} color={iconColor} />
              </Press>
            ) : null}
            <Press
              onPress={() => {
                if (!terminal) void endCurrentCall();
                leaveCall();
              }}
              accessibilityLabel="Terminer l’appel"
              style={{ ...roundBtn, backgroundColor: colors.danger }}
            >
              <PhoneOff size={22} color="#fff" />
            </Press>
          </View>
        )}
      </View>
    </View>
  );
}
