import { useEffect, useRef, useState } from "react";
import { Animated, AppState, PanResponder, Platform, View, Text, useWindowDimensions } from "react-native";
import { Room, RoomEvent, Track, type RemoteTrack, type LocalVideoTrack } from "livekit-client";
import { Audio } from "expo-av";
import { Camera } from "expo-camera";
import { Press } from "./ui";
import { CallScreen } from "./CallScreen";
import { formatDuration } from "../lib/format";
import { useWippStore } from "../lib/store";
import { colors } from "../theme";
import {
  acceptCurrentCall,
  endCurrentCall,
  pollIncoming,
  useCallSession,
  type CallPhase,
} from "../lib/calls/session";
import { playBusyTone, playCallerWaiting, playIncomingRing, stopCallTones } from "../lib/calls/tones";
import { dismissSystemRinging, endSystemCall, markSystemCallConnected, setupCallKeep, showSystemIncoming, wasAnsweredBySystem } from "../lib/calls/callkeep";

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

export function CallOverlay() {
  const session = useCallSession((s) => s.session);
  const patch = useCallSession((s) => s.patch);
  const user = useWippStore((s) => (session ? s.users[session.userId] : undefined));
  const serverConnected = useWippStore((s) => s.serverConnected);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [swapped, setSwapped] = useState(false);
  // iOS video views can come back black after being unmounted (mini player, background): remount them.
  const [viewEpoch, setViewEpoch] = useState(0);
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
  const lastCallId = useRef<string | null>(null);
  const reviveRef = useRef<(() => void) | null>(null);

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

  // Answered from the iPhone lock screen (VoIP) before the call finished loading: accept it now.
  useEffect(() => {
    if (session?.dir === "in" && session.phase === "ringing" && session.callId && wasAnsweredBySystem(session.callId)) {
      void acceptCurrentCall();
    }
  }, [session?.callId, session?.phase, session?.dir]);

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
      showSystemIncoming(session.callId, session.kind === "video", session.peerUsername ? `${session.displayName} @${session.peerUsername}` : session.displayName);
    }
    if ((session?.phase === "connecting" || session?.phase === "connected") && session.dir === "in" && session.callId) {
      dismissSystemRinging(session.callId);
    }
    if (session?.phase === "connected" && session.callId) markSystemCallConnected(session.callId);
    if (session?.callId) lastCallId.current = session.callId;
    // Any end (hang-up here, the other side, refused, busy, failed, or the session cleared) closes the iOS/Android call too.
    if (!session || terminalPhases(session.phase)) {
      const id = session?.callId ?? lastCallId.current;
      if (id) endSystemCall(id);
      if (!session) lastCallId.current = null;
    }
  }, [session?.phase, session?.callId, session?.dir, session?.kind, session]);

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
      setViewEpoch((n) => n + 1);
      if (!room || live?.phase !== "connected" || live.kind !== "video" || live.camOff) return;
      const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
      if (!track) {
        // Camera publication lost while away: publish it again.
        void room.localParticipant
          .setCameraEnabled(true, { facingMode: live.facing === "environment" ? "environment" : "user" })
          .then((pub) => setLocalUrl(streamURL(pub?.track ?? null)))
          .catch(() => undefined);
        return;
      }
      if (track.isMuted) {
        void track.unmute().then(() => setLocalUrl(streamURL(track))).catch(() => undefined);
        return;
      }
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
    reviveRef.current = revive;
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (session && !session.pip) reviveRef.current?.();
  }, [session?.pip]);

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
  const peer = {
    displayName: title,
    username: user?.username || session.peerUsername,
    avatar: user?.avatar || session.peerAvatar,
  };
  return (
    <CallScreen
      session={session}
      peer={peer}
      sec={sec}
      terminal={terminal}
      remoteUrl={remoteUrl}
      remoteMuted={remoteMuted}
      localUrl={localUrl}
      swapped={swapped}
      setSwapped={setSwapped}
      viewEpoch={viewEpoch}
      onMinimize={minimize}
      RTCView={RTCView as never}
      onHangup={() => {
        if (!terminal) void endCurrentCall();
        leaveCall();
      }}
    />
  );
}
