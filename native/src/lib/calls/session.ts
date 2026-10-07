import { useWippStore } from "../store";
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
import { errorText } from "../error-fr";

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
  /** Real profile of the other person (from the call invite or the local contact). */
  peerUsername?: string;
  peerAvatar?: string;
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

function watchInvite(id: string) {
  const started = Date.now();
  const timer = setInterval(() => {
    void (async () => {
      const live = useCallSession.getState().session;
      if (!live || live.callId !== id || (live.phase !== "outgoing" && live.phase !== "ringing")) {
        clearInterval(timer);
        return;
      }
      if (Date.now() - started > 60_000 && live.phase === "outgoing") {
        clearInterval(timer);
        useCallSession.getState().patch({ phase: "missed", note: "Pas de réponse." });
        return;
      }
      try {
        const status = await callStatus(id);
        const st = status.invite.status;
        const current = useCallSession.getState().session;
        if (!current || current.callId !== id) return;
        if (st === "accepted") {
          if (current.dir === "out") {
            clearInterval(timer);
            await attachToken(id, current.kind === "video");
          }
          return;
        } else if (st === "rejected") {
          clearInterval(timer);
          useCallSession.getState().patch({ phase: "declined", note: "Appel refusé." });
        } else if (st === "missed") {
          clearInterval(timer);
          useCallSession.getState().patch({ phase: "missed", note: "Pas de réponse." });
        } else if (st === "cancelled") {
          clearInterval(timer);
          useCallSession.getState().patch({ phase: "ended", note: "Appel annulé." });
        } else if (st === "ended") {
          clearInterval(timer);
          useCallSession.getState().patch({ phase: "ended" });
        } else if (st === "busy") {
          clearInterval(timer);
          useCallSession.getState().patch({ phase: "busy", note: "Correspondant occupé." });
        }
      } catch {
        /* keep polling until the invite expires */
      }
    })();
  }, 1500);
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
      // Woken by a VoIP push with WIPP closed, the session may not be ready yet: retry a few times
      // instead of failing (a failure would close the iOS call screen while it rings).
      // Keep trying for the whole ringing time (~55 s): 12 s was too short in the background and closed
      // the ringing iPhone screen while the caller was still waiting.
      let status: Awaited<ReturnType<typeof callStatus>> | null = null;
      const giveUpAt = Date.now() + 55_000;
      while (!status) {
        try {
          status = await callStatus(input.callId);
        } catch {
          if (Date.now() > giveUpAt) {
            useCallSession.getState().patch({ phase: "missed", note: "Appel expiré." });
            return;
          }
          await new Promise((r) => setTimeout(r, 2000));
          if (useCallSession.getState().session?.callId !== input.callId) return;
        }
      }
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
        displayName: (invite.group && groupName(invite.chatId)) || invite.caller.displayName || "WIPP",
        userId: `srvuser:${invite.caller.id}`,
        peerUsername: invite.caller.username || undefined,
        peerAvatar: invite.caller.avatarUrl || undefined,
        kind: invite.kind,
        group: Boolean(invite.group),
        chatId: invite.chatId,
        phase: invite.status === "accepted" ? "connecting" : "ringing",
      });
      if (invite.status === "accepted") await attachToken(input.callId, invite.kind === "video");
      else watchInvite(input.callId);
      return;
    }
    if (input.group && input.chatId) {
      const created = await startGroupCall(input.chatId, input.kind);
      useCallSession.getState().patch({ callId: created.invite.id, phase: "connecting", displayName: groupName(input.chatId) || "Groupe" });
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
    watchInvite(id);
  } catch (err) {
    useCallSession.getState().patch({
      phase: "failed",
      note: errorText(err, "Appel impossible."),
    });
  }
}

/** Name of a group chat from the local list ("srv:g_…" or "g_…"). */
function groupName(chatId?: string | null) {
  if (!chatId) return undefined;
  const id = chatId.startsWith("srv:") ? chatId : `srv:${chatId}`;
  return useWippStore.getState().chats.find((c) => c.id === id)?.name;
}

/** Join a group call already in progress (from the banner in the group conversation). */
export async function joinGroupCall(input: { callId: string; chatId: string; kind: "audio" | "video" }) {
  const current = useCallSession.getState().session;
  if (current?.callId === input.callId) {
    useCallSession.getState().patch({ pip: false });
    return;
  }
  useCallSession.setState({
    session: { ...seed({ userId: "call", kind: input.kind, dir: "in", callId: input.callId, chatId: input.chatId, group: true, displayName: groupName(input.chatId) || "Groupe" }), phase: "connecting" },
  });
  try {
    await setGroupState(input.callId, "joining");
    await attachToken(input.callId, input.kind === "video");
  } catch (err) {
    const status = (err as { status?: number }).status;
    useCallSession.getState().patch({ phase: status === 410 ? "ended" : "failed", note: status === 410 ? "Cet appel est terminé." : errorText(err, "Impossible de rejoindre l’appel.") });
  }
}

/** Join a call through a WIPP call link (wippapp.com/c/<code>). */
export async function joinCallByLink(token: string, title: string) {
  const { joinCallLink } = await import("./livekit-client");
  const joined = await joinCallLink(token);
  useCallSession.setState({
    session: { ...seed({ userId: "call", kind: joined.kind, dir: "in", callId: joined.callId, chatId: `link_${joined.linkId}`, group: true, displayName: title }), phase: "connecting" },
  });
  try {
    await attachToken(joined.callId, joined.kind === "video");
  } catch (err) {
    useCallSession.getState().patch({ phase: "failed", note: errorText(err, "Impossible de rejoindre l’appel.") });
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
    watchInvite(top.id);
  } catch {
    /* unsigned or offline */
  }
}

export async function upgradeToVideo() {
  const live = useCallSession.getState().session;
  if (!live?.callId || live.phase !== "connected") return;
  // Same room, same token (it may publish any source): the overlay just turns the camera on.
  useCallSession.getState().patch({ kind: "video", camOff: false, speaker: true });
}
