import { create } from "zustand";
import {
  answerCall,
  callStatus,
  fetchCallToken,
  hangupCall,
  incomingCalls,
  inviteCall,
  setGroupState,
  startGroupCall,
} from "./livekit-client";

export type CallPhase =
  | "outgoing"
  | "ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended"
  | "declined"
  | "missed"
  | "busy"
  | "failed";

export type CallSession = {
  userId: string;
  displayName: string;
  kind: "audio" | "video";
  dir: "in" | "out";
  callId?: string;
  chatId?: string;
  group?: boolean;
  phase: CallPhase;
  pip: boolean;
  muted: boolean;
  camOff: boolean;
  speaker: boolean;
  facing: "user" | "environment";
  startedAt: number;
  note?: string;
  url?: string;
  token?: string;
};

type Store = {
  session: CallSession | null;
  patch: (partial: Partial<CallSession>) => void;
  clear: () => void;
};

export const useCallSession = create<Store>((set) => ({
  session: null,
  patch: (partial) => set((s) => (s.session ? { session: { ...s.session, ...partial } } : s)),
  clear: () => set({ session: null }),
}));

function seed(input: {
  userId: string;
  kind: "audio" | "video";
  dir?: "in" | "out";
  callId?: string;
  chatId?: string;
  group?: boolean;
  displayName?: string;
}): CallSession {
  return {
    userId: input.userId,
    displayName: input.displayName || "WIPP",
    kind: input.kind,
    dir: input.dir ?? "out",
    callId: input.callId,
    chatId: input.chatId,
    group: input.group,
    phase: input.dir === "in" ? "ringing" : "outgoing",
    pip: false,
    muted: false,
    camOff: input.kind !== "video",
    speaker: input.kind === "video",
    facing: "user",
    startedAt: 0,
  };
}

async function attachToken(callId: string, video: boolean) {
  const token = await fetchCallToken(callId, video);
  if (token.mode !== "livekit") {
    useCallSession.getState().patch({
      phase: "failed",
      note: "Serveur d’appels indisponible. Le signal est prêt, le média attend la configuration LiveKit.",
    });
    return;
  }
  useCallSession.getState().patch({
    phase: "connecting",
    url: token.url,
    token: token.token,
    camOff: !video,
    kind: video ? "video" : useCallSession.getState().session?.kind ?? "audio",
  });
}

export async function openCall(input: {
  userId: string;
  kind: "audio" | "video";
  dir?: "in" | "out";
  callId?: string;
  chatId?: string;
  group?: boolean;
}) {
  const current = useCallSession.getState().session;
  if (current && current.callId && input.callId && current.callId === input.callId) {
    useCallSession.getState().patch({ pip: false });
    return;
  }
  useCallSession.setState({ session: seed(input) });
  try {
    if (input.dir === "in" && input.callId) {
      const status = await callStatus(input.callId);
      const invite = status.invite;
      if (invite.status === "missed" || invite.status === "ended" || invite.status === "cancelled") {
        useCallSession.getState().patch({ phase: "missed", note: "Appel expiré." });
        return;
      }
      if (invite.status === "rejected") {
        useCallSession.getState().patch({ phase: "declined" });
        return;
      }
      useCallSession.getState().patch({
        displayName: invite.caller.displayName || "WIPP",
        userId: `srvuser:${invite.caller.id}`,
        kind: invite.kind,
        group: Boolean(invite.group),
        chatId: invite.chatId,
        phase: invite.status === "accepted" ? "connecting" : "ringing",
      });
      if (invite.status === "accepted") await attachToken(input.callId, invite.kind === "video");
      return;
    }
    if (input.group && input.chatId) {
      const created = await startGroupCall(input.chatId, input.kind);
      useCallSession.getState().patch({ callId: created.invite.id, phase: "connecting", displayName: "Groupe" });
      await attachToken(created.invite.id, input.kind === "video");
      return;
    }
    const created = await inviteCall(input.userId, input.kind);
    const id = created.invite.id;
    if (created.invite.status === "busy") {
      useCallSession.getState().patch({ callId: id, phase: "busy", note: "Correspondant occupé." });
      return;
    }
    useCallSession.getState().patch({ callId: id, phase: "outgoing" });
    const started = Date.now();
    const timer = setInterval(() => {
      void (async () => {
        const live = useCallSession.getState().session;
        if (!live || live.callId !== id || (live.phase !== "outgoing" && live.phase !== "ringing")) {
          clearInterval(timer);
          return;
        }
        if (Date.now() - started > 60_000) {
          clearInterval(timer);
          useCallSession.getState().patch({ phase: "missed", note: "Pas de réponse." });
          return;
        }
        try {
          const status = await callStatus(id);
          const st = status.invite.status;
          if (st === "accepted") {
            clearInterval(timer);
            await attachToken(id, live.kind === "video");
          } else if (st === "rejected") {
            clearInterval(timer);
            useCallSession.getState().patch({ phase: "declined", note: "Appel refusé." });
          } else if (st === "missed" || st === "cancelled" || st === "ended") {
            clearInterval(timer);
            useCallSession.getState().patch({ phase: st === "missed" ? "missed" : "ended" });
          } else if (st === "busy") {
            clearInterval(timer);
            useCallSession.getState().patch({ phase: "busy", note: "Correspondant occupé." });
          }
        } catch {
          /* keep polling until the invite expires */
        }
      })();
    }, 1500);
  } catch (err) {
    useCallSession.getState().patch({
      phase: "failed",
      note: err instanceof Error ? err.message : "Appel impossible.",
    });
  }
}

export async function acceptCurrentCall() {
  const live = useCallSession.getState().session;
  if (!live?.callId) return;
  useCallSession.getState().patch({ phase: "connecting" });
  try {
    if (live.group) await setGroupState(live.callId, "joining");
    else await answerCall(live.callId, true);
    await attachToken(live.callId, live.kind === "video");
  } catch (err) {
    const status = (err as { status?: number }).status;
    useCallSession.getState().patch({
      phase: status === 410 ? "missed" : "failed",
      note: status === 410 ? "Appel expiré." : "Connexion impossible.",
    });
  }
}

export async function declineCurrentCall() {
  const live = useCallSession.getState().session;
  if (live?.callId) {
    try {
      if (live.group) await setGroupState(live.callId, "declined");
      else await answerCall(live.callId, false);
    } catch {
      /* already closed */
    }
  }
  useCallSession.getState().patch({ phase: "declined" });
}

export async function endCurrentCall() {
  const live = useCallSession.getState().session;
  if (live?.callId) {
    try {
      if (live.group) await setGroupState(live.callId, "left");
      else await hangupCall(live.callId);
    } catch {
      /* already closed */
    }
  }
  useCallSession.getState().patch({ phase: "ended", url: undefined, token: undefined });
}

export async function pollIncoming() {
  const live = useCallSession.getState().session;
  if (live && live.phase !== "ended" && live.phase !== "failed" && live.phase !== "declined") return;
  try {
    const data = await incomingCalls();
    const top = data.invites[0];
    if (!top) return;
    if (useCallSession.getState().session?.callId === top.id) return;
    useCallSession.setState({
      session: seed({
        userId: `srvuser:${top.caller.id}`,
        displayName: top.caller.displayName,
        kind: top.kind,
        dir: "in",
        callId: top.id,
      }),
    });
  } catch {
    /* unsigned or offline */
  }
}

export async function upgradeToVideo() {
  const live = useCallSession.getState().session;
  if (!live?.callId || live.phase !== "connected") return;
  useCallSession.getState().patch({ kind: "video", camOff: false });
  await attachToken(live.callId, true);
}
