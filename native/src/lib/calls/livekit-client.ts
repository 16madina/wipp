import { wippApi } from "../proximity/wipp-session";

export type CallToken =
  | { mode: "livekit"; url: string; token: string; roomName: string; identity: string }
  | { mode: "local"; configured: false; reason: "missing_credentials" };

/**
 * Asks the WIPP server for a LiveKit token bound to an existing call.
 * The client does not choose the room or the LiveKit identity.
 * LIVEKIT_API_SECRET stays on the server. CALL E2EE stays pending.
 */
export async function fetchCallToken(callId: string, video: boolean) {
  return wippApi<CallToken>("calls/token", {
    method: "POST",
    body: JSON.stringify({ callId, video }),
  });
}

export function serverProfileId(id: string) {
  if (id.startsWith("srvuser:")) return id.slice("srvuser:".length);
  if (id.startsWith("srv:")) return id.slice(4);
  return id;
}

export async function inviteCall(peerId: string, kind: "audio" | "video") {
  return wippApi<{ invite: { id: string; roomName: string; status: string } }>("calls/invite", {
    method: "POST",
    body: JSON.stringify({ peerId: serverProfileId(peerId), kind }),
  });
}

export async function answerCall(callId: string, accept: boolean) {
  return wippApi<{ invite: { id: string; status: string; kind: "audio" | "video" } }>(`calls/${callId}/answer`, {
    method: "POST",
    body: JSON.stringify({ accept }),
  });
}

export async function hangupCall(callId: string) {
  return wippApi<{ invite: { status: string } }>(`calls/${callId}/hangup`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type CallStatusInvite = {
  id: string;
  status: string;
  kind: "audio" | "video";
  caller: { id: string; displayName: string; username: string; avatarUrl?: string | null };
  callee: { id: string; displayName: string; username: string; avatarUrl?: string | null };
  group?: boolean;
  chatId?: string;
};

export async function callStatus(callId: string) {
  return wippApi<{ invite: CallStatusInvite }>(`calls/${callId}/status`);
}

export async function startGroupCall(chatId: string, kind: "audio" | "video") {
  return wippApi<{ invite: { id: string; status: string; kind: "audio" | "video"; chatId: string; group: true } }>("calls/group", {
    method: "POST",
    body: JSON.stringify({ chatId: serverProfileId(chatId), kind }),
  });
}

export async function setGroupState(callId: string, state: string) {
  return wippApi<{ ok: boolean; state: string }>(`calls/group/${callId}/state`, {
    method: "POST",
    body: JSON.stringify({ state }),
  });
}

export async function incomingCalls() {
  return wippApi<{
    invites: { id: string; kind: "audio" | "video"; caller: { id: string; displayName: string; username: string } }[];
  }>("calls/incoming");
}
