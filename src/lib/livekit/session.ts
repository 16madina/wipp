import {
  Room,
  RoomEvent,
  Track,
  type LocalTrack,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  createLocalTracks,
} from "livekit-client";

export type LiveKitSessionStatus = "idle" | "connecting" | "connected" | "error" | "local";

export type LiveKitSession = {
  room: Room | null;
  status: LiveKitSessionStatus;
  error?: string;
  connect: (opts: {
    url: string;
    token: string;
    video: boolean;
    audio?: boolean;
  }) => Promise<void>;
  setMuted: (muted: boolean) => void;
  setCameraEnabled: (on: boolean) => void;
  attachLocalVideo: (el: HTMLVideoElement | null) => void;
  attachRemoteVideo: (el: HTMLVideoElement | null) => void;
  disconnect: () => Promise<void>;
};

/** Browser LiveKit room session for 1:1 calls. */
export function createLiveKitSession(
  onChange?: (status: LiveKitSessionStatus, error?: string) => void,
): LiveKitSession {
  let room: Room | null = null;
  let status: LiveKitSessionStatus = "idle";
  let error: string | undefined;
  let localVideoEl: HTMLVideoElement | null = null;
  let remoteVideoEl: HTMLVideoElement | null = null;
  let localTracks: LocalTrack[] = [];

  function setStatus(next: LiveKitSessionStatus, err?: string) {
    status = next;
    error = err;
    onChange?.(next, err);
  }

  function bindRemote(track: RemoteTrack) {
    if (track.kind !== Track.Kind.Video || !remoteVideoEl) return;
    track.attach(remoteVideoEl);
  }

  function onTrackSubscribed(
    track: RemoteTrack,
    _pub: RemoteTrackPublication,
    _participant: RemoteParticipant,
  ) {
    bindRemote(track);
  }

  async function connect(opts: {
    url: string;
    token: string;
    video: boolean;
    audio?: boolean;
  }) {
    await disconnect();
    setStatus("connecting");
    const next = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    room = next;
    next.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    next.on(RoomEvent.Disconnected, () => {
      if (room === next) setStatus("idle");
    });

    try {
      localTracks = await createLocalTracks({
        audio: opts.audio !== false,
        video: opts.video,
      });
      await next.connect(opts.url, opts.token);
      for (const track of localTracks) {
        await next.localParticipant.publishTrack(track);
        if (track.kind === Track.Kind.Video && localVideoEl) {
          track.attach(localVideoEl);
        }
      }
      // Attach any already-subscribed remote video
      for (const p of next.remoteParticipants.values()) {
        for (const pub of p.trackPublications.values()) {
          if (pub.track) bindRemote(pub.track);
        }
      }
      setStatus("connected");
    } catch (e) {
      const message = e instanceof Error ? e.message : "livekit_connect_failed";
      setStatus("error", message);
      await disconnect();
      throw e;
    }
  }

  function setMuted(muted: boolean) {
    void room?.localParticipant.setMicrophoneEnabled(!muted);
  }

  function setCameraEnabled(on: boolean) {
    void room?.localParticipant.setCameraEnabled(on);
  }

  function attachLocalVideo(el: HTMLVideoElement | null) {
    localVideoEl = el;
    if (!el || !room) return;
    for (const pub of room.localParticipant.trackPublications.values()) {
      if (pub.track?.kind === Track.Kind.Video) pub.track.attach(el);
    }
  }

  function attachRemoteVideo(el: HTMLVideoElement | null) {
    remoteVideoEl = el;
    if (!el || !room) return;
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.track?.kind === Track.Kind.Video) pub.track.attach(el);
      }
    }
  }

  async function disconnect() {
    for (const track of localTracks) {
      try {
        track.stop();
        track.detach();
      } catch {
        /* ignore */
      }
    }
    localTracks = [];
    if (room) {
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      try {
        await room.disconnect();
      } catch {
        /* ignore */
      }
      room = null;
    }
    if (status !== "error") setStatus("idle");
  }

  return {
    get room() {
      return room;
    },
    get status() {
      return status;
    },
    get error() {
      return error;
    },
    connect,
    setMuted,
    setCameraEnabled,
    attachLocalVideo,
    attachRemoteVideo,
    disconnect,
  };
}

export async function fetchCallToken(input: {
  peerId: string;
  kind: "audio" | "video";
  identity: string;
  displayName?: string;
  roomName?: string;
}): Promise<
  | { mode: "livekit"; url: string; token: string; roomName: string }
  | { mode: "local"; reason?: string }
> {
  const roomName =
    input.roomName ||
    `wipp-${[input.identity, input.peerId].sort().join("-")}`.slice(0, 64);
  try {
    const res = await fetch("/api/wipp/calls/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        roomName,
        identity: input.identity,
        displayName: input.displayName,
        video: input.kind === "video",
        peerId: input.peerId,
      }),
    });
    if (!res.ok) {
      return { mode: "local", reason: `http_${res.status}` };
    }
    const data = (await res.json()) as {
      mode?: string;
      url?: string;
      token?: string;
      roomName?: string;
      reason?: string;
    };
    if (data.mode === "livekit" && data.url && data.token) {
      return {
        mode: "livekit",
        url: data.url,
        token: data.token,
        roomName: data.roomName || roomName,
      };
    }
    return { mode: "local", reason: data.reason };
  } catch {
    return { mode: "local", reason: "network" };
  }
}
