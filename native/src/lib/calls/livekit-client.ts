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

export async function inviteCall(peerId: string, kind: "audio" | "video") {
  return wippApi<{ invite: { id: string; roomName: string; status: string } }>("calls/invite", {
    method: "POST",
    body: JSON.stringify({ peerId, kind }),
  });
}
