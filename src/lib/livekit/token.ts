import { AccessToken } from "livekit-server-sdk";
import { liveKitEnv } from "./config";

export type LiveKitTokenResult =
  | {
      mode: "livekit";
      url: string;
      token: string;
      roomName: string;
      identity: string;
    }
  | {
      mode: "local";
      configured: false;
      reason: "missing_credentials";
    };

/** Mint a short-lived room token, or signal local-media fallback. */
export async function mintCallToken(input: {
  roomName: string;
  identity: string;
  displayName?: string;
  video?: boolean;
}): Promise<LiveKitTokenResult> {
  const env = liveKitEnv();
  if (!env.configured || !env.url || !env.apiKey || !env.apiSecret) {
    return { mode: "local", configured: false, reason: "missing_credentials" };
  }

  const roomName = sanitizeRoom(input.roomName);
  const identity = sanitizeIdentity(input.identity);
  const at = new AccessToken(env.apiKey, env.apiSecret, {
    identity,
    name: input.displayName?.trim() || identity,
    ttl: "2h",
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return {
    mode: "livekit",
    url: env.url,
    token,
    roomName,
    identity,
  };
}

function sanitizeRoom(raw: string) {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned || `wipp-${Date.now().toString(36)}`;
}

function sanitizeIdentity(raw: string) {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned || `guest-${Date.now().toString(36)}`;
}
