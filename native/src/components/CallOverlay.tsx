import { useEffect, useRef, useState } from "react";
import { Platform, View, Text } from "react-native";
import { Room, RoomEvent, Track, type RemoteTrack, type LocalVideoTrack } from "livekit-client";
import { Audio } from "expo-av";
import { Camera } from "expo-camera";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, Volume2 } from "lucide-react-native";
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
import { endSystemCall, setupCallKeep, showSystemIncoming } from "../lib/calls/callkeep";

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

  useEffect(() => {
    if (!session || session.phase !== "connected" || !session.startedAt) return;
    const id = setInterval(() => setSec(Math.floor((Date.now() - session.startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [session?.phase, session?.startedAt]);

  useEffect(() => {
    if (session?.phase === "ringing" && session.dir === "in" && session.callId && shownSystem.current !== session.callId) {
      shownSystem.current = session.callId;
      showSystemIncoming(session.callId, session.kind === "video");
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
    room.on(RoomEvent.TrackSubscribed, (track) => bind(track, false));
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Video) setRemoteUrl(null);
    });
    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.track) bind(pub.track as LocalVideoTrack, true);
    });
    room.on(RoomEvent.Reconnecting, () => patch({ phase: "reconnecting" }));
    room.on(RoomEvent.Reconnected, () => patch({ phase: "connected" }));
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) patch({ phase: "ended", url: undefined, token: undefined });
    });
    void (async () => {
      const mic = await Audio.requestPermissionsAsync();
      if (!mic.granted) {
        patch({ phase: "failed", note: "Micro refusé." });
        return;
      }
      if (session.kind === "video" && !session.camOff) {
        const cam = await Camera.requestCameraPermissionsAsync();
        if (!cam.granted) patch({ camOff: true, note: "Caméra refusée. L’audio continue." });
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
      if (session.kind === "video" && !session.camOff) {
        await room.localParticipant.setCameraEnabled(true, { facingMode: session.facing === "environment" ? "environment" : "user" });
      }
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
      void room.disconnect();
      void import("@livekit/react-native").then((m) => m.AudioSession.stopAudioSession()).catch(() => undefined);
    };
  }, [session?.url, session?.token]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || session?.phase !== "connected") return;
    void room.localParticipant.setMicrophoneEnabled(!session.muted);
  }, [session?.muted, session?.phase]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || session?.phase !== "connected") return;
    void room.localParticipant.setCameraEnabled(session.kind === "video" && !session.camOff, {
      facingMode: session.facing === "environment" ? "environment" : "user",
    });
  }, [session?.camOff, session?.facing, session?.kind, session?.phase]);

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
    return (
      <Press
        onPress={() => patch({ pip: false })}
        style={{ position: "absolute", top: 56, right: 12, width: session.kind === "video" ? 132 : 220, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy }}
      >
        {session.kind === "video" && remoteUrl ? (
          <RTCView streamURL={remoteUrl} style={{ width: 132, height: 176 }} objectFit="cover" />
        ) : (
          <View style={{ padding: 12 }}>
            <Text numberOfLines={1} style={{ color: colors.paper, fontFamily: "Inter_600SemiBold" }}>{title}</Text>
            <Text style={{ color: "rgba(247,249,252,0.7)", fontSize: 12 }}>{formatDuration(sec)}</Text>
          </View>
        )}
      </Press>
    );
  }

  return (
    <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.navy, alignItems: "center", justifyContent: "space-between", paddingVertical: 48 }}>
      <Press onPress={() => patch({ pip: true })} style={{ alignSelf: "flex-start", marginLeft: 20 }}>
        <Text style={{ color: "rgba(247,249,252,0.7)" }}>Réduire</Text>
      </Press>
      <View style={{ alignItems: "center", width: "100%", flex: 1, justifyContent: "center" }}>
        {session.kind === "video" && remoteUrl ? (
          <RTCView streamURL={remoteUrl} style={{ width: "100%", height: 360 }} objectFit="cover" />
        ) : (
          <Avatar user={user} size={96} />
        )}
        {session.kind === "video" && localUrl && !session.camOff ? (
          <RTCView streamURL={localUrl} style={{ position: "absolute", right: 16, bottom: 16, width: 96, height: 140, borderRadius: 12 }} objectFit="cover" mirror />
        ) : null}
        <Text style={{ marginTop: 16, fontSize: 24, fontFamily: "Inter_600SemiBold", color: colors.paper }}>{title}</Text>
        <Text style={{ marginTop: 6, color: "rgba(247,249,252,0.6)" }}>
          {session.kind === "video" ? "Appel vidéo" : "Appel audio"}
          {session.group ? " · groupe" : ""}
          {" · "}
          {phaseLabel(session.phase, session.note)}
          {session.phase === "connected" ? ` · ${formatDuration(sec)}` : ""}
        </Text>
      </View>
      {session.phase === "ringing" && session.dir === "in" ? (
        <View style={{ flexDirection: "row", gap: 28, marginBottom: 24 }}>
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
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 24 }}>
          <Press onPress={() => patch({ muted: !session.muted })} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            {session.muted ? <MicOff size={22} color={colors.fg} /> : <Mic size={22} color={colors.fg} />}
          </Press>
          <Press onPress={() => patch({ speaker: !session.speaker })} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            <Volume2 size={22} color={session.speaker ? colors.accent : colors.fg} />
          </Press>
          <Press
            onPress={() => {
              if (session.kind === "audio" && session.phase === "connected") void upgradeToVideo();
              else patch({ camOff: !session.camOff, kind: "video" });
            }}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}
          >
            {session.camOff || session.kind === "audio" ? <VideoOff size={22} color={colors.fg} /> : <Video size={22} color={colors.fg} />}
          </Press>
          {session.kind === "video" ? (
            <Press onPress={() => patch({ facing: session.facing === "user" ? "environment" : "user" })} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.fg, fontSize: 12 }}>Flip</Text>
            </Press>
          ) : null}
          <Press
            onPress={() => {
              if (!terminal) void endCurrentCall();
              leaveCall();
            }}
            accessibilityLabel="Terminer l’appel"
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" }}
          >
            <PhoneOff size={22} color="#fff" />
          </Press>
        </View>
      )}
    </View>
  );
}
