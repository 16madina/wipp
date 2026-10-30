import { useEffect, useRef, useState } from "react";
import { Animated, AppState, PanResponder, Platform, View, Text, useWindowDimensions } from "react-native";
import { createLocalVideoTrack, Room, RoomEvent, Track, type RemoteTrack, type LocalVideoTrack } from "livekit-client";
import { Audio } from "expo-av";
import { Camera } from "expo-camera";
import { Press } from "./ui";
import { CallScreen } from "./CallScreen";
import { formatDuration } from "../lib/format";
import { isTabScreen, useWippStore } from "../lib/store";
import { palettes } from "../theme";

/** Écran immersif (photo, vidéo, caméra ou appel) : toujours en couleurs sombres, quel que soit le thème. */
const colors = palettes.dark;
import {
  acceptCurrentCall,
  endCurrentCall,
  pollIncoming,
  useCallSession,
  type CallPhase,
} from "../lib/calls/session";
import { playBusyTone, playCallerWaiting, playIncomingRing, stopCallTones } from "../lib/calls/tones";
import { isSystemRinging } from "../lib/calls/callkeep";
import { hideOngoing, showOngoing } from "../lib/calls/android-ongoing";
import { clearIncomingCall } from "../lib/push/android-call";
import { dismissSystemRinging, endSystemCall, markSystemCallConnected, setupCallKeep, showSystemIncoming, wasAnsweredBySystem } from "../lib/calls/callkeep";
import { tr } from "../lib/tr";
import { onAndroidPipCameraButton, setAndroidCallPip, setAndroidPipCamera, useAndroidPip, useAndroidPipSize } from "../lib/calls/android-pip";
import { awayLog, clearAwayCameraNotice, onAwayCameraAction, prepareAwayCamera, showAwayCameraNotice } from "../lib/calls/away-camera";

// The native WebRTC renderer cannot be imported by React Native Web.
const RTCView = Platform.OS === "web"
  ? View
  : (require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc")).RTCView;

function streamURL(track: { mediaStream?: unknown } | null) {
  const stream = track?.mediaStream as { toURL?: () => string } | undefined;
  return stream?.toURL?.() ?? null;
}

type RoomTile = { key: string; local: boolean; identity: string; url: string | null; micOn: boolean; speaking: boolean; level?: number; name?: string; avatar?: string };

/** Name and photo sent by the server with each person's call pass (same on every phone). */
function roomPerson(p: { name?: string; identity: string; metadata?: string }) {
  let avatar: string | undefined;
  try {
    avatar = p.metadata ? (JSON.parse(p.metadata) as { avatar?: string | null }).avatar ?? undefined : undefined;
  } catch {
    avatar = undefined;
  }
  return { name: p.name && p.name !== p.identity ? p.name : undefined, avatar };
}

/** LiveKit identity is "p_" + the profile id without symbols (see the token route). */
function identityKey(profileId: string) {
  return `p_${profileId.replace(/^srvuser:/, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}`;
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
  /** Group call: everyone in the room (me first), for the mosaic. */
  const [tiles, setTiles] = useState<RoomTile[]>([]);
  const users = useWippStore((s) => s.users);
  const me = useWippStore((s) => s.me);
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
        // The call was not loaded in the app yet (WIPP was starting): decline it on the server directly,
        // so the caller stops ringing at once.
        else
          void import("../lib/calls/livekit-client")
            .then(({ answerCall }) => answerCall(callId, false))
            .catch(() => undefined);
      },
      (handle, video) => {
        // Touched in the iPhone's Recents: call that contact back. When WIPP was fully closed, the contacts
        // are not loaded yet at this point — keep trying for a few seconds instead of giving up.
        const wanted = handle.trim().toLowerCase();
        let tries = 0;
        const attempt = () => {
          const st = useWippStore.getState();
          if (useCallSession.getState().session || st.stack.some((s) => s.name === "active-call")) return;
          const user = Object.values(st.users).find((u) => u?.id?.startsWith("srvuser:") && u.username && `@${u.username}`.toLowerCase() === wanted);
          const ready = st.onboarded && Boolean(st.serverProfileId) && st.stack.some((s) => isTabScreen(s.name));
          if (user && ready) {
            if (!st.blockedIds.includes(user.id)) st.push({ name: "active-call", userId: user.id, kind: video ? "video" : "audio", dir: "out", group: false });
            return;
          }
          if (++tries < 40) setTimeout(attempt, 500);
        };
        attempt();
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
    else if (session.phase === "ringing" && session.dir === "in") {
      // CallKit already rings (app in the background or call screen shown natively): no second ringtone.
      if (AppState.currentState === "active" && !(session.callId && isSystemRinging(session.callId))) {
        void playIncomingRing();
        // Android: the call screen rings now — stop the ringing notification that announced the call.
        if (Platform.OS === "android" && session.callId) void clearIncomingCall(session.callId);
      }
      else void stopCallTones();
    }
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
          // A call grown to 3-4 people goes on while others are still in the room.
          if ((st === "ended" || st === "cancelled" || st === "missed" || st === "rejected") && !(roomRef.current?.remoteParticipants.size ?? 0)) {
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
      showSystemIncoming(session.callId, session.kind === "video", session.peerUsername ? `@${session.peerUsername}` : session.displayName);
    }
    if ((session?.phase === "connecting" || session?.phase === "connected") && session.dir === "in" && session.callId) {
      dismissSystemRinging(session.callId);
    }
    if (session?.phase === "connected" && session.callId) {
      markSystemCallConnected(session.callId);
      if (session.kind === "video") prepareAwayCamera();
      // Answered (in the app or on the iPhone screen): no « Appel manqué » notice for this call.
      if (session.dir === "in") void import("../lib/calls/callkeep").then(({ clearMissedNotice }) => clearMissedNotice(session.callId));
    }
    if (session?.callId) lastCallId.current = session.callId;
    // Any end (hang-up here, the other side, refused, busy, failed, or the session cleared) closes the iOS/Android call too.
    if (!session || terminalPhases(session.phase)) {
      const id = session?.callId ?? lastCallId.current;
      if (id) endSystemCall(id);
      if (!session) lastCallId.current = null;
    }
  }, [session?.phase, session?.callId, session?.dir, session?.kind, session]);

  // Android: « Appel WIPP en cours » stays in the notifications for the whole call, with « Raccrocher ».
  // It also keeps the call connected when WIPP is no longer on screen.
  const inCall = session?.phase === "connecting" || session?.phase === "connected" || session?.phase === "reconnecting";
  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!inCall || !session) {
      void hideOngoing();
      return;
    }
    void showOngoing({
      title: session.kind === "video" ? tr("Appel vidéo WIPP en cours") : tr("Appel WIPP en cours"),
      body: session.displayName,
      stopLabel: tr("Raccrocher"),
      onStop: () => void endCurrentCall(),
      phoneCall: true,
      camera: session.kind === "video",
      since: session.startedAt,
    });
  }, [inCall, session?.kind, session?.displayName, session?.startedAt]);
  useEffect(() => () => void hideOngoing(), []);

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
    // Mosaic (group calls): rebuild the list of people on every room change.
    const refreshTiles = () => {
      if (cancelled) return;
      const people = [room.localParticipant, ...room.remoteParticipants.values()];
      setTiles(
        people.map((p) => {
          const cam = p.getTrackPublication(Track.Source.Camera);
          const mic = p.getTrackPublication(Track.Source.Microphone);
          return {
            key: p.identity || p.sid,
            local: p === room.localParticipant,
            identity: p.identity,
            url: cam?.track && !cam.isMuted ? streamURL(cam.track) : null,
            micOn: Boolean(mic && !mic.isMuted),
            speaking: p.isSpeaking,
            level: p.audioLevel,
            ...roomPerson(p),
          };
        }),
      );
    };
    for (const ev of [
      RoomEvent.Connected,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ActiveSpeakersChanged,
      RoomEvent.ParticipantNameChanged,
      RoomEvent.ParticipantMetadataChanged,
    ]) {
      room.on(ev, refreshTiles);
    }
    room.on(RoomEvent.Reconnecting, () => patch({ phase: "reconnecting" }));
    room.on(RoomEvent.Reconnected, () => patch({ phase: "connected" }));
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) patch({ phase: "ended", url: undefined, token: undefined });
    });
    // Calls with 3+ people: raised hands, applause and the organizer's tools travel as data messages.
    void import("../lib/calls/room-controls").then((rc) => {
      if (cancelled) return;
      rc.resetCallControls();
      void import("../lib/calls/reactions").then((rx) => {
        rx.resetReactions();
        void rx.loadReactionSettings();
      });
      /** Phones that send the new reactions (their old-style applause is a copy, ignored). */
      const reactors = new Set<string>();
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      const isHost = session.dir === "out";
      const nameOf = (identity: string) => {
        for (const u of Object.values(useWippStore.getState().users)) if (u?.id && identityKey(u.id) === identity) return u.displayName || `@${u.username}`;
        return [...room.remoteParticipants.values()].find((p) => p.identity === identity)?.name || tr("Quelqu’un");
      };
      const send = (msg: import("../lib/calls/room-controls").CallMsg) => {
        if (room.state !== "connected") return;
        void room.localParticipant.publishData(enc.encode(JSON.stringify(msg)), { reliable: true, topic: rc.CALL_TOPIC }).catch(() => undefined);
        // My own hand / applause also show on my screen.
        const me = room.localParticipant.identity;
        if (msg.t === "hand") rc.setHand(me, msg.up);
        if (msg.t === "clap") rc.addClap(me);
        if (msg.t === "react") void import("../lib/calls/reactions").then((rx) => rx.isReactionId(msg.r) && rx.receiveReaction(me, msg.r, msg.n));
        if (msg.t === "moment") void import("../lib/calls/reactions").then((rx) => rx.receiveMoment(me, msg.n));
        if (msg.t === "mod") rc.useCallControls.setState((st) => ({ mods: msg.on ? [...st.mods.filter((x) => x !== msg.to), msg.to] : st.mods.filter((x) => x !== msg.to) }));
      };
      rc.useCallControls.setState({ send });
      const announce = () => {
        if (!isHost) return;
        rc.useCallControls.setState({ host: room.localParticipant.identity });
        send({ t: "host" });
        // People who join later also learn who the moderators are.
        const mods = rc.useCallControls.getState().mods;
        if (mods.length) send({ t: "mods", ids: mods });
      };
      room.on(RoomEvent.Connected, announce);
      room.on(RoomEvent.ParticipantConnected, announce);
      room.on(RoomEvent.ParticipantDisconnected, (p) => rc.setHand(p.identity, false));
      room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
        if (topic !== rc.CALL_TOPIC || !participant) return;
        let msg: import("../lib/calls/room-controls").CallMsg;
        try {
          msg = JSON.parse(dec.decode(payload));
        } catch {
          return;
        }
        const from = participant.identity;
        const me = room.localParticipant.identity;
        const st = rc.useCallControls.getState();
        if (msg.t === "host") {
          // The first organizer announced wins (the one who started the call).
          if (!st.host) rc.useCallControls.setState({ host: from });
          return;
        }
        if (msg.t === "mod" || msg.t === "mods") {
          // Only the organizer names moderators.
          if (st.host !== from) return;
          if (msg.t === "mods") {
            rc.useCallControls.setState({ mods: msg.ids.filter((x) => typeof x === "string").slice(0, 50) });
            return;
          }
          rc.useCallControls.setState({ mods: msg.on ? [...st.mods.filter((x) => x !== msg.to), msg.to] : st.mods.filter((x) => x !== msg.to) });
          if (msg.to === me) rc.callNotice(msg.on ? tr("{0} t’a nommé modérateur", nameOf(from)) : tr("Tu n’es plus modérateur"));
          return;
        }
        if (msg.t === "hand") {
          rc.setHand(from, msg.up);
          if (msg.up && (st.host === me || st.mods.includes(me))) rc.callNotice(tr("{0} lève la main", nameOf(from)));
          return;
        }
        if (msg.t === "react") {
          reactors.add(from);
          void import("../lib/calls/reactions").then((rx) => rx.isReactionId(msg.r) && rx.receiveReaction(from, msg.r, String(msg.n ?? ""), Number(msg.at) || undefined));
          return;
        }
        if (msg.t === "moment") {
          void import("../lib/calls/reactions").then((rx) => rx.receiveMoment(from, String(msg.n ?? "")));
          return;
        }
        if (msg.t === "clap") {
          rc.addClap(from);
          // Applause from an older WIPP version: shown as the new « Bravo ».
          if (!reactors.has(from)) void import("../lib/calls/reactions").then((rx) => rx.receiveReaction(from, "bravo", `clap${Date.now()}`));
          return;
        }
        // Organizer tools: only from the organizer or a moderator, only for me.
        if ((st.host !== from && !st.mods.includes(from)) || msg.to !== me) return;
        // A moderator never acts on the organizer.
        if (st.host !== from && me === st.host) return;
        if (msg.t === "mute") {
          patch({ muted: true });
          rc.callNotice(tr("{0} a coupé ton micro", nameOf(from)));
        } else if (msg.t === "cam-ask") {
          rc.useCallControls.setState({ camAsk: true });
        } else if (msg.t === "mic-ask") {
          rc.useCallControls.setState({ micAsk: true });
        } else if (msg.t === "floor") {
          rc.setHand(me, false);
          send({ t: "hand", up: false });
          // I raised my hand to speak: my microphone turns on.
          patch({ muted: false });
          rc.callNotice(tr("{0} te donne la parole. Ton micro est activé.", nameOf(from)));
        }
      });
      if (room.state === "connected") announce();
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
        patch({ phase: "failed", note: tr("Micro refusé.") });
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
      if (!cancelled) patch({ phase: "failed", note: tr("Connexion média impossible.") });
    });
    return () => {
      cancelled = true;
      setRemoteUrl(null);
      setLocalUrl(null);
      setRemoteMuted(false);
      setSwapped(false);
      void room.disconnect();
      void import("../lib/calls/room-controls").then((rc) => rc.resetCallControls());
      void import("@livekit/react-native").then((m) => m.AudioSession.stopAudioSession()).catch(() => undefined);
    };
  }, [session?.url, session?.token]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || session?.phase !== "connected") return;
    void room.localParticipant.setMicrophoneEnabled(!session.muted);
  }, [session?.muted, session?.phase]);

  // Outgoing video call: my camera starts while it rings (I see myself before the other person answers).
  // The same capture is published once the call connects, so the camera never has to restart.
  const previewTrack = useRef<LocalVideoTrack | null>(null);
  const ringingVideo = session?.dir !== "in" && session?.phase === "outgoing" && session.kind === "video" && !session.group && !session.camOff;
  useEffect(() => {
    if (!ringingVideo || previewTrack.current) return;
    let stale = false;
    void (async () => {
      const cam = await Camera.requestCameraPermissionsAsync();
      if (!cam.granted || stale) return;
      const track = await createLocalVideoTrack({ facingMode: useCallSession.getState().session?.facing === "environment" ? "environment" : "user" });
      const live = useCallSession.getState().session;
      // The call ended or was answered meanwhile: this capture is no longer wanted here.
      if (stale || !live || live.phase !== "outgoing") {
        if (!live || terminalPhases(live.phase)) track.stop();
        else previewTrack.current = track;
        return;
      }
      previewTrack.current = track;
      setLocalUrl(streamURL(track));
    })().catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [ringingVideo]);
  // Call over before anyone answered (refused, no answer, hung up): release the camera.
  useEffect(() => {
    if (session && !terminalPhases(session.phase)) return;
    const track = previewTrack.current;
    if (!track) return;
    previewTrack.current = null;
    track.stop();
    setLocalUrl(null);
  }, [session, session?.phase]);

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
          patch({ camOff: true, note: tr("Caméra refusée. L’audio continue.") });
          return;
        }
      }
      // The capture started while it was ringing becomes the published camera.
      const ringing = previewTrack.current;
      previewTrack.current = null;
      if (ringing && !want) ringing.stop();
      const pub =
        ringing && want
          ? await room.localParticipant.publishTrack(ringing, { source: Track.Source.Camera })
          : await room.localParticipant.setCameraEnabled(want, {
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
      if (st === "active") void clearAwayCameraNotice();
      if (st === "active" && prev === "background") revive();
      if (st === "background") {
        // iOS stops the camera in the background: pause it on purpose, so the other phone shows
        // "camera paused" instead of a frozen picture. It turns back on when WIPP comes back (revive).
        const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
        if (track && !track.isMuted) void track.mute().catch(() => undefined);
        // Video call: a notification lets me show my camera anyway (« Me montrer »), without coming back.
        const live = useCallSession.getState().session;
        awayLog(`background: track=${Boolean(track)} phase=${live?.phase} kind=${live?.kind} camOff=${live?.camOff}`);
        if (track && live?.phase === "connected" && live.kind === "video" && !live.camOff) void showAwayCameraNotice(false);
      }
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
      // iPhone outputs are named "default" (earpiece) and "force_speaker" (loudspeaker);
      // looking for "earpiece" never matched, so switching back did nothing.
      if (Platform.OS === "ios") {
        await AudioSession.selectAudioOutput(session.speaker ? "force_speaker" : "default");
        return;
      }
      const outputs = await AudioSession.getAudioOutputs();
      const want = session.speaker ? "speaker" : "earpiece";
      const match = outputs.find((item) => item.toLowerCase().includes(want));
      if (match) await AudioSession.selectAudioOutput(match);
    }).catch(() => undefined);
  }, [session?.speaker, session?.phase]);

  // Android: connected video call → leaving the app opens the system mini player (like iOS PiP).
  const androidPipEvent = useAndroidPip();
  const pipSize = useAndroidPipSize();
  const pipWanted = Platform.OS === "android" && session?.phase === "connected" && session.kind === "video";
  // The window itself becomes tiny in the mini player: switch the layout at once, even if Android's
  // « mini player » signal arrives late (otherwise the whole call screen shows, shrunk, for a moment).
  const androidPip = androidPipEvent || (pipWanted && win.width < 250);
  // Camera in the mini player: paused when leaving the app (the others see « Je reviens… »);
  // the mini player's button « Me montrer » / « Pause caméra » switches it.
  const [pipCamShown, setPipCamShown] = useState(false);
  const pipCamAvailable = pipWanted && !session?.camOff;
  useEffect(() => {
    setAndroidCallPip(pipWanted);
  }, [pipWanted]);
  useEffect(() => () => setAndroidCallPip(false), []);
  useEffect(() => {
    setAndroidPipCamera(pipCamAvailable, androidPip && pipCamShown);
  }, [pipCamAvailable, androidPip, pipCamShown]);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (androidPip) {
      setPipCamShown(false);
      return;
    }
    // Mini player closed while WIPP stays in the background (call still on): camera paused again.
    if (AppState.currentState !== "active") {
      const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
      if (track && !track.isMuted) void track.mute().catch(() => undefined);
      void clearAwayCameraNotice();
    }
    setPipCamShown(false);
  }, [androidPip]);
  // Away from WIPP during a video call: « Me montrer » / « Pause caméra » from the notification
  // (iPhone and Android) or from the Android mini player button.
  useEffect(() => {
    const setAway = (show: boolean) => {
      const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
      const live = useCallSession.getState().session;
      if (!track || !live || live.camOff || live.phase !== "connected" || live.kind !== "video") return;
      if (AppState.currentState === "active") return; // back in WIPP: the normal camera button applies
      setPipCamShown(show);
      void showAwayCameraNotice(show);
      if (show) {
        void track
          .unmute()
          .then(() => setLocalUrl(streamURL(track)))
          .catch(() => {
            // The phone refused the camera outside the app: say it is still paused.
            setPipCamShown(false);
            void showAwayCameraNotice(false);
          });
      } else {
        void track.mute().catch(() => undefined);
      }
    };
    const offPip = onAndroidPipCameraButton(() => {
      const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
      setAway(Boolean(track?.isMuted));
    });
    const offNotice = onAwayCameraAction((action) => {
      if (action === "keep") void clearAwayCameraNotice();
      else setAway(action === "show");
    });
    return () => {
      offPip();
      offNotice();
    };
  }, []);
  // Call over: no camera question left behind.
  const callLive = Boolean(session && session.phase === "connected");
  useEffect(() => {
    if (!callLive) void clearAwayCameraNotice();
  }, [callLive]);

  if (!session) return null;
  const title = user?.displayName || session.displayName;
  const terminal = ["ended", "declined", "missed", "busy", "failed"].includes(session.phase);

  // Inside the Android mini player: only the other person's video (no buttons).
  if (androidPip && !terminal) {
    const showRemote = Boolean(remoteUrl && !remoteMuted);
    return (
      <View style={[pipSize ? { position: "absolute", top: 0, left: 0, width: pipSize.width, height: pipSize.height } : { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, { zIndex: 1000, elevation: 1000, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", overflow: "hidden" }]}>
        {showRemote && remoteUrl ? (
          <RTCView streamURL={remoteUrl} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} objectFit="cover" zOrder={0} />
        ) : (
          <View style={{ padding: 8, alignItems: "center" }}>
            <Text numberOfLines={1} style={{ color: colors.paper, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{title}</Text>
            <Text style={{ color: "rgba(247,249,252,0.7)", fontSize: 11 }}>{formatDuration(sec)}</Text>
          </View>
        )}
        {/* « Me montrer » pressed: a small view of my own camera, so I know the others see me. */}
        {pipCamShown && localUrl ? (
          <View style={{ position: "absolute", right: 6, bottom: 6, width: "34%", aspectRatio: 9 / 16, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)" }}>
            <RTCView streamURL={localUrl} style={{ flex: 1 }} objectFit="cover" mirror={session.facing !== "environment"} zOrder={1} />
          </View>
        ) : null}
      </View>
    );
  }

  if (session.pip && !terminal) {
    const showRemote = Boolean(remoteUrl && !remoteMuted);
    const w = showRemote ? 132 : 220;
    const h = showRemote ? 176 : 64;
    // Keep the mini player on screen: start top-right, clamp to the window while dragging.
    const x = pipPos.x.interpolate({ inputRange: [-(win.width - w - 24), 0], outputRange: [-(win.width - w - 24), 0], extrapolate: "clamp" });
    const y = pipPos.y.interpolate({ inputRange: [0, win.height - h - 120], outputRange: [0, win.height - h - 120], extrapolate: "clamp" });
    return (
      <Animated.View
        {...pipDrag.panHandlers}
        style={{ position: "absolute", top: 56, right: 12, zIndex: 100, elevation: 100, width: w, borderRadius: 16, overflow: "hidden", backgroundColor: colors.navy, transform: [{ translateX: x }, { translateY: y }] }}
      >
        <Press onPress={() => patch({ pip: false })}>
          {showRemote && remoteUrl ? (
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
  // Names and photos of the people in a group call (from the contacts list, else a neutral tile).
  const byIdentity = new Map<string, { displayName: string; avatar?: string }>();
  for (const u of Object.values(users)) if (u?.id) byIdentity.set(identityKey(u.id), { displayName: u.displayName || `@${u.username}`, avatar: u.avatar });
  // Mosaic for group calls, and for a one-to-one call once a third person has joined.
  const groupTiles = session.group || tiles.length > 2
    ? tiles.map((tile) => {
        // Contacts keep the name I know them by; anyone else shows their WIPP name and photo.
        const known = byIdentity.get(tile.identity);
        const who = tile.local ? { displayName: tr("Toi"), avatar: me.avatar } : known ? { displayName: known.displayName, avatar: known.avatar ?? tile.avatar } : { displayName: tile.name ?? tr("Membre"), avatar: tile.avatar };
        return { key: tile.key, identity: tile.identity, local: tile.local, name: who.displayName, avatar: who.avatar, url: tile.url, micOn: tile.local ? !session.muted : tile.micOn, speaking: tile.speaking, level: tile.level };
      })
    : undefined;
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
      groupTiles={groupTiles}
      people={tiles.map((x) => ({ identity: x.identity, local: x.local, speaking: x.speaking, level: x.level }))}
      onMinimize={minimize}
      RTCView={RTCView as never}
      onHangup={() => {
        if (!terminal) void endCurrentCall();
        leaveCall();
      }}
    />
  );
}
